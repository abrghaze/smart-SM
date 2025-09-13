# Smart Skill Matrix 🚀

A comprehensive skill management and objective tracking system built with React, Node.js, and PostgreSQL. This application helps organizations manage employee skills, track objectives, and monitor progress through an intuitive dashboard.

## 🌟 Features

### 👥 **User Management**
- **Multi-role system**: Admin, Manager, Employee roles with specific permissions
- **User profiles**: Complete user management with profile pictures and job titles
- **Department & Team management**: Hierarchical organization structure
- **Authentication**: Secure JWT-based authentication system

### 🎯 **Objective Management**
- **Individual & Team objectives**: Create and track personal and team goals
- **Progress tracking**: Real-time progress updates with approval workflow
- **Deadline management**: Automatic late objective detection and notifications
- **Job title objectives**: Skill-based objectives tied to job positions

### 🛠️ **Skill Management**
- **Skill database**: Comprehensive skill catalog with levels (1-5)
- **Skill requests**: Employees can request skill improvements
- **Approval workflow**: Manager approval system for skill requests
- **Skill gap analysis**: Identify missing skills for job positions

### 📊 **Analytics & Reporting**
- **Dashboard analytics**: Comprehensive overview for all user types
- **Progress tracking**: Visual progress indicators and charts
- **Skill gap analysis**: Identify training needs and skill deficiencies
- **Performance metrics**: Track individual and team performance

### 🔔 **Notification System**
- **Real-time notifications**: In-app notification system
- **Email notifications**: Automated email alerts for important events
- **Late objective alerts**: Automatic notifications for overdue objectives
- **Progress updates**: Notifications for objective completions and approvals

### 📁 **File Management**
- **Certificate uploads**: Support for skill certificates and documents
- **File attachments**: Attach files to objectives and skill requests
- **Secure storage**: Protected file storage with access controls

## 🏗️ **Architecture**

### **Frontend (React)**
- **Framework**: React 18 with modern hooks
- **Styling**: Tailwind CSS for responsive design
- **State Management**: Context API for global state
- **Routing**: React Router for navigation
- **HTTP Client**: Axios for API communication

### **Backend (Node.js)**
- **Framework**: Express.js with middleware
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT tokens with refresh mechanism
- **File Upload**: Multer for handling file uploads
- **Validation**: Joi for request validation
- **Cron Jobs**: Automated background tasks

### **Email Service (Microservice)**
- **Framework**: Express.js microservice
- **Email Engine**: Nodemailer with SMTP support
- **Templates**: Handlebars for email templating
- **Scheduling**: Automated email scheduling

### **Database (PostgreSQL)**
- **Schema**: Normalized database design
- **Relationships**: Complex relationships between users, skills, objectives
- **Indexing**: Optimized queries with proper indexing
- **Migrations**: Version-controlled database schema

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL 13+
- npm or yarn

### **Installation**

#### **Option 1: Automated Setup (Recommended)**
```bash
# Clone the repository
git clone https://github.com/yourusername/smart-skill-matrix.git
cd smart-skill-matrix

# Run automated setup (Linux/macOS)
chmod +x scripts/setup-env.sh
./scripts/setup-env.sh

# Run automated setup (Windows)
scripts\setup-env.bat

# Install dependencies and start
npm install
npm run setup:database
npm start
```

#### **Option 2: Manual Setup**
```bash
# Clone the repository
git clone https://github.com/yourusername/smart-skill-matrix.git
cd smart-skill-matrix

# Set up environment variables
cp env.example .env
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
cp mails/env.example mails/.env

# Install dependencies
npm install

# Configure database
createdb smart_skill_matrix
psql -d smart_skill_matrix -f database/migration.sql
psql -d smart_skill_matrix -f database/seed.sql

# Start the application
npm start
```

### **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Email Service: http://localhost:3001

> 📖 **For detailed setup instructions, see [SETUP.md](SETUP.md)**

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+
- PostgreSQL 13+
- npm or yarn

### **Installation**
```bash
# Clone the repository
git clone https://github.com/yourusername/smart-skill-matrix.git
cd smart-skill-matrix

# Set up environment variables
cp env.example .env
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
cp mails/env.example mails/.env

# Install dependencies
npm install

# Set up database
createdb smart_skill_matrix
psql -d smart_skill_matrix -f database/migration.sql
psql -d smart_skill_matrix -f database/seed.sql

# Start the application
npm start
```

### **Access the Application**
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Email Service**: http://localhost:3001

## 📚 **API Documentation**

### **Authentication Endpoints**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user info

### **User Management**
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Skills Management**
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Create skill (Admin)
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill

### **Objectives Management**
- `GET /api/objectives` - Get objectives
- `POST /api/objectives` - Create objective
- `PUT /api/objectives/:id` - Update objective
- `DELETE /api/objectives/:id` - Delete objective

### **Notifications**
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

For complete API documentation, see [API.md](API.md)

## 🧪 **Testing**

### **Running Tests**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:frontend
npm run test:backend
npm run test:email
```

### **Test Coverage**
- Unit tests for utility functions
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Email service tests

## 📖 **Documentation**

- [API Documentation](API.md) - Complete API reference
- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Testing Guide](TESTING.md) - Testing strategies and examples
- [Project Summary](PROJECT_SUMMARY.md) - High-level project overview

## 🔧 **Configuration**

### **Environment Variables**

#### **Backend (.env)**
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_skill_matrix
DB_USER=postgres
DB_PASSWORD=admin
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_SERVICE_URL=http://localhost:3001
```

#### **Email Service (.env)**
```env
NODE_ENV=development
PORT=3001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### **Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_EMAIL_SERVICE_URL=http://localhost:3001
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 **Team**

- **Backend Development**: Node.js, Express.js, PostgreSQL
- **Frontend Development**: React.js, Tailwind CSS
- **Email Service**: Nodemailer, Handlebars
- **Database Design**: PostgreSQL with complex relationships
- **DevOps**: Docker, Docker Compose

## 🆘 **Support**

For support, email support@smartskillmatrix.com or create an issue in the GitHub repository.

## 🔄 **Version History**

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added notification system
- **v1.2.0** - Added email microservice
- **v1.3.0** - Added late objectives monitoring
- **v1.4.0** - Added Docker support

---

**Made with ❤️ for better skill management**