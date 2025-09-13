const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireManager, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/notifications');

// Get manager's job title objectives
router.get('/manager', authenticateToken, (req, res, next) => {
  // Allow both managers and admins
  if (req.user.role === 'manager' || req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Manager or admin role required.' });
  }
}, async (req, res) => {
  try {
    const managerId = req.user.id;

    // Get all job title objectives assigned by this manager
    // Check if user is admin
    const userRole = req.user.role;
    let objectivesQuery;
    let queryParams;
    
    if (userRole === 'admin') {
      // Admin can see all objectives
      objectivesQuery = `
      SELECT 
        jto.id,
        jto.assignment_type,
        jto.target_id,
        jto.job_title_id,
        jto.notes,
        jto.status,
        jto.progress_percentage,
        jto.created_at,
        jto.updated_at,
        jto.parent_objective_id,
        jt.title as job_title_name,
        jt.description as job_title_description,
        CONCAT(u.first_name, ' ', u.last_name) as target_name,
        u.first_name, u.last_name, u.email,
        t.id as team_id,
        t.name as team_name,
        CASE WHEN ujt.id IS NOT NULL THEN true ELSE false END as already_has_job_title
      FROM job_title_objectives jto
      JOIN job_titles jt ON jto.job_title_id = jt.id
      JOIN users u ON jto.target_id = u.id
      LEFT JOIN team_members tm ON u.id = tm.user_id
      LEFT JOIN teams t ON tm.team_id = t.id
      LEFT JOIN user_job_titles ujt ON u.id = ujt.user_id AND ujt.job_title_id = jto.job_title_id AND ujt.is_active = true
      WHERE jto.assignment_type = 'individual' AND jto.status != 'completed' AND ujt.id IS NULL
      ORDER BY jto.created_at DESC
    `;
      queryParams = [];
    } else {
      // Manager can only see objectives they assigned
      objectivesQuery = `
        SELECT 
          jto.id,
          jto.assignment_type,
          jto.target_id,
          jto.job_title_id,
          jto.notes,
          jto.status,
          jto.progress_percentage,
          jto.created_at,
          jto.updated_at,
          jto.parent_objective_id,
          jt.title as job_title_name,
          jt.description as job_title_description,
          CONCAT(u.first_name, ' ', u.last_name) as target_name,
          u.first_name, u.last_name, u.email,
          CASE WHEN ujt.id IS NOT NULL THEN true ELSE false END as already_has_job_title
        FROM job_title_objectives jto
        JOIN job_titles jt ON jto.job_title_id = jt.id
        JOIN users u ON jto.target_id = u.id
        LEFT JOIN user_job_titles ujt ON u.id = ujt.user_id AND ujt.job_title_id = jto.job_title_id AND ujt.is_active = true
        WHERE jto.assigned_by = $1 AND jto.assignment_type = 'individual' AND jto.status != 'completed' AND ujt.id IS NULL
        ORDER BY jto.created_at DESC
      `;
      queryParams = [managerId];
    }

    const result = await query(objectivesQuery, queryParams);
    console.log('Found objectives:', result.rows.length);
    
    // Calculate skill gaps for each objective with error handling
    const objectivesWithGaps = await Promise.all(
      result.rows.map(async (objective) => {
        try {
          console.log(`Processing objective ${objective.id} for ${objective.target_name}`);
          // Get job title requirements
          const requirementsQuery = `
            SELECT s.id, s.name, jtsr.required_level
            FROM job_title_skill_requirements jtsr
            JOIN skills s ON jtsr.skill_id = s.id
            WHERE jtsr.job_title_id = $1
          `;
          const requirementsResult = await query(requirementsQuery, [objective.job_title_id]);
          console.log(`Objective ${objective.id}: Found ${requirementsResult.rows.length} requirements`);

          // Get member's current skill levels
          const memberSkillsQuery = `
            SELECT s.id, s.name, us.level
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.id
            WHERE us.user_id = $1
          `;
          const memberSkillsResult = await query(memberSkillsQuery, [objective.target_id]);
          console.log(`Objective ${objective.id}: Member has ${memberSkillsResult.rows.length} skills`);

          // Create skill map for quick lookup
          const memberSkillMap = {};
          memberSkillsResult.rows.forEach(skill => {
            memberSkillMap[skill.id] = skill.level;
          });

          // Calculate skill gaps
          const skillGaps = [];
          let totalGap = 0;
          let isQualified = true;

          requirementsResult.rows.forEach(requirement => {
            const currentLevel = memberSkillMap[requirement.id] || 0;
            const requiredLevel = requirement.required_level;
            const gap = requiredLevel - currentLevel; // Allow negative values for exceeding requirements
            
            // Include ALL required skills in the calculation, not just those with gaps
              skillGaps.push({
                skillId: requirement.id,
                skillName: requirement.name,
                currentLevel: currentLevel,
                requiredLevel: requiredLevel,
                gap: gap
              });
            
              totalGap += Math.max(0, gap); // Only add positive gaps to total
            
            // Check if this skill meets the requirement
            if (currentLevel < requiredLevel) {
              isQualified = false;
            }
          });

          // Determine final status
          let finalStatus = objective.status;
          let finalProgress = objective.progress_percentage;
          let finalTotalGap = totalGap;

          if (objective.already_has_job_title) {
            finalStatus = 'completed';
            finalProgress = 100;
            finalTotalGap = 0; // No skill gap if already has job title
          } else if (isQualified) {
            finalStatus = 'ready';
            finalProgress = 100;
            finalTotalGap = 0; // No skill gap if qualified
          } else if (objective.status === 'assigned') {
            // Calculate progress based on skill gaps
            const totalRequiredLevels = requirementsResult.rows.reduce((sum, req) => sum + req.required_level, 0);
            const achievedLevels = requirementsResult.rows.reduce((sum, req) => {
              const currentLevel = memberSkillMap[req.id] || 0;
              return sum + Math.min(currentLevel, req.required_level);
            }, 0);
            finalProgress = totalRequiredLevels > 0 ? Math.round((achievedLevels / totalRequiredLevels) * 100) : 0;
            
            // If progress is 100%, no skill gap
            if (finalProgress >= 100) {
              finalTotalGap = 0;
            }
          }

          return {
            ...objective,
            status: finalStatus,
            progress_percentage: finalProgress,
            skillGap: {
              totalGap: finalTotalGap,
              skillGaps: finalTotalGap > 0 ? skillGaps : [], // Only show skill gaps if there's actually a gap
              isQualified: isQualified || objective.already_has_job_title || finalProgress >= 100,
              alreadyHasJobTitle: objective.already_has_job_title
            }
          };
        } catch (skillGapError) {
          console.error(`Error calculating skill gap for objective ${objective.id}:`, skillGapError);
          // Return basic objective info if skill gap calculation fails
          return {
            ...objective,
            skillGap: {
              totalGap: 0,
              skillGaps: [],
              isQualified: objective.already_has_job_title,
              alreadyHasJobTitle: objective.already_has_job_title
            }
          };
        }
      })
    );
    
    res.json({
      objectives: objectivesWithGaps
    });
  } catch (error) {
    console.error('Error fetching manager job title objectives:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Assign job title objective
router.post('/assign', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('🔧 Assignment request received:', req.body);
    const { assignment_type, target_id, job_title_id, notes } = req.body;
    const managerId = req.user.id;
    console.log('🔧 Manager ID:', managerId);
    console.log('🔧 Assignment type:', assignment_type);
    console.log('🔧 Target ID:', target_id);
    console.log('🔧 Job title ID:', job_title_id);

    // Validate required fields
    if (!assignment_type || !target_id || !job_title_id) {
      return res.status(400).json({ 
        message: 'assignment_type, target_id, and job_title_id are required' 
      });
    }

    if (!['individual', 'team'].includes(assignment_type)) {
      return res.status(400).json({ 
        message: 'assignment_type must be either "individual" or "team"' 
      });
    }

    // Verify the target exists and user has access
    let targetQuery;
    const userRole = req.user.role;
    
    if (assignment_type === 'team') {
      if (userRole === 'admin') {
        // Admins can assign to any team
        targetQuery = `
          SELECT t.id, t.name 
          FROM teams t 
          WHERE t.id = $1
        `;
      } else {
        // Managers can only assign to teams they manage
      targetQuery = `
        SELECT t.id, t.name 
        FROM teams t 
        INNER JOIN team_management_history tmh ON t.id = tmh.team_id
        WHERE t.id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `;
      }
    } else {
      if (userRole === 'admin') {
        // Admins can assign to any employee
        targetQuery = `
          SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) as name
          FROM users u
          WHERE u.id = $1 AND u.role = 'employee'
        `;
      } else {
        // Managers can only assign to employees in their teams
      targetQuery = `
        SELECT u.id, CONCAT(u.first_name, ' ', u.last_name) as name
        FROM users u
        INNER JOIN team_members tm ON u.id = tm.user_id
        INNER JOIN teams t ON tm.team_id = t.id
        INNER JOIN team_management_history tmh ON t.id = tmh.team_id
        WHERE u.id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
      `;
      }
    }

    console.log('🔧 Executing target query:', targetQuery);
    console.log('🔧 User role:', userRole);
    
    // Set query parameters based on user role
    let queryParams;
    if (userRole === 'admin') {
      queryParams = [target_id];
    } else {
      queryParams = [target_id, managerId];
    }
    
    console.log('🔧 Query params:', queryParams);
    const targetResult = await query(targetQuery, queryParams);
    console.log('🔧 Target result:', targetResult.rows.length, 'rows');
    if (targetResult.rows.length === 0) {
      console.log('❌ Permission denied - no target found');
      return res.status(403).json({ 
        message: 'You do not have permission to assign objectives to this target' 
      });
    }

    // Verify job title exists
    const jobTitleResult = await query('SELECT id, title FROM job_titles WHERE id = $1', [job_title_id]);
    if (jobTitleResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid job title ID' });
    }

    // Check if objective already exists from any manager
    const existingQuery = `
      SELECT id, status, assigned_by FROM job_title_objectives 
      WHERE assignment_type = $1 AND target_id = $2 AND job_title_id = $3 AND status != 'completed'
    `;
    const existingResult = await query(existingQuery, [assignment_type, target_id, job_title_id]);
    console.log('🔍 Existing objective check:', existingResult.rows.length, 'rows found');
    
    // If objective already exists and is not completed, replace it with new assignment
    if (existingResult.rows.length > 0 && existingResult.rows[0].status !== 'completed') {
      console.log('ℹ️ Objective exists but not completed, replacing it:', existingResult.rows[0].status);
      const existingObjectiveId = existingResult.rows[0].id;
      const existingAssignedBy = existingResult.rows[0].assigned_by;
      
      // Check if the current manager is the employee's current manager
      const currentManagerQuery = `
        SELECT tmh.manager_id
        FROM team_members tm
        JOIN team_management_history tmh ON tm.team_id = tmh.team_id
        WHERE tm.user_id = $1 AND tmh.is_active = true
        LIMIT 1
      `;
      const currentManagerResult = await query(currentManagerQuery, [target_id]);
      const currentManagerId = currentManagerResult.rows.length > 0 ? currentManagerResult.rows[0].manager_id : null;
      
      // If it's from the same manager, update it
      if (existingAssignedBy === managerId) {
        console.log('ℹ️ Same manager, updating existing objective');
      } else {
        // Only replace if the current assigner is the employee's current manager
        if (managerId === currentManagerId) {
          console.log('ℹ️ Current manager replacing objective from non-current manager');
          // Delete the existing objective from the other manager
          await query('DELETE FROM job_title_objectives WHERE id = $1', [existingObjectiveId]);
        } else {
          console.log('ℹ️ Non-current manager cannot replace existing objective');
      return res.status(400).json({ 
            message: 'Cannot assign objective: Employee already has this objective from their current manager' 
          });
        }
      }
      
      // Check if member is now qualified for this job title
      const requirementsQuery = `
        SELECT s.id, s.name, jtsr.required_level
        FROM job_title_skill_requirements jtsr
        JOIN skills s ON jtsr.skill_id = s.id
        WHERE jtsr.job_title_id = $1
      `;
      const requirementsResult = await query(requirementsQuery, [job_title_id]);

      const memberSkillsQuery = `
        SELECT s.id, s.name, us.level
        FROM user_skills us
        JOIN skills s ON us.skill_id = s.id
        WHERE us.user_id = $1
      `;
      const memberSkillsResult = await query(memberSkillsQuery, [target_id]);

      const memberSkillMap = {};
      memberSkillsResult.rows.forEach(skill => {
        memberSkillMap[skill.id] = skill.level;
      });

      let isQualified = true;
      
      // If no requirements, everyone is qualified
      if (requirementsResult.rows.length === 0) {
        isQualified = true;
      } else {
        requirementsResult.rows.forEach(requirement => {
          const currentLevel = memberSkillMap[requirement.id] || 0;
          if (currentLevel < requirement.required_level) {
            isQualified = false;
          }
        });
      }

      // Update status and progress based on qualification
      let newStatus = 'assigned';
      let newProgress = 0;
      
      if (isQualified) {
        newStatus = 'ready';
        newProgress = 100;
      }
      
      if (existingAssignedBy === managerId) {
        // Update the existing objective with new notes, status, and progress
        await query(`
          UPDATE job_title_objectives 
          SET notes = $1, status = $2, progress_percentage = $3, updated_at = NOW()
          WHERE id = $4
        `, [notes || null, newStatus, newProgress, existingObjectiveId]);
        
        return res.status(200).json({
          message: 'Objective updated successfully',
          objective_id: existingObjectiveId
        });
      } else {
        // Create new objective (existing one was deleted)
        const newObjectiveId = uuidv4();
        await query(`
          INSERT INTO job_title_objectives (id, assignment_type, target_id, job_title_id, assigned_by, notes, status, progress_percentage, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [newObjectiveId, assignment_type, target_id, job_title_id, managerId, notes || null, newStatus, newProgress]);
        
        return res.status(200).json({
          message: 'Objective assigned successfully (replaced existing)',
          objective_id: newObjectiveId
        });
      }
    }
    
    // If objective already exists and is completed, check if employee actually has the job title
    if (existingResult.rows.length > 0 && existingResult.rows[0].status === 'completed') {
      console.log('✅ Objective exists and is completed:', existingResult.rows[0].status);
      
      // Check if employee actually has this job title
      const jobTitleCheckQuery = `
        SELECT id FROM user_job_titles 
        WHERE user_id = $1 AND job_title_id = $2 AND is_active = true
      `;
      const jobTitleCheckResult = await query(jobTitleCheckQuery, [target_id, job_title_id]);
      
      if (jobTitleCheckResult.rows.length > 0) {
        // Employee actually has the job title, return success
        return res.status(200).json({
          message: 'Job title objective already completed',
          objective_id: existingResult.rows[0].id
        });
      } else {
        // Employee doesn't have the job title, update objective to ready status
        console.log('ℹ️ Employee completed objective but doesn\'t have job title, updating to ready status');
        await query(`
          UPDATE job_title_objectives 
          SET status = 'ready', progress_percentage = 100, notes = $1, updated_at = NOW()
          WHERE id = $2
        `, [notes || null, existingResult.rows[0].id]);
        
        return res.status(200).json({
          message: 'Objective updated to ready status',
          objective_id: existingResult.rows[0].id
        });
      }
    }
    
    // Check if employee already has this job title
    const existingJobTitleQuery = `
      SELECT id FROM user_job_titles 
      WHERE user_id = $1 AND job_title_id = $2 AND is_active = true
    `;
    const existingJobTitleResult = await query(existingJobTitleQuery, [target_id, job_title_id]);
    
    if (existingJobTitleResult.rows.length > 0) {
      // Employee already has this job title, return error
      return res.status(400).json({
        message: 'Employee already has this job title'
      });
    }

    // Create the objective
    const insertQuery = `
      INSERT INTO job_title_objectives (assignment_type, target_id, job_title_id, assigned_by, notes, status, progress_percentage)
      VALUES ($1, $2, $3, $4, $5, 'assigned', 0)
      RETURNING id, created_at
    `;

    const insertResult = await query(insertQuery, [
      assignment_type, 
      target_id, 
      job_title_id, 
      managerId, 
      notes || null
    ]);

    const objectiveId = insertResult.rows[0].id;

    // Get job title and assigner details for notifications
    const [jobTitleDetails, assignerResult] = await Promise.all([
      query('SELECT title FROM job_titles WHERE id = $1', [job_title_id]),
      query('SELECT first_name, last_name FROM users WHERE id = $1', [managerId])
    ]);
    
    const jobTitle = jobTitleDetails.rows.length > 0 ? jobTitleDetails.rows[0].title : 'Titre inconnu';
    const assignerName = assignerResult.rows.length > 0 
      ? `${assignerResult.rows[0].first_name} ${assignerResult.rows[0].last_name}`
      : 'Un manager';

    // If assigning to a team, create individual objectives for each team member
    if (assignment_type === 'team') {
      const teamMembersQuery = `
        SELECT u.id, u.first_name, u.last_name, u.email
        FROM users u
        JOIN team_members tm ON u.id = tm.user_id
        WHERE tm.team_id = $1 AND tm.role_in_team = 'member'
      `;
      
      const teamMembersResult = await query(teamMembersQuery, [target_id]);
      
      for (const member of teamMembersResult.rows) {
        // Check if member already has this job title
        const memberJobTitleQuery = `
          SELECT ujt.id 
          FROM user_job_titles ujt 
          WHERE ujt.user_id = $1 AND ujt.job_title_id = $2 AND ujt.is_active = true
        `;
        const memberJobTitleResult = await query(memberJobTitleQuery, [member.id, job_title_id]);
        
        if (memberJobTitleResult.rows.length === 0) {
          // Check if member already meets all requirements
          const requirementsQuery = `
            SELECT s.id, s.name, jtsr.required_level
            FROM job_title_skill_requirements jtsr
            JOIN skills s ON jtsr.skill_id = s.id
            WHERE jtsr.job_title_id = $1
          `;
          const requirementsResult = await query(requirementsQuery, [job_title_id]);

          const memberSkillsQuery = `
            SELECT s.id, s.name, us.level
            FROM user_skills us
            JOIN skills s ON us.skill_id = s.id
            WHERE us.user_id = $1
          `;
          const memberSkillsResult = await query(memberSkillsQuery, [member.id]);

          const memberSkillMap = {};
          memberSkillsResult.rows.forEach(skill => {
            memberSkillMap[skill.id] = skill.level;
          });

          let isQualified = true;
          let totalAchieved = 0;
          let totalRequired = 0;
          
          // If no requirements, everyone is qualified
          if (requirementsResult.rows.length === 0) {
            isQualified = true;
            progressPercentage = 100;
          } else {
          requirementsResult.rows.forEach(requirement => {
            const currentLevel = memberSkillMap[requirement.id] || 0;
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

          let objectiveStatus = 'assigned';

          if (isQualified) {
            // Member already meets all requirements - set to ready for confirmation
            objectiveStatus = 'ready';
            progressPercentage = 100;
            
            // Check if member already has this job title
            const existingMemberJobTitleQuery = `
              SELECT id FROM user_job_titles 
              WHERE user_id = $1 AND job_title_id = $2
            `;
            const existingMemberJobTitleResult = await query(existingMemberJobTitleQuery, [member.id, job_title_id]);
            
            // Don't automatically assign job title - wait for manual confirmation

            // Create notification for ready status
            await query(`
              INSERT INTO notifications (user_id, type, title, body, created_at)
              VALUES ($1, 'job_title_ready', $2, $3, NOW())
            `, [
              member.id,
              `Prêt pour le titre de poste: ${jobTitleResult.rows[0].title}`,
              `Vous êtes prêt pour le titre de poste "${jobTitleResult.rows[0].title}" ! Votre manager doit confirmer pour que vous l'obteniez officiellement.`
            ]);
          } else {
            // Calculate progress percentage for non-qualified members
            if (totalRequired > 0) {
              progressPercentage = Math.round((totalAchieved / totalRequired) * 100);
            }
            
            // Create notification for objective assignment
            const { createNotification } = require('../utils/notifications');
            await createNotification(
              member.id,
              'job_title_objective_assigned',
              `Nouvel objectif de titre de poste: ${jobTitle}`,
              `${assignerName} vous a assigné un objectif pour le titre de poste "${jobTitle}". ${notes ? `Notes: ${notes}` : ''}`,
              'job_title_objective',
              objectiveId
            );

            // Send email notification
            try {
              const emailNotificationService = require('../services/emailNotificationService');
              await emailNotificationService.sendEmail('job_title_objective_assigned', {
                recipientEmail: member.email,
                recipientName: `${member.first_name} ${member.last_name}`,
                jobTitle: jobTitle,
                assignerName: assignerName,
                notes: notes || 'Aucune note spécifiée',
                objectiveId: objectiveId
              });
            } catch (emailError) {
              console.error('Failed to send job title objective assignment email:', emailError);
            }
          }

          // Create individual objective for this member
          await query(`
            INSERT INTO job_title_objectives (assignment_type, target_id, job_title_id, assigned_by, notes, status, progress_percentage, parent_objective_id)
            VALUES ('individual', $1, $2, $3, $4, $5, $6, $7)
          `, [member.id, job_title_id, managerId, notes || null, objectiveStatus, progressPercentage, objectiveId]);
        }
      }
    } else {
      // Individual assignment - check if member already meets all requirements
      const requirementsQuery = `
        SELECT s.id, s.name, jtsr.required_level
        FROM job_title_skill_requirements jtsr
        JOIN skills s ON jtsr.skill_id = s.id
        WHERE jtsr.job_title_id = $1
      `;
      const requirementsResult = await query(requirementsQuery, [job_title_id]);

      const memberSkillsQuery = `
        SELECT s.id, s.name, us.level
        FROM user_skills us
        JOIN skills s ON us.skill_id = s.id
        WHERE us.user_id = $1
      `;
      const memberSkillsResult = await query(memberSkillsQuery, [target_id]);

      const memberSkillMap = {};
      memberSkillsResult.rows.forEach(skill => {
        memberSkillMap[skill.id] = skill.level;
      });

      let isQualified = true;
      let totalAchieved = 0;
      let totalRequired = 0;
      
      // If no requirements, everyone is qualified
      if (requirementsResult.rows.length === 0) {
        isQualified = true;
        progressPercentage = 100;
      } else {
      requirementsResult.rows.forEach(requirement => {
        const currentLevel = memberSkillMap[requirement.id] || 0;
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

      let objectiveStatus = 'assigned';

      if (isQualified) {
        // Member already meets all requirements - set to ready for confirmation
        objectiveStatus = 'ready';
        progressPercentage = 100;
        
        // Check if user already has this job title
        const existingJobTitleQuery = `
          SELECT id FROM user_job_titles 
          WHERE user_id = $1 AND job_title_id = $2
        `;
        const existingJobTitleResult = await query(existingJobTitleQuery, [target_id, job_title_id]);
        
        // Don't automatically assign job title - wait for manual confirmation

        // Create notification for ready status
        await query(`
          INSERT INTO notifications (user_id, type, title, body, created_at)
          VALUES ($1, 'job_title_ready', $2, $3, NOW())
        `, [
          target_id,
          `Prêt pour le titre de poste: ${jobTitleResult.rows[0].title}`,
          `Vous êtes prêt pour le titre de poste "${jobTitleResult.rows[0].title}" ! Votre manager doit confirmer pour que vous l'obteniez officiellement.`
        ]);
      } else {
        // Calculate progress percentage for non-qualified members
        if (totalRequired > 0) {
          progressPercentage = Math.round((totalAchieved / totalRequired) * 100);
        }
        
        // Create notification for objective assignment
        await query(`
          INSERT INTO notifications (user_id, type, title, body, created_at)
          VALUES ($1, 'job_title_objective', $2, $3, NOW())
        `, [
          target_id,
          `Nouvel objectif de titre de poste: ${jobTitleResult.rows[0].title}`,
          `Votre manager vous a assigné un objectif pour le titre de poste "${jobTitleResult.rows[0].title}". ${notes ? `Notes: ${notes}` : ''}`
        ]);
      }

      // Update the objective status and progress
      await query(`
        UPDATE job_title_objectives 
        SET status = $1, progress_percentage = $2
        WHERE id = $3
      `, [objectiveStatus, progressPercentage, objectiveId]);
    }

    // Log activity
    await logActivity(managerId, 'job_title_objective_assigned', 'job_title_objective', objectiveId, 
      { job_title_name: jobTitleResult.rows[0].title, assignment_type, target_name: targetResult.rows[0].name });

    res.status(201).json({
      message: 'Job title objective assigned successfully',
      objective_id: objectiveId
    });

  } catch (error) {
    console.error('❌ Error assigning job title objective:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      table: error.table,
      column: error.column
    });
    
    // Provide more specific error messages
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ 
        message: 'This objective has already been assigned to this target',
        error: 'DUPLICATE_OBJECTIVE'
      });
    } else if (error.code === '23503') { // Foreign key constraint violation
      res.status(400).json({ 
        message: 'Invalid reference - target or job title not found',
        error: 'INVALID_REFERENCE'
      });
    } else {
      res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message,
        details: error.detail || 'No additional details available'
      });
    }
  }
});

