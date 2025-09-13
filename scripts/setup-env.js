#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper functions for colored output
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.cyan}${colors.bright}${msg}${colors.reset}`)
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Generate random secret
function generateSecret() {
  return require('crypto').randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Copy file with replacements
function copyFileWithReplacements(source, destination, replacements = {}) {
  try {
    let content = fs.readFileSync(source, 'utf8');
    
    // Apply replacements
    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      content = content.replace(regex, replacements[key]);
    });
    
    fs.writeFileSync(destination, content);
    return true;
  } catch (error) {
    log.error(`Failed to copy file: ${error.message}`);
    return false;
  }
}

// Setup main .env file
async function setupMainEnv() {
  log.info('Setting up main .env file...');
  
  if (fileExists('.env')) {
    const overwrite = await askQuestion('Main .env file already exists. Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      log.info('Skipping main .env file');
      return;
    }
  }
  
  const replacements = {
    'your_jwt_secret_here_change_this_in_production': generateSecret(),
    'your_refresh_secret_here_change_this_in_production': generateSecret(),
    'your_session_secret_here': generateSecret()
  };
  
  if (copyFileWithReplacements('env.example', '.env', replacements)) {
    log.success('Main .env file created with random secrets');
  }
}

// Setup backend .env file
async function setupBackendEnv() {
  log.info('Setting up backend .env file...');
  
  if (fileExists('backend/.env')) {
    const overwrite = await askQuestion('Backend .env file already exists. Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      log.info('Skipping backend .env file');
      return;
    }
  }
  
  const replacements = {
    'your_jwt_secret_here_change_this_in_production': generateSecret(),
    'your_refresh_secret_here_change_this_in_production': generateSecret(),
    'your_session_secret_here': generateSecret()
  };
  
  if (copyFileWithReplacements('backend/env.example', 'backend/.env', replacements)) {
    log.success('Backend .env file created with random secrets');
  }
}

// Setup frontend .env file
async function setupFrontendEnv() {
  log.info('Setting up frontend .env file...');
  
  if (fileExists('frontend/.env')) {
    const overwrite = await askQuestion('Frontend .env file already exists. Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      log.info('Skipping frontend .env file');
      return;
    }
  }
  
  if (copyFileWithReplacements('frontend/env.example', 'frontend/.env')) {
    log.success('Frontend .env file created');
  }
}

// Setup email service .env file
async function setupEmailEnv() {
  log.info('Setting up email service .env file...');
  
  if (fileExists('mails/.env')) {
    const overwrite = await askQuestion('Email service .env file already exists. Do you want to overwrite it? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      log.info('Skipping email service .env file');
      return;
    }
  }
  
  if (copyFileWithReplacements('mails/env.example', 'mails/.env')) {
    log.success('Email service .env file created');
  }
}

// Interactive configuration
async function interactiveConfig() {
  log.info('Starting interactive configuration...');
  
  // Database configuration
  log.info('Database Configuration:');
  const dbHost = await askQuestion('Database host (default: localhost): ') || 'localhost';
  const dbPort = await askQuestion('Database port (default: 5432): ') || '5432';
  const dbName = await askQuestion('Database name (default: smart_skill_matrix): ') || 'smart_skill_matrix';
  const dbUser = await askQuestion('Database user (default: postgres): ') || 'postgres';
  const dbPassword = await askQuestion('Database password (default: admin): ') || 'admin';
  
  // Update .env files with database configuration
  const dbReplacements = {
    'DB_HOST=localhost': `DB_HOST=${dbHost}`,
    'DB_PORT=5432': `DB_PORT=${dbPort}`,
    'DB_NAME=smart_skill_matrix': `DB_NAME=${dbName}`,
    'DB_USER=postgres': `DB_USER=${dbUser}`,
    'DB_PASSWORD=admin': `DB_PASSWORD=${dbPassword}`
  };
  
  if (fileExists('.env')) {
    copyFileWithReplacements('.env', '.env', dbReplacements);
  }
  
  if (fileExists('backend/.env')) {
    copyFileWithReplacements('backend/.env', 'backend/.env', dbReplacements);
  }
  
  // Email configuration
  log.info('Email Configuration:');
  const smtpHost = await askQuestion('SMTP host (default: smtp.gmail.com): ') || 'smtp.gmail.com';
  const smtpPort = await askQuestion('SMTP port (default: 587): ') || '587';
  const smtpUser = await askQuestion('Email address: ');
  const smtpPass = await askQuestion('Email password/app password: ');
  
  if (smtpUser && smtpPass) {
    const emailReplacements = {
      'SMTP_HOST=smtp.gmail.com': `SMTP_HOST=${smtpHost}`,
      'SMTP_PORT=587': `SMTP_PORT=${smtpPort}`,
      'your_email@gmail.com': smtpUser,
      'your_app_password': smtpPass,
      'FROM_EMAIL=your_email@gmail.com': `FROM_EMAIL=${smtpUser}`
    };
    
    if (fileExists('mails/.env')) {
      copyFileWithReplacements('mails/.env', 'mails/.env', emailReplacements);
    }
  }
  
  log.success('Configuration updated successfully');
}

// Main setup function
async function main() {
  log.header('🚀 Smart Skill Matrix - Environment Setup');
  log.header('========================================');
  
  // Check if we're in the right directory
  if (!fileExists('package.json') || !fileExists('backend') || !fileExists('frontend') || !fileExists('mails')) {
    log.error('Please run this script from the root directory of the Smart Skill Matrix project');
    process.exit(1);
  }
  
  log.info('This script will help you set up your environment configuration files.');
  
  // Setup all .env files
  await setupMainEnv();
  await setupBackendEnv();
  await setupFrontendEnv();
  await setupEmailEnv();
  
  // Ask for interactive configuration
  const interactive = await askQuestion('Do you want to configure database and email settings interactively? (y/N): ');
  if (interactive.toLowerCase() === 'y') {
    await interactiveConfig();
  }
  
  log.success('Environment setup completed!');
  log.info('Next steps:');
  log.info('1. Review the .env files and update any settings as needed');
  log.info('2. Set up your PostgreSQL database');
  log.info('3. Run: npm install');
  log.info('4. Run: npm run setup:database');
  log.info('5. Run: npm start');
  log.warning('Important: Update the email configuration in mails/.env with your actual email credentials');
  
  rl.close();
}

// Run main function
main().catch((error) => {
  log.error(`Setup failed: ${error.message}`);
  process.exit(1);
});
