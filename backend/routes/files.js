const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('🔍 File filter checking:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // For proof of progress, allow common file types
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv', 'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ File type accepted:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ File type rejected:', file.mimetype);
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

// Upload file
router.post('/upload', authenticateToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
      }
      if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: 'File upload error: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('📤 File upload request received');
    console.log('👤 User ID:', req.user.id);
    console.log('📄 File object:', req.file);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const { originalname, filename, mimetype, size, path: filePath } = req.file;
    
    console.log('📊 File details:', {
      originalname,
      filename,
      mimetype,
      size,
      path: filePath
    });

    // Save file metadata to database
    const result = await query(`
      INSERT INTO files (owner_user_id, original_name, mime_type, size_bytes, storage_key)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, original_name, mime_type, size_bytes, storage_key, created_at
    `, [userId, originalname, mimetype, size, filename]);

    const file = result.rows[0];
    console.log('💾 File saved to database:', file.id);

    // Get the base URL from the request
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const response = {
      id: file.id,
      originalName: file.original_name,
      mimeType: file.mime_type,
      sizeBytes: parseInt(file.size_bytes),
      storageKey: file.storage_key,
      createdAt: file.created_at,
      url: `${baseUrl}/api/files/${file.id}`,
      profileUrl: `${baseUrl}/uploads/${file.storage_key}`
    };
    
    console.log('✅ File upload successful, sending response:', response);
    res.status(201).json(response);
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Public route for profile pictures (no authentication required)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT f.*, u.first_name, u.last_name
      FROM files f
      LEFT JOIN users u ON f.owner_user_id = u.id
      WHERE f.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = result.rows[0];

    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', file.storage_key);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Get profile file error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get file by ID (requires authentication)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('🔍 File download request:', { fileId: id, userId, userRole: req.user.role });

    const result = await query(`
      SELECT f.*, u.first_name, u.last_name
      FROM files f
      LEFT JOIN users u ON f.owner_user_id = u.id
      WHERE f.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      console.log('❌ File not found in database');
      return res.status(404).json({ message: 'File not found' });
    }

    const file = result.rows[0];
    console.log('📋 File details from database:', {
      id: file.id,
      originalName: file.original_name,
      storageKey: file.storage_key,
      ownerUserId: file.owner_user_id,
      mimeType: file.mime_type
    });

    // Check if user has access to this file
    // Allow access if:
    // 1. User is the file owner
    // 2. User is an admin
    // 3. User is a manager and this file is linked to any skill request or progress update
    // 4. User is an employee and this file is linked to their own skill request or progress update
    if (file.owner_user_id !== userId && req.user.role !== 'admin') {
      if (req.user.role === 'manager') {
        // Check if this file is a certificate for any skill request
        const skillRequestResult = await query(`
          SELECT id FROM skill_requests 
          WHERE certificate_file_id = $1
        `, [id]);
        
        // Check if this file is a proof file for any objective progress update
        const progressUpdateResult = await query(`
          SELECT ou.id FROM objective_updates ou
          WHERE ou.proof_file_id = $1
        `, [id]);
        
        console.log('🔍 Manager access check:', {
          isManager: req.user.role === 'manager',
          skillRequestsFound: skillRequestResult.rows.length,
          progressUpdatesFound: progressUpdateResult.rows.length
        });
        
        if (skillRequestResult.rows.length === 0 && progressUpdateResult.rows.length === 0) {
          console.log('❌ Manager access denied - no skill request or progress update found');
          return res.status(403).json({ message: 'Access denied' });
        }
      } else if (req.user.role === 'employee') {
        // Check if this file is a certificate for the employee's own skill request
        const skillRequestResult = await query(`
          SELECT id FROM skill_requests 
          WHERE certificate_file_id = $1 AND requester_user_id = $2
        `, [id, userId]);
        
        // Check if this file is a proof file for the employee's own objective progress update
        const progressUpdateResult = await query(`
          SELECT ou.id FROM objective_updates ou
          INNER JOIN objective_assignments oa ON ou.objective_id = oa.objective_id
          WHERE ou.proof_file_id = $1 AND oa.assignee_type = 'USER' AND oa.user_id = $2
        `, [id, userId]);
        
        console.log('🔍 Employee access check:', {
          isEmployee: req.user.role === 'employee',
          skillRequestsFound: skillRequestResult.rows.length,
          progressUpdatesFound: progressUpdateResult.rows.length,
          userId
        });
        
        if (skillRequestResult.rows.length === 0 && progressUpdateResult.rows.length === 0) {
          console.log('❌ Employee access denied - no own skill request or progress update found');
          return res.status(403).json({ message: 'Access denied' });
        }
      } else {
        console.log('❌ Access denied - not owner, admin, manager, or employee with access');
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', file.storage_key);
    console.log('📁 File path:', filePath);

    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found on disk');
      return res.status(404).json({ message: 'File not found on disk' });
    }

    console.log('✅ File found on disk, sending file...');
    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    
    // Use absolute path and add error handling
    const absolutePath = path.resolve(filePath);
    console.log('📁 Absolute file path:', absolutePath);
    
    res.sendFile(absolutePath, (err) => {
      if (err) {
        console.error('❌ Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error sending file', error: err.message });
        }
      } else {
        console.log('✅ File sent successfully');
      }
    });
  } catch (error) {
    console.error('❌ Get file error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's files
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;
    const userId = req.user.id;

    // Get files count
    const countQuery = `
      SELECT COUNT(*) 
      FROM files 
      WHERE owner_user_id = $1
    `;
    const countResult = await query(countQuery, [userId]);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get files
    const filesQuery = `
      SELECT id, original_name, mime_type, size_bytes, storage_key, created_at
      FROM files 
      WHERE owner_user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const filesResult = await query(filesQuery, [userId, pageSize, offset]);

    // Get the base URL from the request
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const files = filesResult.rows.map(file => ({
      id: file.id,
      originalName: file.original_name,
      mimeType: file.mime_type,
      sizeBytes: parseInt(file.size_bytes),
      storageKey: file.storage_key,
      createdAt: file.created_at,
      url: `${baseUrl}/api/files/${file.id}`
    }));

    res.json({
      files,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete file
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get file info
    const fileResult = await query(`
      SELECT storage_key, owner_user_id FROM files WHERE id = $1
    `, [id]);

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Check if user has permission to delete
    if (file.owner_user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete file from disk
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', file.storage_key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await query('DELETE FROM files WHERE id = $1', [id]);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;


