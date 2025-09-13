const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireAdmin, requireManager } = require('../middleware/auth');
const { createNotification, logActivity, NOTIFICATION_TYPES } = require('../utils/notifications');

const router = express.Router();

// Debug endpoint to check user role
router.get('/debug-user', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Debug endpoint to test available-for-assignment route
router.get('/debug-available', authenticateToken, async (req, res) => {
  console.log('🔍 Debug available route hit - User:', req.user);
  res.json({ 
    message: 'Debug route working',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Get all job titles (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        jt.id,
        jt.title,
        jt.description,
        jt.created_at,
        jt.updated_at,
        COUNT(jtsr.skill_id) as requirements_count
      FROM job_titles jt
      LEFT JOIN job_title_skill_requirements jtsr ON jt.id = jtsr.job_title_id
      GROUP BY jt.id, jt.title, jt.description, jt.created_at, jt.updated_at
      ORDER BY jt.title ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get job titles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all job titles (for managers to assign objectives)
router.get('/for-managers', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        jt.id,
        jt.title,
        jt.description,
        jt.created_at,
        jt.updated_at,
        COUNT(jtsr.skill_id) as requirements_count
      FROM job_titles jt
      LEFT JOIN job_title_skill_requirements jtsr ON jt.id = jtsr.job_title_id
      GROUP BY jt.id, jt.title, jt.description, jt.created_at, jt.updated_at
      ORDER BY jt.title ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get job titles for managers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single job title with requirements (for managers)
router.get('/for-managers/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get job title basic info
    const jobTitleResult = await query(`
      SELECT 
        jt.id,
        jt.title,
        jt.description,
        jt.created_at,
        jt.updated_at
      FROM job_titles jt
      WHERE jt.id = $1
    `, [id]);

    if (jobTitleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job title not found' });
    }

    const jobTitle = jobTitleResult.rows[0];

    // Get skill requirements
    const requirementsResult = await query(`
      SELECT 
        s.id as skill_id,
        s.name as skill_name,
        s.description as skill_description,
        s.category,
        jtsr.required_level
      FROM job_title_skill_requirements jtsr
      JOIN skills s ON jtsr.skill_id = s.id
      WHERE jtsr.job_title_id = $1
      ORDER BY s.name ASC
    `, [id]);

    jobTitle.requirements = requirementsResult.rows;

    res.json(jobTitle);
  } catch (error) {
    console.error('Get job title for managers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get job titles available for assignment (managers)
router.get('/available-for-assignment', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Available job titles request - User:', req.user);
    console.log('🔍 User role:', req.user?.role);
    console.log('🔍 User ID:', req.user?.id);
    
    // Check if user has manager or admin role
    if (!req.user || (req.user.role !== 'manager' && req.user.role !== 'admin')) {
      console.log('❌ Access denied - User role:', req.user?.role);
      return res.status(403).json({ message: 'Access denied. Manager or admin role required.' });
    }
    
    const result = await query(`
      SELECT 
        jt.id,
        jt.title,
        jt.description,
        COUNT(jtsr.skill_id) as requirements_count
      FROM job_titles jt
      LEFT JOIN job_title_skill_requirements jtsr ON jt.id = jtsr.job_title_id
      GROUP BY jt.id, jt.title, jt.description
      ORDER BY jt.title ASC
    `);

    console.log('✅ Available job titles result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Get available job titles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get available skills for job title requirements (admin only)
router.get('/skills/available', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, category, description
      FROM skills
      ORDER BY category, name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get available skills error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get job title with skill requirements (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get job title details
    const jobTitleResult = await query(`
      SELECT * FROM job_titles WHERE id = $1
    `, [id]);

    if (jobTitleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job title not found' });
    }

    // Get skill requirements
    const requirementsResult = await query(`
      SELECT 
        jtsr.id,
        jtsr.required_level,
        s.id as skill_id,
        s.name as skill_name,
        s.category as skill_category
      FROM job_title_skill_requirements jtsr
      JOIN skills s ON jtsr.skill_id = s.id
      WHERE jtsr.job_title_id = $1
      ORDER BY s.name ASC
    `, [id]);

    const jobTitle = jobTitleResult.rows[0];
    jobTitle.requirements = requirementsResult.rows;

    res.json(jobTitle);
  } catch (error) {
    console.error('Get job title error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new job title (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, description, requirements } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Start transaction
    await query('BEGIN');

    // Create job title
    const jobTitleResult = await query(`
      INSERT INTO job_titles (title, description)
      VALUES ($1, $2)
      RETURNING *
    `, [title, description]);

    const jobTitle = jobTitleResult.rows[0];

    // Add skill requirements if provided
    if (requirements && Array.isArray(requirements)) {
      for (const req of requirements) {
        if (req.skill_id && req.required_level) {
          await query(`
            INSERT INTO job_title_skill_requirements (job_title_id, skill_id, required_level)
            VALUES ($1, $2, $3)
          `, [jobTitle.id, req.skill_id, req.required_level]);
        }
      }
    }

    await query('COMMIT');

    // Log activity
    await logActivity(req.user.id, 'job_title_created', `Created job title: ${title}`);

    res.status(201).json(jobTitle);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Create job title error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update job title (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, requirements } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Start transaction
    await query('BEGIN');

    // Update job title
    const jobTitleResult = await query(`
      UPDATE job_titles 
      SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [title, description, id]);

    if (jobTitleResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ message: 'Job title not found' });
    }

    // Update skill requirements
    if (requirements && Array.isArray(requirements)) {
      // Delete existing requirements
      await query(`
        DELETE FROM job_title_skill_requirements WHERE job_title_id = $1
      `, [id]);

      // Add new requirements
      for (const req of requirements) {
        if (req.skill_id && req.required_level) {
          await query(`
            INSERT INTO job_title_skill_requirements (job_title_id, skill_id, required_level)
            VALUES ($1, $2, $3)
          `, [id, req.skill_id, req.required_level]);
        }
      }
    }

    await query('COMMIT');

    // Log activity
    await logActivity(req.user.id, 'job_title_updated', `Updated job title: ${title}`);

    res.json(jobTitleResult.rows[0]);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Update job title error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete job title (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if job title exists
    const jobTitleResult = await query(`
      SELECT title FROM job_titles WHERE id = $1
    `, [id]);

    if (jobTitleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job title not found' });
    }

    const jobTitleName = jobTitleResult.rows[0].title;

    // Delete job title (cascade will handle related records)
    await query(`
      DELETE FROM job_titles WHERE id = $1
    `, [id]);

    // Log activity
    await logActivity(req.user.id, 'job_title_deleted', `Deleted job title: ${jobTitleName}`);

    res.json({ message: 'Job title deleted successfully' });
  } catch (error) {
    console.error('Delete job title error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Manager routes for assigning job title targets

// Assign job title target to employee (managers)
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const { employee_id, job_title_id, notes } = req.body;
    const manager_id = req.user.id;

    if (!employee_id || !job_title_id) {
      return res.status(400).json({ message: 'Employee ID and Job Title ID are required' });
    }

    // Verify employee is managed by this manager
    const employeeCheck = await query(`
      SELECT u.id, u.first_name, u.last_name
      FROM users u
      INNER JOIN team_members tm ON u.id = tm.user_id
      INNER JOIN team_management_history tmh ON tm.team_id = tmh.team_id
      WHERE u.id = $1 AND tmh.manager_id = $2 AND tmh.is_active = TRUE
    `, [employee_id, manager_id]);

    if (employeeCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You can only assign targets to your team members' });
    }

    // Check if job title exists
    const jobTitleCheck = await query(`
      SELECT title FROM job_titles WHERE id = $1
    `, [job_title_id]);

    if (jobTitleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Job title not found' });
    }

    // Check if target already exists
    const existingTarget = await query(`
      SELECT id FROM job_title_targets 
      WHERE employee_id = $1 AND job_title_id = $2
    `, [employee_id, job_title_id]);

    if (existingTarget.rows.length > 0) {
      return res.status(400).json({ message: 'This employee already has this job title target assigned' });
    }

    // Start transaction
    await query('BEGIN');

    // Create job title target
    const targetResult = await query(`
      INSERT INTO job_title_targets (employee_id, job_title_id, assigned_by, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [employee_id, job_title_id, manager_id, notes]);

    const target = targetResult.rows[0];

    // Create progress tracking for each required skill
    const requirementsResult = await query(`
      SELECT skill_id, required_level
      FROM job_title_skill_requirements
      WHERE job_title_id = $1
    `, [job_title_id]);

    for (const req of requirementsResult.rows) {
      // Get employee's current skill level
      const currentSkillResult = await query(`
        SELECT level FROM user_skills 
        WHERE user_id = $1 AND skill_id = $2
      `, [employee_id, req.skill_id]);

      const currentLevel = currentSkillResult.rows.length > 0 ? currentSkillResult.rows[0].level : 0;
      const isCompleted = currentLevel >= req.required_level;

      await query(`
        INSERT INTO job_title_target_progress (target_id, skill_id, required_level, current_level, is_completed)
        VALUES ($1, $2, $3, $4, $5)
      `, [target.id, req.skill_id, req.required_level, currentLevel, isCompleted]);
    }

    await query('COMMIT');

    // Create notification for employee
    const employee = employeeCheck.rows[0];
    const jobTitle = jobTitleCheck.rows[0];
    await createNotification(
      employee_id,
      'job_title_target_assigned',
      `You have been assigned a new job title target: ${jobTitle.title}`,
      `Your manager has assigned you the job title target "${jobTitle.title}". Check your targets to see the required skills.`
    );

    // Log activity
    await logActivity(manager_id, 'job_title_target_assigned', 
      `Assigned job title target "${jobTitle.title}" to ${employee.first_name} ${employee.last_name}`);

    res.status(201).json(target);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Assign job title target error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employee's job title targets (managers and employees)
router.get('/employee/:employee_id/targets', authenticateToken, async (req, res) => {
  try {
    const { employee_id } = req.params;
    const user_id = req.user.id;
    const user_role = req.user.role;
    
    console.log('🔍 Employee targets request - User:', req.user, 'Employee ID:', employee_id);

    // Temporarily disabled role checks for debugging
    console.log('🔍 Role check - User role:', user_role, 'User ID:', user_id, 'Employee ID:', employee_id);

    // Get job title targets with progress
    const targetsResult = await query(`
      SELECT 
        jtt.id,
        jtt.employee_id,
        jtt.job_title_id,
        jtt.assigned_by,
        jtt.assigned_at,
        jtt.completed_at,
        jtt.status,
        jtt.notes,
        jt.title as job_title_name,
        jt.description as job_title_description,
        u.first_name as assigned_by_first_name,
        u.last_name as assigned_by_last_name
      FROM job_title_targets jtt
      JOIN job_titles jt ON jtt.job_title_id = jt.id
      JOIN users u ON jtt.assigned_by = u.id
      WHERE jtt.employee_id = $1
      ORDER BY jtt.assigned_at DESC
    `, [employee_id]);

    // Get progress for each target
    const targetsWithProgress = await Promise.all(
      targetsResult.rows.map(async (target) => {
        const progressResult = await query(`
          SELECT 
            jttp.id,
            jttp.skill_id,
            jttp.required_level,
            jttp.current_level,
            jttp.is_completed,
            jttp.completed_at,
            s.name as skill_name,
            s.category as skill_category
          FROM job_title_target_progress jttp
          JOIN skills s ON jttp.skill_id = s.id
          WHERE jttp.target_id = $1
          ORDER BY s.name ASC
        `, [target.id]);

        target.progress = progressResult.rows;
        target.completion_percentage = progressResult.rows.length > 0 
          ? Math.round((progressResult.rows.filter(p => p.is_completed).length / progressResult.rows.length) * 100)
          : 0;

        return target;
      })
    );

    res.json(targetsWithProgress);
  } catch (error) {
    console.error('Get employee job title targets error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update job title target progress (called when employee's skill level changes)
router.put('/targets/:target_id/progress', authenticateToken, async (req, res) => {
  try {
    const { target_id } = req.params;
    const { skill_id, new_level } = req.body;

    if (!skill_id || new_level === undefined) {
      return res.status(400).json({ message: 'Skill ID and new level are required' });
    }

    // Get target details
    const targetResult = await query(`
      SELECT 
        jtt.id,
        jtt.employee_id,
        jtt.job_title_id,
        jtt.status,
        jt.title as job_title_name
      FROM job_title_targets jtt
      JOIN job_titles jt ON jtt.job_title_id = jt.id
      WHERE jtt.id = $1
    `, [target_id]);

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ message: 'Job title target not found' });
    }

    const target = targetResult.rows[0];

    // Update progress for this skill
    const progressResult = await query(`
      UPDATE job_title_target_progress 
      SET current_level = $1, 
          is_completed = (current_level >= required_level),
          completed_at = CASE WHEN (current_level >= required_level) THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP
      WHERE target_id = $2 AND skill_id = $3
      RETURNING *
    `, [new_level, target_id, skill_id]);

    if (progressResult.rows.length === 0) {
      return res.status(404).json({ message: 'Progress record not found' });
    }

    // Check if all skills are now completed
    const allProgressResult = await query(`
      SELECT COUNT(*) as total, SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
      FROM job_title_target_progress
      WHERE target_id = $1
    `, [target_id]);

    const { total, completed } = allProgressResult.rows[0];

    // If all skills are completed, mark target as completed
    if (completed == total && target.status !== 'completed') {
      await query(`
        UPDATE job_title_targets 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [target_id]);

      // Create notification for employee
      await createNotification(
        target.employee_id,
        'job_title_target_completed',
        `Congratulations! You have completed the job title target: ${target.job_title_name}`,
        `You have successfully achieved all required skills for the job title "${target.job_title_name}".`
      );
    }

    res.json(progressResult.rows[0]);
  } catch (error) {
    console.error('Update job title target progress error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
