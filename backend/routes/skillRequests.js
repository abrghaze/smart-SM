const express = require('express');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { skillRequestSchema } = require('../validation/schemas');
const { createNotification, logActivity, getTeamMembers, getUserManager, NOTIFICATION_TYPES } = require('../utils/notifications');
const emailNotificationService = require('../services/emailNotificationService');

// Function to update job title objectives progress when user skills change
const updateJobTitleObjectivesProgress = async (userId) => {
  try {
    console.log(`🔄 Updating job title objectives progress for user ${userId}`);
    
    // Get all active job title objectives for this user
    const objectivesQuery = `
      SELECT 
        jto.id,
        jto.job_title_id,
        jto.status,
        jt.title as job_title_name
      FROM job_title_objectives jto
      JOIN job_titles jt ON jto.job_title_id = jt.id
      WHERE jto.target_id = $1 
      AND jto.assignment_type = 'individual' 
      AND jto.status IN ('assigned', 'ready')
    `;
    
    const objectivesResult = await query(objectivesQuery, [userId]);
    
    for (const objective of objectivesResult.rows) {
      // Get job title requirements
      const requirementsQuery = `
        SELECT s.id, s.name, jtsr.required_level
        FROM job_title_skill_requirements jtsr
        JOIN skills s ON jtsr.skill_id = s.id
        WHERE jtsr.job_title_id = $1
      `;
      const requirementsResult = await query(requirementsQuery, [objective.job_title_id]);

      // Get user's current skill levels
      const userSkillsQuery = `
        SELECT s.id, s.name, us.level
        FROM user_skills us
        JOIN skills s ON us.skill_id = s.id
        WHERE us.user_id = $1
      `;
      const userSkillsResult = await query(userSkillsQuery, [userId]);

      const userSkillMap = {};
      userSkillsResult.rows.forEach(skill => {
        userSkillMap[skill.id] = skill.level;
      });

      let isQualified = true;
      let totalAchieved = 0;
      let totalRequired = 0;
      
      // Calculate qualification and progress
      if (requirementsResult.rows.length === 0) {
        isQualified = true;
        progressPercentage = 100;
      } else {
        requirementsResult.rows.forEach(requirement => {
          const currentLevel = userSkillMap[requirement.id] || 0;
          const requiredLevel = requirement.required_level;
          
          // Cap the current level at the required level (don't count excess)
          const effectiveLevel = Math.min(currentLevel, requiredLevel);
          
          totalAchieved += effectiveLevel;
          totalRequired += requiredLevel;
          
          // Check if this skill meets the requirement
          if (currentLevel < requiredLevel) {
            isQualified = false;
          }
        });
      }

      // Calculate progress percentage
      let progressPercentage = 0;
      let newStatus = objective.status;
      
      if (isQualified) {
        progressPercentage = 100;
        newStatus = 'ready';
      } else if (totalRequired > 0) {
        progressPercentage = Math.round((totalAchieved / totalRequired) * 100);
      }

      // Update the objective
      await query(`
        UPDATE job_title_objectives 
        SET status = $1, progress_percentage = $2, updated_at = NOW()
        WHERE id = $3
      `, [newStatus, progressPercentage, objective.id]);
      
      console.log(`✅ Updated objective ${objective.job_title_name}: ${objective.status} -> ${newStatus}, ${progressPercentage}%`);
      
      // If status changed to ready, create notification
      if (objective.status !== 'ready' && newStatus === 'ready') {
        await createNotification(
          userId,
          'job_title_ready',
          `Prêt pour ${objective.job_title_name}`,
          `Vous êtes maintenant qualifié pour le titre de poste "${objective.job_title_name}". Votre manager peut confirmer votre promotion.`,
          'job_title_objective',
          objective.id
        );
      }
    }
    
    console.log(`✅ Updated ${objectivesResult.rows.length} job title objectives for user ${userId}`);
    
  } catch (error) {
    console.error('❌ Error updating job title objectives progress:', error);
  }
};

