const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 JWT decoded userId:', decoded.userId, 'type:', typeof decoded.userId);
    
    // Get user from database with team and department information
    const result = await query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.job_title, u.status
      FROM users u
      WHERE u.id = $1
    `, [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(401).json({ message: 'User account is inactive' });
    }

    // Set user object without team/department info (will be fetched separately if needed)
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      jobTitle: user.job_title,
      status: user.status
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('🔍 Role check - User:', req.user, 'Required roles:', roles);
    if (!req.user) {
      console.log('❌ No user found in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      console.log('❌ Insufficient permissions - User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    console.log('✅ Role check passed');
    next();
  };
};

const requireAdmin = requireRole(['admin']);
const requireManager = requireRole(['admin', 'manager']);
const requireEmployee = requireRole(['admin', 'manager', 'employee']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireManager,
  requireEmployee
};




