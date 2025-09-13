const { query } = require('../config/database');
const { createNotification } = require('./notifications');

/**
 * Update job title target progress when an employee's skill level changes
 * @param {number} userId - The user ID whose skill level changed
 * @param {number} skillId - The skill ID that was updated
 * @param {number} newLevel - The new skill level
 */
const updateJobTitleProgress = async (userId, skillId, newLevel) => {
  try {
    console.log(`🔄 Updating job title progress for user ${userId}, skill ${skillId}, level ${newLevel}`);

    // Get all active job title targets for this user
    const targetsResult = await query(`
      SELECT 
        jtt.id as target_id,
        jtt.job_title_id,
        jtt.status,
        jt.title as job_title_name
      FROM job_title_targets jtt
      JOIN job_titles jt ON jtt.job_title_id = jt.id
      WHERE jtt.employee_id = $1 AND jtt.status IN ('assigned', 'in_progress')
    `, [userId]);

    if (targetsResult.rows.length === 0) {
      console.log(`📝 No active job title targets found for user ${userId}`);
      return;
    }

    console.log(`📝 Found ${targetsResult.rows.length} active job title targets for user ${userId}`);

    // Update progress for each target
    for (const target of targetsResult.rows) {
      // Update progress for this specific skill in this target
      const progressResult = await query(`
        UPDATE job_title_target_progress 
        SET current_level = $1, 
            is_completed = ($1 >= required_level),
            completed_at = CASE WHEN ($1 >= required_level) AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE target_id = $2 AND skill_id = $3
        RETURNING *
      `, [newLevel, target.target_id, skillId]);

      if (progressResult.rows.length > 0) {
        const progress = progressResult.rows[0];
        console.log(`📈 Updated progress for target ${target.target_id}, skill ${skillId}: level ${newLevel}/${progress.required_level}, completed: ${progress.is_completed}`);
      }

      // Check if all skills are now completed for this target
      const allProgressResult = await query(`
        SELECT 
          COUNT(*) as total_skills,
          SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_skills
        FROM job_title_target_progress
        WHERE target_id = $1
      `, [target.target_id]);

      const { total_skills, completed_skills } = allProgressResult.rows[0];

      // If all skills are completed, mark target as completed
      if (completed_skills == total_skills && target.status !== 'completed') {
        await query(`
          UPDATE job_title_targets 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [target.target_id]);

        console.log(`🎉 Job title target completed: ${target.job_title_name} for user ${userId}`);

        // Create notification for employee
        await createNotification(
          userId,
          'job_title_target_completed',
          `Congratulations! You have completed the job title target: ${target.job_title_name}`,
          `You have successfully achieved all required skills for the job title "${target.job_title_name}". This achievement has been recorded in your profile.`
        );
      }
    }
  } catch (error) {
    console.error('❌ Error updating job title progress:', error);
  }
};

/**
 * Initialize job title target progress when a new target is assigned
 * @param {number} targetId - The job title target ID
 * @param {number} employeeId - The employee ID
 * @param {number} jobTitleId - The job title ID
 */
const initializeJobTitleProgress = async (targetId, employeeId, jobTitleId) => {
  try {
    console.log(`🔄 Initializing job title progress for target ${targetId}, employee ${employeeId}, job title ${jobTitleId}`);

    // Get all skill requirements for this job title
    const requirementsResult = await query(`
      SELECT skill_id, required_level
      FROM job_title_skill_requirements
      WHERE job_title_id = $1
    `, [jobTitleId]);

    if (requirementsResult.rows.length === 0) {
      console.log(`⚠️ No skill requirements found for job title ${jobTitleId}`);
      return;
    }

    // Create progress tracking for each required skill
    for (const req of requirementsResult.rows) {
      // Get employee's current skill level
      const currentSkillResult = await query(`
        SELECT level FROM user_skills 
        WHERE user_id = $1 AND skill_id = $2
      `, [employeeId, req.skill_id]);

      const currentLevel = currentSkillResult.rows.length > 0 ? currentSkillResult.rows[0].level : 0;
      const isCompleted = currentLevel >= req.required_level;

      await query(`
        INSERT INTO job_title_target_progress (target_id, skill_id, required_level, current_level, is_completed, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        targetId, 
        req.skill_id, 
        req.required_level, 
        currentLevel, 
        isCompleted,
        isCompleted ? new Date() : null
      ]);

      console.log(`📝 Created progress tracking for skill ${req.skill_id}: level ${currentLevel}/${req.required_level}, completed: ${isCompleted}`);
    }

    // Check if target is already completed
    const allProgressResult = await query(`
      SELECT 
        COUNT(*) as total_skills,
        SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_skills
      FROM job_title_target_progress
      WHERE target_id = $1
    `, [targetId]);

    const { total_skills, completed_skills } = allProgressResult.rows[0];

    if (completed_skills == total_skills) {
      await query(`
        UPDATE job_title_targets 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [targetId]);

      console.log(`🎉 Job title target already completed during initialization: ${targetId}`);
    }
  } catch (error) {
    console.error('❌ Error initializing job title progress:', error);
  }
};

/**
 * Get job title progress summary for an employee
 * @param {number} employeeId - The employee ID
 * @returns {Object} Progress summary
 */
const getJobTitleProgressSummary = async (employeeId) => {
  try {
    const result = await query(`
      SELECT 
        jtt.id as target_id,
        jtt.job_title_id,
        jtt.status,
        jtt.assigned_at,
        jtt.completed_at,
        jt.title as job_title_name,
        jt.description as job_title_description,
        COUNT(jttp.skill_id) as total_skills,
        SUM(CASE WHEN jttp.is_completed THEN 1 ELSE 0 END) as completed_skills,
        ROUND(
          (SUM(CASE WHEN jttp.is_completed THEN 1 ELSE 0 END)::DECIMAL / COUNT(jttp.skill_id)) * 100, 
          1
        ) as completion_percentage
      FROM job_title_targets jtt
      JOIN job_titles jt ON jtt.job_title_id = jt.id
      LEFT JOIN job_title_target_progress jttp ON jtt.id = jttp.target_id
      WHERE jtt.employee_id = $1
      GROUP BY jtt.id, jtt.job_title_id, jtt.status, jtt.assigned_at, jtt.completed_at, jt.title, jt.description
      ORDER BY jtt.assigned_at DESC
    `, [employeeId]);

    return result.rows;
  } catch (error) {
    console.error('❌ Error getting job title progress summary:', error);
    return [];
  }
};

module.exports = {
  updateJobTitleProgress,
  initializeJobTitleProgress,
  getJobTitleProgressSummary
};