// Get available members for a job title (members who don't already have it)
router.get('/available-members/:jobTitleId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { jobTitleId } = req.params;
    const managerId = req.user.id;

    // Get all team members managed by this manager who don't already have this job title
    const membersQuery = `
      SELECT DISTINCT 
        u.id, u.first_name, u.last_name, u.email, u.job_title,
        CONCAT(u.first_name, ' ', u.last_name) as full_name
      FROM users u
      INNER JOIN team_members tm ON u.id = tm.user_id
      INNER JOIN teams t ON tm.team_id = t.id
      INNER JOIN team_management_history tmh ON t.id = tmh.team_id
      LEFT JOIN user_job_titles ujt ON u.id = ujt.user_id AND ujt.job_title_id = $1 AND ujt.is_active = true
      WHERE tmh.manager_id = $2 AND tmh.is_active = TRUE AND ujt.id IS NULL
      ORDER BY u.first_name, u.last_name
    `;

    const result = await query(membersQuery, [jobTitleId, managerId]);
    
    // Calculate skill gaps for each member
    const membersWithGaps = await Promise.all(
      result.rows.map(async (row) => {
        // Get job title requirements
        const requirementsQuery = `
          SELECT s.id, s.name, jtsr.required_level
          FROM job_title_skill_requirements jtsr
          JOIN skills s ON jtsr.skill_id = s.id
          WHERE jtsr.job_title_id = $1
        `;
        const requirementsResult = await query(requirementsQuery, [jobTitleId]);

        // Get member's current skill levels
        const memberSkillsQuery = `
          SELECT s.id, s.name, us.level
          FROM user_skills us
          JOIN skills s ON us.skill_id = s.id
          WHERE us.user_id = $1
        `;
        const memberSkillsResult = await query(memberSkillsQuery, [row.id]);

        // Create skill map for quick lookup
        const memberSkillMap = {};
        memberSkillsResult.rows.forEach(skill => {
          memberSkillMap[skill.id] = skill.level;
        });

        // Calculate skill gaps
        const skillGaps = [];
        let totalGap = 0;
        let isQualified = true;

        // If no requirements, everyone is qualified
        if (requirementsResult.rows.length === 0) {
          isQualified = true;
          totalGap = 0;
        } else {
        requirementsResult.rows.forEach(requirement => {
          const currentLevel = memberSkillMap[requirement.id] || 0;
          const requiredLevel = requirement.required_level;
          const gap = requiredLevel - currentLevel; // Allow negative values for exceeding requirements
          
          // Always include the skill in the gaps array, even if current level exceeds required
          skillGaps.push({
            skillId: requirement.id,
            skillName: requirement.name,
            currentLevel: currentLevel,
            requiredLevel: requiredLevel,
            gap: gap
          });
          
          if (gap > 0) {
            isQualified = false;
            totalGap += gap;
          }
        });
        }

        return {
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          jobTitle: row.job_title,
          fullName: row.full_name,
          skillGap: {
            totalGap: totalGap,
            skillGaps: skillGaps,
            isQualified: isQualified
          }
        };
      })
    );
    
    res.json({
      members: membersWithGaps
    });

  } catch (error) {
    console.error('Error fetching available members:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get skill gap for a member and job title
router.get('/skill-gap/:memberId/:jobTitleId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { memberId, jobTitleId } = req.params;
    const managerId = req.user.id;

    // Verify manager has access to this member
    const accessQuery = `
      SELECT u.id
      FROM users u
      INNER JOIN team_members tm ON u.id = tm.user_id
      INNER JOIN teams t ON tm.team_id = t.id
      INNER JOIN team_management_history tmh ON t.id = tmh.team_id
      WHERE u.id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
    `;
    const accessResult = await query(accessQuery, [memberId, managerId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this member' });
    }

    // Get job title requirements
    const requirementsQuery = `
      SELECT s.id, s.name, jtsr.required_level
      FROM job_title_skill_requirements jtsr
      JOIN skills s ON jtsr.skill_id = s.id
      WHERE jtsr.job_title_id = $1
    `;
    const requirementsResult = await query(requirementsQuery, [jobTitleId]);

    // Get member's current skill levels
    const memberSkillsQuery = `
      SELECT s.id, s.name, us.level
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      WHERE us.user_id = $1
    `;
    const memberSkillsResult = await query(memberSkillsQuery, [memberId]);

    // Create skill map for quick lookup
    const memberSkillMap = {};
    memberSkillsResult.rows.forEach(skill => {
      memberSkillMap[skill.id] = skill.level;
    });

    // Calculate skill gaps
    const skillGaps = [];
    let totalGap = 0;
    let totalRequired = 0;
    let totalAchieved = 0;

    requirementsResult.rows.forEach(requirement => {
      const currentLevel = memberSkillMap[requirement.id] || 0;
      const requiredLevel = requirement.required_level;
      const gap = requiredLevel - currentLevel; // Allow negative values for exceeding requirements
      
      // Include ALL required skills in the calculation, not just those with gaps
        skillGaps.push({
          skillId: requirement.id,
          skillName: requirement.name,
          currentLevel: currentLevel,
          requiredLevel: requiredLevel,
          gap: gap
        });
      
        totalGap += Math.max(0, gap); // Only add positive gaps to total
      totalRequired += requiredLevel;
      totalAchieved += Math.min(currentLevel, requiredLevel);
    });

    // Calculate progress percentage
    const progressPercentage = totalRequired > 0 ? Math.round((totalAchieved / totalRequired) * 100) : 100;

    res.json({
      skillGap: {
        totalGap: totalGap,
        totalRequired: totalRequired,
        totalAchieved: totalAchieved,
        progressPercentage: progressPercentage,
        skillGaps: skillGaps
      }
    });

  } catch (error) {
    console.error('Error calculating skill gap:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee's job title objectives
router.get('/employee/my-objectives', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const objectivesQuery = `
      SELECT 
        jto.id,
        jto.job_title_id,
        jto.notes,
        jto.status,
        jto.progress_percentage,
        jto.created_at,
        jto.updated_at,
        jt.title as job_title_name,
        jt.description as job_title_description,
        CONCAT(u.first_name, ' ', u.last_name) as assigned_by_name,
        CASE WHEN ujt.id IS NOT NULL THEN true ELSE false END as already_has_job_title
      FROM job_title_objectives jto
      JOIN job_titles jt ON jto.job_title_id = jt.id
      JOIN users u ON jto.assigned_by = u.id
      LEFT JOIN user_job_titles ujt ON jto.target_id = ujt.user_id AND ujt.job_title_id = jto.job_title_id AND ujt.is_active = true
      WHERE jto.target_id = $1 AND jto.assignment_type = 'individual' AND jto.status != 'completed' AND ujt.id IS NULL
      ORDER BY jto.created_at DESC
    `;

    const result = await query(objectivesQuery, [userId]);
    console.log('Employee objectives query result:', result.rows.length, 'objectives found');
    
    // Calculate skill gaps and progress for each objective
    const objectivesWithGaps = await Promise.all(
      result.rows.map(async (objective) => {
        try {
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

          // Create skill map for quick lookup
          const userSkillMap = {};
          userSkillsResult.rows.forEach(skill => {
            userSkillMap[skill.id] = skill.level;
          });

          // Calculate skill gaps and progress
          const skillGaps = [];
          const progress = [];
          let totalGap = 0;
          let isQualified = true;

          requirementsResult.rows.forEach(requirement => {
            const currentLevel = userSkillMap[requirement.id] || 0;
            const requiredLevel = requirement.required_level;
            const gap = requiredLevel - currentLevel; // Allow negative values for exceeding requirements
            
            progress.push({
              skill_name: requirement.name,
              current_level: currentLevel,
              required_level: requiredLevel,
              is_completed: currentLevel >= requiredLevel
            });
            
            // Include ALL required skills in the calculation, not just those with gaps
            skillGaps.push({
              skillId: requirement.id,
              skillName: requirement.name,
              currentLevel: currentLevel,
              requiredLevel: requiredLevel,
              gap: gap
            });
            
            totalGap += Math.max(0, gap); // Only add positive gaps to total
            
            // Check if this skill meets the requirement
            if (currentLevel < requiredLevel) {
              isQualified = false;
            }
          });

          // Calculate progress percentage and final skill gap
          let progressPercentage = objective.progress_percentage;
          let finalTotalGap = totalGap;
          
          if (objective.already_has_job_title || isQualified) {
            progressPercentage = 100;
            finalTotalGap = 0; // No skill gap if already qualified
          } else if (objective.status === 'assigned') {
            const totalRequiredLevels = requirementsResult.rows.reduce((sum, req) => sum + req.required_level, 0);
            const achievedLevels = requirementsResult.rows.reduce((sum, req) => {
              const currentLevel = userSkillMap[req.id] || 0;
              return sum + Math.min(currentLevel, req.required_level);
            }, 0);
            progressPercentage = totalRequiredLevels > 0 ? Math.round((achievedLevels / totalRequiredLevels) * 100) : 0;
            
            // If progress is 100%, no skill gap
            if (progressPercentage >= 100) {
              finalTotalGap = 0;
            }
          }

          return {
            ...objective,
            progress_percentage: progressPercentage,
            progress: progress,
            skillGap: {
              totalGap: finalTotalGap,
              skillGaps: finalTotalGap > 0 ? skillGaps : [], // Only show skill gaps if there's actually a gap
              isQualified: isQualified || objective.already_has_job_title || progressPercentage >= 100,
              alreadyHasJobTitle: objective.already_has_job_title
            }
          };
        } catch (skillGapError) {
          console.error(`Error calculating skill gap for objective ${objective.id}:`, skillGapError);
          // Return basic objective info if skill gap calculation fails
          return {
            ...objective,
            progress: [],
            skillGap: {
              totalGap: 0,
              skillGaps: [],
              isQualified: objective.already_has_job_title,
              alreadyHasJobTitle: objective.already_has_job_title
            }
          };
        }
      })
    );
    
    res.json({
      objectives: objectivesWithGaps
    });
  } catch (error) {
    console.error('Error fetching employee job title objectives:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Confirm job title objective completion
router.post('/confirm-completion/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const objectiveId = req.params.id;
    const managerId = req.user.id;
    console.log('🔧 Confirmation request received for objective:', objectiveId, 'by manager:', managerId);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(objectiveId)) {
      console.log('❌ Invalid UUID format for objectiveId:', objectiveId);
      return res.status(400).json({ message: 'Invalid objective ID format' });
    }
    
    if (!uuidRegex.test(managerId)) {
      console.log('❌ Invalid UUID format for managerId:', managerId);
      return res.status(400).json({ message: 'Invalid manager ID format' });
    }

    // Verify the objective belongs to this manager
    const objectiveQuery = `
      SELECT jto.*, jt.title as job_title_name, CONCAT(u.first_name, ' ', u.last_name) as target_name
      FROM job_title_objectives jto
      JOIN job_titles jt ON jto.job_title_id = jt.id
      JOIN users u ON jto.target_id = u.id
      WHERE jto.id = $1 AND jto.assigned_by = $2
    `;
    const objectiveResult = await query(objectiveQuery, [objectiveId, managerId]);
    console.log('🔍 Objective query result:', objectiveResult.rows.length, 'rows found');
    
    if (objectiveResult.rows.length === 0) {
      console.log('❌ Objective not found for manager');
      return res.status(404).json({ message: 'Objective not found' });
    }

    const objective = objectiveResult.rows[0];
    console.log('📋 Objective found:', objective.job_title_name, 'for', objective.target_name);

    // Check if user already has the job title
    const existingJobTitleQuery = `
      SELECT id FROM user_job_titles 
      WHERE user_id = $1 AND job_title_id = $2 AND is_active = true
    `;
    const existingResult = await query(existingJobTitleQuery, [objective.target_id, objective.job_title_id]);

    if (existingResult.rows.length === 0) {
      // Assign the job title to the user (only if they don't already have it)
      try {
      await query(`
        INSERT INTO user_job_titles (user_id, job_title_id, assigned_by, assigned_at, is_active)
        VALUES ($1, $2, $3, NOW(), true)
      `, [objective.target_id, objective.job_title_id, managerId]);
      } catch (insertError) {
        // If it's a unique constraint violation, the user already has this job title
        if (insertError.code === '23505') {
          console.log('ℹ️ User already has this job title, continuing with confirmation');
        } else {
          throw insertError; // Re-throw if it's a different error
        }
      }
    }

    // Update the objective status to completed (without triggering the auto-assign function)
    await query(`
      UPDATE job_title_objectives 
      SET status = 'completed', progress_percentage = 100
      WHERE id = $1
    `, [objectiveId]);

    // Create notification for the user
    await query(`
      INSERT INTO notifications (user_id, type, title, body, created_at)
      VALUES ($1, 'job_title_achieved', $2, $3, NOW())
    `, [
      objective.target_id,
      `Titre de poste confirmé: ${objective.job_title_name}`,
      `Votre manager a confirmé que vous avez obtenu le titre de poste "${objective.job_title_name}".`
    ]);

    // Log activity
    await logActivity(managerId, 'job_title_objective_confirmed', 'job_title_objective', objectiveId, 
      { job_title_name: objective.job_title_name, target_name: objective.target_name });

    res.json({
      message: 'Objective completion confirmed successfully'
    });

  } catch (error) {
    console.error('❌ Error confirming objective completion:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      table: error.table,
      column: error.column
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      details: error.detail || 'No additional details available'
    });
  }
});

// Get objective details with progress
router.get('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const objectiveId = req.params.id;
    const managerId = req.user.id;

    const objectiveQuery = `
      SELECT 
        jto.*,
        jt.title as job_title_name,
        jt.description as job_title_description,
        CASE 
          WHEN jto.assignment_type = 'team' THEN t.name
          WHEN jto.assignment_type = 'individual' THEN CONCAT(u.first_name, ' ', u.last_name)
        END as target_name
      FROM job_title_objectives jto
      JOIN job_titles jt ON jto.job_title_id = jt.id
      LEFT JOIN teams t ON jto.assignment_type = 'team' AND jto.target_id = t.id
      LEFT JOIN users u ON jto.assignment_type = 'individual' AND jto.target_id = u.id
      WHERE jto.id = $1 AND jto.assigned_by = $2
    `;

    const result = await query(objectiveQuery, [objectiveId, managerId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Objective not found' });
    }

    const objective = result.rows[0];

    // Get skill requirements for this job title
    const skillsQuery = `
      SELECT 
        s.id,
        s.name,
        s.description,
        jtsr.required_level,
        COALESCE(us.level, 0) as current_level,
        CASE 
          WHEN COALESCE(us.level, 0) >= jtsr.required_level THEN true
          ELSE false
        END as is_met
      FROM job_title_skill_requirements jtsr
      JOIN skills s ON jtsr.skill_id = s.id
      LEFT JOIN user_skills us ON s.id = us.skill_id AND us.user_id = $1
      WHERE jtsr.job_title_id = $2
      ORDER BY s.name
    `;

    const targetUserId = objective.assignment_type === 'individual' ? objective.target_id : null;
    const skillsResult = await query(skillsQuery, [targetUserId, objective.job_title_id]);

    objective.skill_requirements = skillsResult.rows;

    res.json({ objective });
  } catch (error) {
    console.error('Error fetching objective details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete job title objective
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const objectiveId = req.params.id;
    const managerId = req.user.id;

    // Verify the objective belongs to this manager
    const objectiveQuery = `
      SELECT jto.*, jt.title as job_title_name, CONCAT(u.first_name, ' ', u.last_name) as target_name
      FROM job_title_objectives jto
      JOIN job_titles jt ON jto.job_title_id = jt.id
      JOIN users u ON jto.target_id = u.id
      WHERE jto.id = $1 AND jto.assigned_by = $2
    `;
    const objectiveResult = await query(objectiveQuery, [objectiveId, managerId]);
    
    if (objectiveResult.rows.length === 0) {
      return res.status(404).json({ message: 'Objective not found or access denied' });
    }

    const objective = objectiveResult.rows[0];

    // Delete the objective
    await query('DELETE FROM job_title_objectives WHERE id = $1', [objectiveId]);

    // Create notification for the user
    await query(`
      INSERT INTO notifications (user_id, type, title, body, created_at)
      VALUES ($1, 'job_title_objective_deleted', $2, $3, NOW())
    `, [
      objective.target_id,
      `Objectif de titre de poste supprimé: ${objective.job_title_name}`,
      `Votre objectif de titre de poste "${objective.job_title_name}" a été supprimé par votre manager.`
    ]);

    // Log activity
    await logActivity(managerId, 'job_title_objective_deleted', 'job_title_objective', objectiveId, 
      { job_title_name: objective.job_title_name, target_name: objective.target_name });

    res.json({
      message: 'Objective deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting objective:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