// Cleanup old skill requests (runs every hour)
const cleanupOldRequests = async () => {
  try {
    // Delete requests that were approved/rejected more than 24 hours ago
    // AND the user has seen the result (marked as seen)
    const result = await query(`
      DELETE FROM skill_requests 
      WHERE status IN ('approved', 'rejected') 
      AND seen_by_user = true
      AND updated_at < NOW() - INTERVAL '24 hours'
    `);
    
    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} old skill requests`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up old skill requests:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupOldRequests, 60 * 60 * 1000);

// Run initial cleanup on startup
cleanupOldRequests();

const router = express.Router();

// Get my skill requests (employee-specific endpoint)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const { status, type, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only employees can access this endpoint
    if (userRole !== 'employee') {
      return res.status(403).json({ message: 'Access denied. Only employees can view their own requests.' });
    }

    let whereConditions = [`sr.requester_user_id = $1`];
    let queryParams = [userId];
    let paramCount = 1;

    // Status filter
    if (status) {
      paramCount++;
      whereConditions.push(`sr.status = $${paramCount}`);
      queryParams.push(status);
    }

    // Type filter
    if (type) {
      paramCount++;
      whereConditions.push(`sr.type = $${paramCount}`);
      queryParams.push(type);
    }

    // Only show non-dismissed requests (if column exists)
    // paramCount++;
    // whereConditions.push(`sr.is_dismissed = $${paramCount}`);
    // queryParams.push(false);

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get requests count
    const countQuery = `
      SELECT COUNT(*) 
      FROM skill_requests sr
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get requests with details
    paramCount++;
    const requestsQuery = `
      SELECT 
        sr.id, sr.type, sr.requested_skill_name, sr.current_level, sr.target_level,
        sr.reason, sr.status, sr.manager_comment, sr.admin_comment,
        sr.created_at, sr.updated_at, sr.seen_by_user, sr.certificate_file_id,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        u.first_name, u.last_name, u.email, u.role as requester_role,
        m.first_name as manager_first_name, m.last_name as manager_last_name,
        a.first_name as admin_first_name, a.last_name as admin_last_name,
        f.id as file_id, f.original_name, f.mime_type, f.size_bytes, f.storage_key
      FROM skill_requests sr
      LEFT JOIN skills s ON sr.skill_id = s.id
      LEFT JOIN users u ON sr.requester_user_id = u.id
      LEFT JOIN users m ON sr.manager_id = m.id
      LEFT JOIN users a ON sr.admin_id = a.id
      LEFT JOIN files f ON sr.certificate_file_id = f.id
      ${whereClause}
      ORDER BY sr.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(pageSize, offset);

    const requestsResult = await query(requestsQuery, queryParams);

    const requests = requestsResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      requestedSkillName: row.requested_skill_name,
      currentLevel: row.current_level,
      targetLevel: row.target_level,
      reason: row.reason,
      status: row.status,
      managerComment: row.manager_comment,
      adminComment: row.admin_comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      seenByUser: row.seen_by_user,
      certificateFileId: row.certificate_file_id,
      certificateFile: row.file_id ? {
        id: row.file_id,
        originalName: row.original_name,
        mimeType: row.mime_type,
        sizeBytes: parseInt(row.size_bytes),
        storageKey: row.storage_key
      } : null,
      skill: row.skill_name ? {
        name: row.skill_name,
        type: row.skill_type,
        category: row.skill_category
      } : null,
      requester: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.requester_role
      },
      manager: row.manager_first_name ? {
        id: row.id,
        firstName: row.manager_first_name,
        lastName: row.manager_last_name
      } : null,
      admin: row.admin_first_name ? {
        id: row.id,
        firstName: row.admin_first_name,
        lastName: row.admin_last_name
      } : null
    }));

    const totalPages = Math.ceil(totalCount / pageSize);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching my skill requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get skill requests (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type, page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    // Filter by user role
    if (userRole === 'employee') {
      paramCount++;
      whereConditions.push(`sr.requester_user_id = $${paramCount}`);
      queryParams.push(userId);
    } else if (userRole === 'manager') {
      paramCount++;
      whereConditions.push(`sr.manager_id = $${paramCount}`);
      queryParams.push(userId);
    }
    // Admin can see all requests

    // Status filter
    if (status) {
      paramCount++;
      whereConditions.push(`sr.status = $${paramCount}`);
      queryParams.push(status);
    }

    // Type filter
    if (type) {
      paramCount++;
      whereConditions.push(`sr.type = $${paramCount}`);
      queryParams.push(type);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get requests count
    const countQuery = `
      SELECT COUNT(*) 
      FROM skill_requests sr
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get requests with details
    paramCount++;
    const requestsQuery = `
      SELECT 
        sr.id, sr.type, sr.requested_skill_name, sr.current_level, sr.target_level, sr.granted_level,
        sr.reason, sr.status, sr.manager_comment, sr.admin_comment,
        sr.created_at, sr.updated_at, sr.seen_by_user, sr.certificate_file_id,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        u.first_name, u.last_name, u.email, u.role as requester_role,
        m.first_name as manager_first_name, m.last_name as manager_last_name,
        a.first_name as admin_first_name, a.last_name as admin_last_name
      FROM skill_requests sr
      LEFT JOIN skills s ON sr.skill_id = s.id
      LEFT JOIN users u ON sr.requester_user_id = u.id
      LEFT JOIN users m ON sr.manager_id = m.id
      LEFT JOIN users a ON sr.admin_id = a.id
      ${whereClause}
      ORDER BY sr.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    queryParams.push(pageSize, offset);

    const requestsResult = await query(requestsQuery, queryParams);

    const requests = requestsResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      requestedSkillName: row.requested_skill_name,
      currentLevel: row.current_level,
      targetLevel: row.target_level,
      grantedLevel: row.granted_level,
      reason: row.reason,
      status: row.status,
      managerComment: row.manager_comment,
      adminComment: row.admin_comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      seenByUser: row.seen_by_user,
      certificateFileId: row.certificate_file_id,
      skill: row.skill_name ? {
        name: row.skill_name,
        type: row.skill_type,
        category: row.skill_category
      } : null,
      requester: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.requester_role
      },
      manager: row.manager_first_name ? {
        firstName: row.manager_first_name,
        lastName: row.manager_last_name
      } : null,
      admin: row.admin_first_name ? {
        firstName: row.admin_first_name,
        lastName: row.admin_last_name
      } : null
    }));

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Get skill requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create skill request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { error, value } = skillRequestSchema.create.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { type, skillId, requestedSkillName, currentLevel, targetLevel, reason, certificateFileId, approverId } = value;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Handle approver selection based on user role
    let managerId = null;
    let status = 'pending_manager';
    
    if (userRole === 'employee') {
      if (approverId) {
        // Use the selected approver
        managerId = approverId;
      } else {
        // Fallback to default manager
        const manager = await getUserManager(userId);
        if (manager) {
          managerId = manager.id;
        } else {
          // If no manager found, assign to the first available manager
          const defaultManagerResult = await query(`
            SELECT id FROM users WHERE role = 'manager' AND status = 'active' LIMIT 1
          `);
          if (defaultManagerResult.rows.length > 0) {
            managerId = defaultManagerResult.rows[0].id;
            console.log(`🔍 No manager found for employee ${userId}, assigning to default manager ${managerId}`);
          } else {
            console.log(`❌ No managers available in the system`);
          }
        }
      }
      
      // Employee requests always start as pending_manager
      status = 'pending_manager';
    } else if (userRole === 'manager') {
      // Manager requests bypass their own approval and go directly to admin
      status = 'pending_admin';
      managerId = userId; // Manager is their own manager for the request
      
      // If approverId is provided, it should be an admin ID
      if (approverId) {
        // Verify the approver is an admin
        const adminCheck = await query('SELECT id FROM users WHERE id = $1 AND role = $2', [approverId, 'admin']);
        if (adminCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid approver selected' });
        }
      }
    } else if (userRole === 'admin') {
      // Admin requests can be approved directly
      status = 'pending_admin';
      managerId = userId;
    }

    // For add_existing type, get the skill name from the database
    let finalRequestedSkillName = requestedSkillName;
    if (type === 'add_existing' && skillId) {
      const skillResult = await query('SELECT name FROM skills WHERE id = $1', [skillId]);
      if (skillResult.rows.length > 0) {
        finalRequestedSkillName = skillResult.rows[0].name;
      } else {
        return res.status(400).json({ message: 'Skill not found' });
      }
    }

    // Create skill request
    const result = await query(`
      INSERT INTO skill_requests (
        requester_user_id, type, skill_id, requested_skill_name, 
        current_level, target_level, reason, status, manager_id, certificate_file_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, type, requested_skill_name, current_level, target_level,
                reason, status, created_at, certificate_file_id
    `, [userId, type, skillId, finalRequestedSkillName, currentLevel, targetLevel, reason, status, managerId, certificateFileId]);

    const request = result.rows[0];

    // Log activity
    await logActivity(userId, 'skill_request_created', 'skill_request', request.id, {
      type,
      skillId,
      requestedSkillName,
      targetLevel
    });

    // Create notifications
    if (userRole === 'employee' && managerId) {
      // Get employee details for the notification
      const employeeResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const employeeName = employeeResult.rows.length > 0 
        ? `${employeeResult.rows[0].first_name} ${employeeResult.rows[0].last_name}`
        : 'Un employé';
      
      // Get skill name for better notification
      let skillName = requestedSkillName;
      if (!skillName && skillId) {
        const skillResult = await query('SELECT name FROM skills WHERE id = $1', [skillId]);
        skillName = skillResult.rows.length > 0 ? skillResult.rows[0].name : 'Nouvelle compétence';
      }
      
      // Notify manager
      await createNotification(
        managerId,
        NOTIFICATION_TYPES.SKILL_REQUEST_CREATED,
        'Nouvelle demande de compétence',
        `${employeeName} a soumis une demande de compétence: ${skillName || 'Nouvelle compétence'}`,
        'skill_request',
        request.id
      );

      // Send email notification to manager
      try {
        const [employeeResult, managerResult] = await Promise.all([
          query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [userId]),
          query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [managerId])
        ]);
        
        if (employeeResult.rows.length > 0 && managerResult.rows.length > 0) {
          // Create enhanced request object with skill name
          const enhancedRequest = {
            ...request,
            skill_name: skillName || 'Nouvelle compétence',
            requested_skill_name: skillName || 'Nouvelle compétence'
          };
          
          await emailNotificationService.sendSkillRequestSubmitted(
            enhancedRequest,
            employeeResult.rows[0],
            managerResult.rows[0]
          );
        }
      } catch (emailError) {
        console.error('Failed to send skill request email:', emailError);
      }
    }

    res.status(201).json({
      id: request.id,
      type: request.type,
      requestedSkillName: request.requested_skill_name,
      currentLevel: request.current_level,
      targetLevel: request.target_level,
      reason: request.reason,
      status: request.status,
      createdAt: request.created_at,
      certificateFileId: request.certificate_file_id
    });
  } catch (error) {
    console.error('Create skill request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get skill request by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions based on user role
    let whereConditions = ['sr.id = $1'];
    let queryParams = [id];
    let paramCount = 1;

    if (userRole === 'employee') {
      paramCount++;
      whereConditions.push(`sr.requester_user_id = $${paramCount}`);
      queryParams.push(userId);
    } else if (userRole === 'manager') {
      paramCount++;
      whereConditions.push(`(sr.manager_id = $${paramCount} OR sr.status = 'pending_manager')`);
      queryParams.push(userId);
    }
    // Admin can see all requests

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const result = await query(`
      SELECT 
        sr.id, sr.type, sr.requested_skill_name, sr.current_level, sr.target_level, sr.granted_level,
        sr.reason, sr.status, sr.manager_comment, sr.admin_comment,
        sr.created_at, sr.updated_at, sr.certificate_file_id,
        s.name as skill_name, s.type as skill_type, s.category as skill_category,
        u.first_name, u.last_name, u.email, u.role as requester_role,
        m.first_name as manager_first_name, m.last_name as manager_last_name,
        a.first_name as admin_first_name, a.last_name as admin_last_name,
        f.original_name as certificate_original_name, f.mime_type as certificate_mime_type,
        f.size_bytes as certificate_size_bytes, f.storage_key as certificate_storage_key
      FROM skill_requests sr
      LEFT JOIN skills s ON sr.skill_id = s.id
      LEFT JOIN users u ON sr.requester_user_id = u.id
      LEFT JOIN users m ON sr.manager_id = m.id
      LEFT JOIN users a ON sr.admin_id = a.id
      LEFT JOIN files f ON sr.certificate_file_id = f.id
      ${whereClause}
    `, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    const row = result.rows[0];

    const response = {
      id: row.id,
      type: row.type,
      requestedSkillName: row.requested_skill_name,
      currentLevel: row.current_level,
      targetLevel: row.target_level,
      grantedLevel: row.granted_level,
      reason: row.reason,
      status: row.status,
      managerComment: row.manager_comment,
      adminComment: row.admin_comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      certificateFileId: row.certificate_file_id,
      certificate: row.certificate_original_name ? {
        id: row.certificate_file_id,
        originalName: row.certificate_original_name,
        mimeType: row.certificate_mime_type,
        sizeBytes: parseInt(row.certificate_size_bytes),
        storageKey: row.certificate_storage_key,
        downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${row.certificate_file_id}`
      } : null,
      skill: row.skill_name ? {
        name: row.skill_name,
        type: row.skill_type,
        category: row.skill_category
      } : null,
      requester: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.requester_role
      },
      manager: row.manager_first_name ? {
        firstName: row.manager_first_name,
        lastName: row.manager_last_name
      } : null,
      admin: row.admin_first_name ? {
        firstName: row.admin_first_name,
        lastName: row.admin_last_name
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('Get skill request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Approve skill request (manager/admin)
router.post('/:id/approve', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = skillRequestSchema.approve.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { comment, grantedLevel, modifiedSkillName, modifiedSkillDescription } = value;
    // Convert empty string comments to null
    const finalComment = comment && comment.trim() === '' ? null : comment;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get request details
    const requestResult = await query(`
      SELECT id, status, requester_user_id, skill_id, target_level, granted_level, type, requested_skill_name
      FROM skill_requests WHERE id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    const request = requestResult.rows[0];

    // Check permissions
    if (userRole === 'manager' && request.status !== 'pending_manager') {
      return res.status(403).json({ message: 'Cannot approve this request' });
    }

    if (userRole === 'admin' && request.status !== 'pending_admin') {
      return res.status(403).json({ message: 'Cannot approve this request' });
    }

    // Update request status based on role and request type
    let newStatus = 'pending_admin';
    let managerId = userId;
    let adminId = null;

    if (userRole === 'manager') {
      // Manager approval logic
      if (request.type === 'create_new') {
        // New skill requests go to admin for final approval
        newStatus = 'pending_admin';
      } else if (request.type === 'add_existing' || request.type === 'upgrade') {
        // Existing skill requests can be approved directly by manager
        newStatus = 'approved';
      }
    } else if (userRole === 'admin') {
      // Admin can approve any request
      newStatus = 'approved';
      adminId = userId;
      managerId = request.manager_id;
    }

    // Set finalized_at timestamp when request is approved or rejected
    const finalizedAt = (newStatus === 'approved' || newStatus === 'rejected') ? 'now()' : 'NULL';
    
    // Store granted level when manager approves
    const grantedLevelUpdate = userRole === 'manager' && grantedLevel ? `, granted_level = $7` : '';
    const queryParams = userRole === 'manager' && grantedLevel ? 
      [newStatus, managerId, adminId, finalComment, finalComment, id, grantedLevel] :
      [newStatus, managerId, adminId, finalComment, finalComment, id];
    
    await query(`
      UPDATE skill_requests 
      SET status = $1, manager_id = $2, admin_id = $3, 
          manager_comment = $4, admin_comment = $5, updated_at = now(),
          finalized_at = ${finalizedAt}${grantedLevelUpdate}
      WHERE id = $6
    `, queryParams);

    // If approved, add/update user skill
    if (newStatus === 'approved') {
      // Use granted level if provided, otherwise use stored granted level, otherwise use target level
      const finalLevel = grantedLevel || request.granted_level || request.target_level;
      
      if (request.type === 'upgrade' && request.skill_id) {
        // Update existing skill level
        await query(`
          INSERT INTO user_skills (user_id, skill_id, level)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, skill_id) 
          DO UPDATE SET level = $3, last_updated_at = now()
        `, [request.requester_user_id, request.skill_id, finalLevel]);
      } else if (request.type === 'add_existing' && request.skill_id) {
        // Add existing skill to user
        await query(`
          INSERT INTO user_skills (user_id, skill_id, level)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, skill_id) 
          DO UPDATE SET level = $3, last_updated_at = now()
        `, [request.requester_user_id, request.skill_id, finalLevel]);
      } else if (request.type === 'create_new') {
        // Create new skill first, then assign to user
        // Use modified name/description if provided by admin, otherwise use original
        const finalSkillName = modifiedSkillName || request.requested_skill_name;
        const finalSkillDescription = modifiedSkillDescription || 'Custom skill';
        
        const skillResult = await query(`
          INSERT INTO skills (name, type, category, description)
          VALUES ($1, 'hard', 'Custom', $2)
          ON CONFLICT (name, type) DO UPDATE SET 
            name = EXCLUDED.name,
            description = EXCLUDED.description
          RETURNING id
        `, [finalSkillName, finalSkillDescription]);

        const skillId = skillResult.rows[0].id;

        await query(`
          INSERT INTO user_skills (user_id, skill_id, level)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, skill_id) 
          DO UPDATE SET level = $3, last_updated_at = now()
        `, [request.requester_user_id, skillId, finalLevel]);
      }
    }

    // Update job title objectives progress after skill change
    await updateJobTitleObjectivesProgress(request.requester_user_id);

    // Log activity
    await logActivity(userId, 'skill_request_approved', 'skill_request', id, {
      requestType: request.type,
      skillName: request.requested_skill_name,
      targetLevel: request.target_level
    });

    // Get approver details for notification
    const approverResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
    const approverName = approverResult.rows.length > 0 
      ? `${approverResult.rows[0].first_name} ${approverResult.rows[0].last_name}`
      : 'Un manager';

    // Notify requester
    await createNotification(
      request.requester_user_id,
      NOTIFICATION_TYPES.SKILL_REQUEST_APPROVED,
      'Demande de compétence approuvée',
      `Votre demande de compétence "${request.requested_skill_name || 'Nouvelle compétence'}" a été approuvée par ${approverName}.`,
      'skill_request',
      id
    );

    // Send email notification for approval
    if (newStatus === 'approved') {
      try {
        const employeeResult = await query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [request.requester_user_id]);
        
        if (employeeResult.rows.length > 0) {
          // Get skill name for the notification
          let skillName = request.requested_skill_name;
          if (!skillName && request.skill_id) {
            const skillResult = await query('SELECT name FROM skills WHERE id = $1', [request.skill_id]);
            skillName = skillResult.rows.length > 0 ? skillResult.rows[0].name : 'Nouvelle compétence';
          }
          
          const finalLevel = grantedLevel || request.granted_level || request.target_level;
          const updatedRequest = { 
            ...request, 
            approved_level: finalLevel,
            skill_name: skillName || 'Nouvelle compétence',
            requested_skill_name: skillName || 'Nouvelle compétence'
          };
          
          await emailNotificationService.sendSkillRequestApproved(
            updatedRequest,
            employeeResult.rows[0]
          );
        }
      } catch (emailError) {
        console.error('Failed to send skill request approval email:', emailError);
      }
    }

    res.json({ message: 'Skill request approved successfully' });
  } catch (error) {
    console.error('Approve skill request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark skill request as seen by user
router.post('/:id/mark-seen', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get request details
    const requestResult = await query(`
      SELECT id, requester_user_id, status FROM skill_requests WHERE id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    const request = requestResult.rows[0];

    // Check permissions - only the requester can mark as seen
    if (request.requester_user_id !== userId) {
      return res.status(403).json({ message: 'Cannot mark this request as seen' });
    }

    // Only mark as seen if the request is approved or rejected
    if (request.status !== 'approved' && request.status !== 'rejected') {
      return res.status(400).json({ message: 'Can only mark approved/rejected requests as seen' });
    }

    // Mark as seen
    await query(`
      UPDATE skill_requests 
      SET seen_by_user = TRUE 
      WHERE id = $1
    `, [id]);

    res.json({ message: 'Request marked as seen' });
  } catch (error) {
    console.error('Mark request as seen error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Dismiss skill request (hide from employee view)
router.post('/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only employees can dismiss their own requests
    if (userRole !== 'employee') {
      return res.status(403).json({ message: 'Only employees can dismiss their own requests' });
    }

    const requestResult = await query(`
      SELECT id, requester_user_id, status FROM skill_requests WHERE id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }
    
    const request = requestResult.rows[0];
    if (request.requester_user_id !== userId) {
      return res.status(403).json({ message: 'Cannot dismiss this request' });
    }
    
    // Only allow dismissing approved or rejected requests
    if (request.status !== 'approved' && request.status !== 'rejected') {
      return res.status(400).json({ message: 'Can only dismiss approved or rejected requests' });
    }
    
    await query(`
      UPDATE skill_requests 
      SET is_dismissed = TRUE 
      WHERE id = $1
    `, [id]);
    
    res.json({ message: 'Request dismissed successfully' });
  } catch (error) {
    console.error('Error dismissing skill request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get certificate file for skill request
router.get('/:id/certificate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get skill request with certificate info
    const requestResult = await query(`
      SELECT sr.id, sr.certificate_file_id, sr.requester_user_id, sr.manager_id,
             f.original_name, f.mime_type, f.storage_key
      FROM skill_requests sr
      LEFT JOIN files f ON sr.certificate_file_id = f.id
      WHERE sr.id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    const request = requestResult.rows[0];

    // Check permissions - manager can access certificates for their team's requests
    if (userRole === 'manager') {
      if (request.manager_id !== userId) {
        return res.status(403).json({ message: 'Access denied to certificate' });
      }
    } else if (userRole === 'employee') {
      if (request.requester_user_id !== userId) {
        return res.status(403).json({ message: 'Access denied to certificate' });
      }
    }
    // Admin can access all certificates

    if (!request.certificate_file_id) {
      return res.status(404).json({ message: 'No certificate found for this request' });
    }

    if (!request.original_name) {
      return res.status(404).json({ message: 'Certificate file not found' });
    }

    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', request.storage_key);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Certificate file not found on disk' });
    }

    // Set headers for download
    res.setHeader('Content-Type', request.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${request.original_name}"`);
    res.sendFile(filePath);

  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reject skill request (manager/admin)
router.post('/:id/reject', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = skillRequestSchema.reject.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { comment } = value;
    // Convert empty string comments to null
    const finalComment = comment && comment.trim() === '' ? null : comment;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get request details
    const requestResult = await query(`
      SELECT id, status FROM skill_requests WHERE id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    const request = requestResult.rows[0];

    // Check permissions
    if (userRole === 'manager' && request.status !== 'pending_manager') {
      return res.status(403).json({ message: 'Cannot reject this request' });
    }

    if (userRole === 'admin' && request.status !== 'pending_admin') {
      return res.status(403).json({ message: 'Cannot reject this request' });
    }

    // Update request status
    let managerId = userId;
    let adminId = null;

    if (userRole === 'admin') {
      adminId = userId;
      managerId = request.manager_id;
    }

    await query(`
      UPDATE skill_requests 
      SET status = 'rejected', manager_id = $1, admin_id = $2, 
          manager_comment = $3, admin_comment = $4, updated_at = now(),
          finalized_at = now()
      WHERE id = $5
    `, [managerId, adminId, finalComment, finalComment, id]);

    // Log activity
    await logActivity(userId, 'skill_request_rejected', 'skill_request', id, {
      comment: finalComment
    });

    // Get requester info for notification
    const requesterResult = await query(`
      SELECT requester_user_id, requested_skill_name FROM skill_requests WHERE id = $1
    `, [id]);
    
    if (requesterResult.rows.length > 0) {
      const requester = requesterResult.rows[0];
      
      // Get rejector details for notification
      const rejectorResult = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const rejectorName = rejectorResult.rows.length > 0 
        ? `${rejectorResult.rows[0].first_name} ${rejectorResult.rows[0].last_name}`
        : 'Un manager';

      // Notify requester
      await createNotification(
        requester.requester_user_id,
        NOTIFICATION_TYPES.SKILL_REQUEST_REJECTED,
        'Demande de compétence rejetée',
        `Votre demande de compétence "${requester.requested_skill_name || 'Nouvelle compétence'}" a été rejetée par ${rejectorName}.${finalComment ? ` Raison: ${finalComment}` : ''}`,
        'skill_request',
        id
      );

      // Send email notification for rejection
      try {
        const employeeResult = await query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [requester.requester_user_id]);
        
        if (employeeResult.rows.length > 0) {
          // Get skill name for the notification
          let skillName = requester.requested_skill_name;
          if (!skillName && requester.skill_id) {
            const skillResult = await query('SELECT name FROM skills WHERE id = $1', [requester.skill_id]);
            skillName = skillResult.rows.length > 0 ? skillResult.rows[0].name : 'Nouvelle compétence';
          }
          
          const enhancedRequester = {
            ...requester,
            skill_name: skillName || 'Nouvelle compétence',
            requested_skill_name: skillName || 'Nouvelle compétence'
          };
          
          await emailNotificationService.sendSkillRequestRejected(
            enhancedRequester,
            employeeResult.rows[0],
            finalComment || 'Aucune raison spécifiée'
          );
        }
      } catch (emailError) {
        console.error('Failed to send skill request rejection email:', emailError);
      }
    }

    res.json({ message: 'Skill request rejected successfully' });
  } catch (error) {
    console.error('Reject skill request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Dismiss skill request (hide from employee's view)
router.post('/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only employees can dismiss their own requests
    if (userRole !== 'employee') {
      return res.status(403).json({ message: 'Only employees can dismiss their own requests' });
    }

    // Update the request to mark it as dismissed
    const result = await query(`
      UPDATE skill_requests 
      SET is_dismissed = true 
      WHERE id = $1 AND requester_user_id = $2
      RETURNING id, status
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }

    // Log activity
    await logActivity(userId, 'skill_request_dismissed', 'skill_request', id, {
      status: result.rows[0].status
    });

    res.json({ message: 'Request dismissed successfully' });
  } catch (error) {
    console.error('Dismiss request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete skill request (employee can delete their own requests)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only employees can delete their own requests
    if (userRole !== 'employee') {
      return res.status(403).json({ message: 'Only employees can delete their own requests' });
    }

    // Get request details to verify ownership
    const requestResult = await query(`
      SELECT id, requester_user_id, status, certificate_file_id FROM skill_requests WHERE id = $1
    `, [id]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Skill request not found' });
    }
    
    const request = requestResult.rows[0];
    if (request.requester_user_id !== userId) {
      return res.status(403).json({ message: 'Cannot delete this request - not your request' });
    }

    // Delete related notifications first
    await query('DELETE FROM notifications WHERE entity_type = $1 AND entity_id = $2', ['skill_request', id]);

    // Delete the skill request completely
    await query('DELETE FROM skill_requests WHERE id = $1', [id]);

    // Log activity
    await logActivity(userId, 'skill_request_deleted', 'skill_request', id, {
      status: request.status
    });

    console.log(`✅ Skill request ${id} deleted by user ${userId}`);

    res.json({ message: 'Skill request deleted successfully' });
  } catch (error) {
    console.error('Delete skill request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;




