const Joi = require('joi');

const userSchema = {
  create: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('admin', 'manager', 'employee').required(),
    jobTitleIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    profile_picture_url: Joi.string().uri().allow('', null).optional(),
    departmentIds: Joi.array().items(Joi.string().uuid()).optional(),
    teamIds: Joi.array().items(Joi.string().uuid()).optional()
  }),

  update: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    jobTitleIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    role: Joi.string().valid('admin', 'manager', 'employee').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    profile_picture_url: Joi.string().uri().allow('', null).optional(),
    departmentIds: Joi.array().items(Joi.string().uuid()).optional(),
    teamIds: Joi.array().items(Joi.string().uuid()).optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  })
};

const skillSchema = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    type: Joi.string().valid('hard', 'soft').required(),
    category: Joi.string().max(50).optional(),
    description: Joi.string().max(500).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    type: Joi.string().valid('hard', 'soft').optional(),
    category: Joi.string().max(50).optional(),
    description: Joi.string().max(500).optional(),
    isActive: Joi.boolean().optional()
  })
};

const skillRequestSchema = {
  create: Joi.object({
    type: Joi.string().valid('add_existing', 'upgrade', 'create_new').required(),
    skillId: Joi.string().uuid().when('type', {
      is: Joi.string().valid('add_existing', 'upgrade'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    requestedSkillName: Joi.string().min(2).max(100).when('type', {
      is: Joi.string().valid('create_new'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    skillDescription: Joi.string().min(10).max(500).when('type', {
      is: 'create_new',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    currentLevel: Joi.number().integer().min(1).max(5).when('type', {
      is: 'upgrade',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    targetLevel: Joi.number().integer().min(1).max(5).required(),
    reason: Joi.string().min(10).max(500).required(),
    certificateFileId: Joi.string().uuid().optional(),
    approverId: Joi.string().uuid().optional()
  }),

  approve: Joi.object({
    comment: Joi.string().max(500).allow('', null).optional(),
    grantedLevel: Joi.number().integer().min(1).max(5).allow(null).optional(),
    modifiedSkillName: Joi.string().min(2).max(100).optional(),
    modifiedSkillDescription: Joi.string().max(500).optional()
  }),

  reject: Joi.object({
    comment: Joi.string().max(500).allow('', null).optional()
  })
};

const objectiveSchema = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().valid('personal_improvement', 'company_project').required(),
    skillId: Joi.string().uuid().allow(null).when('category', {
      is: 'personal_improvement',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    targetLevel: Joi.number().integer().min(1).max(5).when('category', {
      is: 'personal_improvement',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    deadline: Joi.date().iso().required(),
    assigneeType: Joi.string().valid('USER', 'TEAM').required(),
    userId: Joi.string().uuid().when('assigneeType', {
      is: 'USER',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    teamId: Joi.string().uuid().when('assigneeType', {
      is: 'TEAM',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    teamMemberAssignments: Joi.array().items(Joi.object({
      userId: Joi.string().uuid().required(),
      partialTargetName: Joi.string().min(5).max(200).required(),
      individualDescription: Joi.string().max(1000).allow('', null).optional(),
      individualFile: Joi.any().optional(), // Allow any type since we're not using it yet
      individualDeadline: Joi.date().iso().required()
    })).when('assigneeType', {
      is: 'TEAM',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().valid('personal_improvement', 'company_project').optional(),
    skillId: Joi.string().uuid().allow(null).optional(),
    targetLevel: Joi.number().integer().min(1).max(5).optional(),
    deadline: Joi.date().iso().optional(),
    progress: Joi.number().integer().min(0).max(100).optional(),
    status: Joi.string().valid('not_started', 'in_progress', 'completed', 'overdue').optional(),
    assigneeType: Joi.string().valid('USER', 'TEAM').optional(),
    userId: Joi.string().uuid().optional(),
    teamId: Joi.string().uuid().optional(),
    teamMemberAssignments: Joi.array().items(Joi.object({
      userId: Joi.string().uuid().required(),
      partialTargetName: Joi.string().min(5).max(200).required(),
      individualDescription: Joi.string().max(1000).allow('', null).optional(),
      individualFile: Joi.any().optional(), // Allow any type since we're not using it yet
      individualDeadline: Joi.date().iso().required()
    })).optional()
  }),

  updateProgress: Joi.object({
    progress: Joi.number().integer().min(0).max(100).required(),
    notes: Joi.string().min(10).max(500).required(),
    proofFileId: Joi.string().uuid().required()
  })
};

const teamSchema = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    departmentIds: Joi.array().items(Joi.string().uuid()).optional(),
    managerId: Joi.string().uuid().allow(null).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    departmentIds: Joi.array().items(Joi.string().uuid()).optional(),
    managerId: Joi.string().uuid().allow(null).optional()
  })
};

const departmentSchema = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional()
  })
};

module.exports = {
  userSchema,
  skillSchema,
  skillRequestSchema,
  objectiveSchema,
  teamSchema,
  departmentSchema
};


