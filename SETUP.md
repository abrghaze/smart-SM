# 🚀 Smart Skill Matrix - Setup Guide

This guide will help you set up the Smart Skill Matrix application on your local machine or server.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 13+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))
- **Docker** (optional, for containerized deployment)

## 🚀 Quick Setup

### **Option 1: Automated Setup (Recommended)**

#### **For Linux/macOS:**
```bash
# Clone the repository
git clone https://github.com/yourusername/smart-skill-matrix.git
cd smart-skill-matrix

# Run the automated setup script
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh

# Install dependencies
npm install

# Set up database
npm run setup:database

# Start the application
npm start
```

#### **For Windows:**
```cmd
REM Clone the repository
git clone https://github.com/yourusername/smart-skill-matrix.git
cd smart-skill-matrix

REM Run the automated setup script
scripts\setup-env.bat

REM Install dependencies
npm install

REM Set up database
npm run setup:database

REM Start the application
npm start
```

### **Option 2: Manual Setup**

#### **Step 1: Clone the Repository**
```bash
git clone https://github.com/yourusername/smart-skill-matrix.git
cd smart-skill-matrix
```

#### **Step 2: Set Up Environment Variables**

1. **Main Environment File:**
   ```bash
   cp env.example .env
   ```

2. **Backend Environment File:**
   ```bash
   cp backend/env.example backend/.env
   ```

3. **Frontend Environment File:**
   ```bash
   cp frontend/env.example frontend/.env
   ```

4. **Email Service Environment File:**
   ```bash
   cp mails/env.example mails/.env
   ```

#### **Step 3: Configure Environment Variables**

Edit the `.env` files with your configuration:

**Main `.env` file:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_skill_matrix
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secrets (generate strong secrets)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Email Service
EMAIL_SERVICE_URL=http://localhost:3001
```

**Backend `backend/.env` file:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_skill_matrix
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Email Service
EMAIL_SERVICE_URL=http://localhost:3001
```

**Frontend `frontend/.env` file:**
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000
REACT_APP_EMAIL_SERVICE_URL=http://localhost:3001
```

**Email Service `mails/.env` file:**
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Email Configuration
FROM_EMAIL=your_email@gmail.com
FROM_NAME=Smart Skill Matrix
```

#### **Step 4: Install Dependencies**
```bash
npm install
```

#### **Step 5: Set Up Database**

1. **Create PostgreSQL Database:**
   ```bash
   createdb smart_skill_matrix
   ```

2. **Run Database Migrations:**
   ```bash
   psql -d smart_skill_matrix -f database/migration.sql
   ```

3. **Seed Initial Data:**
   ```bash
   psql -d smart_skill_matrix -f database/seed.sql
   ```

#### **Step 6: Start the Application**
```bash
npm start
```

## 🐳 Docker Setup

### **Quick Start with Docker Compose**

1. **Clone and Navigate:**
   ```bash
   git clone https://github.com/yourusername/smart-skill-matrix.git
   cd smart-skill-matrix
   ```

2. **Configure Environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Access the Application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - Email Service: http://localhost:3001

## 🔧 Configuration Details

### **Database Configuration**

The application uses PostgreSQL as the primary database. Configure the following variables:

```env
DB_HOST=localhost          # Database host
DB_PORT=5432              # Database port
DB_NAME=smart_skill_matrix # Database name
DB_USER=postgres          # Database user
DB_PASSWORD=your_password # Database password
```

### **JWT Configuration**

Generate strong, unique secrets for JWT tokens:

```env
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

**Generate secrets using:**
```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
[System.Web.Security.Membership]::GeneratePassword(32, 0)
```

### **Email Configuration**

Configure SMTP settings for email notifications:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate an App Password
3. Use the App Password as `SMTP_PASS`

**For Other Providers:**
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your server's settings

## 🚀 Running the Application

### **Development Mode**
```bash
# Start all services
npm run dev

# Or start individually
npm run dev:backend
npm run dev:frontend
npm run dev:email
```

### **Production Mode**
```bash
# Build and start
npm run build
npm start
```

### **Docker Mode**
```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔍 Verification

### **Check Services are Running**

1. **Backend API:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Email Service:**
   ```bash
   curl http://localhost:3001/api/health
   ```

3. **Frontend:**
   Open http://localhost:3000 in your browser

### **Test Key Features**

1. **User Registration/Login**
2. **Create Objectives**
3. **Request Skills**
4. **Check Notifications**
5. **Test Email Notifications**

## 🐛 Troubleshooting

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check PostgreSQL is running
pg_ctl status

# Test connection
psql -h localhost -U postgres -d smart_skill_matrix
```

#### **Port Conflicts**
```bash
# Check port usage
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000
netstat -tulpn | grep :3001
```

#### **Permission Issues**
```bash
# Fix file permissions (Linux/macOS)
chmod -R 755 .
chown -R $USER:$USER .
```

#### **Node Modules Issues**
```bash
# Clean and reinstall
npm run clean
npm install
```

### **Logs and Debugging**

#### **View Logs**
```bash
# Backend logs
tail -f backend/logs/backend.log

# Email service logs
tail -f mails/logs/email.log

# Docker logs
docker-compose logs -f
```

#### **Debug Mode**
```bash
# Enable debug logging
NODE_ENV=development npm start
```

## 📚 Additional Resources

- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Testing Guide](TESTING.md)
- [Project Summary](PROJECT_SUMMARY.md)

## 🆘 Support

If you encounter issues:

1. **Check the logs** for error messages
2. **Verify configuration** in `.env` files
3. **Test database connection** manually
4. **Check port availability**
5. **Create an issue** in the GitHub repository

## 🎯 Next Steps

After successful setup:

1. **Explore the application** features
2. **Create test users** and data
3. **Configure email notifications**
4. **Set up monitoring** and logging
5. **Deploy to production** (see DEPLOYMENT.md)

---

**Happy coding! 🚀**
