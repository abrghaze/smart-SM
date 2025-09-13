const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Email configuration
const emailConfig = {
  from: {
    email: process.env.FROM_EMAIL || 'noreply@smartskillmatrix.com',
    name: process.env.FROM_NAME || 'Smart Skill Matrix'
  },
  replyTo: process.env.REPLY_TO || 'support@smartskillmatrix.com',
  mainAppUrl: process.env.MAIN_APP_URL || 'http://localhost:3000'
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('📧 Email Service: SMTP configuration verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email Service: SMTP configuration error:', error.message);
    return false;
  }
};

module.exports = {
  createTransporter,
  emailConfig,
  testEmailConfig
};







