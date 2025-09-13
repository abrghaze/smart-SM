# API Documentation 📚

Complete API reference for the Smart Skill Matrix application.

## 🔐 Authentication

All API endpoints require authentication except login and refresh token endpoints.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "employee"
  }
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## 👥 User Management

### Get All Users (Admin Only)
```http
GET /api/users
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "employee",
    "jobTitle": "Software Developer",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create User (Admin Only)
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "employee",
  "jobTitle": "Designer"
}
```

### Update User (Admin Only)
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "jobTitle": "Senior Designer"
}
```

### Delete User (Admin Only)
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

## 🏢 Department Management

### Get All Departments
```http
GET /api/departments
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "dept-id",
    "name": "Engineering",
    "description": "Software development team",
    "managerUserId": "manager-id",
    "managerName": "John Manager",
    "teamsCount": 3,
    "employeesCount": 15,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Department (Admin Only)
```http
POST /api/departments
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Marketing",
  "description": "Marketing and communications team",
  "managerUserId": "manager-id"
}
```

### Update Department (Admin Only)
```http
PUT /api/departments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Digital Marketing",
  "description": "Digital marketing and growth team"
}
```

### Delete Department (Admin Only)
```http
DELETE /api/departments/:id
Authorization: Bearer <token>
```

## 👥 Team Management

### Get All Teams
```http
GET /api/teams
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "team-id",
    "name": "Frontend Team",
    "description": "Frontend development team",
    "managerUserId": "manager-id",
    "managerName": "Jane Manager",
    "departmentId": "dept-id",
    "departmentName": "Engineering",
    "membersCount": 5,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Team (Admin Only)
```http
POST /api/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Backend Team",
  "description": "Backend development team",
  "managerUserId": "manager-id",
  "departmentId": "dept-id"
}
```

### Update Team (Admin Only)
```http
PUT /api/teams/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Backend Services Team",
  "description": "Backend services and APIs team"
}
```

### Delete Team (Admin Only)
```http
DELETE /api/teams/:id
Authorization: Bearer <token>
```

### Add Team Member (Admin/Manager)
```http
POST /api/teams/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-id"
}
```

### Remove Team Member (Admin/Manager)
```http
DELETE /api/teams/:id/members/:userId
Authorization: Bearer <token>
```

## 🎯 Skills Management

### Get All Skills
```http
GET /api/skills
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "skill-id",
    "name": "React.js",
    "description": "JavaScript library for building user interfaces",
    "category": "technical",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Skill (Admin Only)
```http
POST /api/skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Vue.js",
  "description": "Progressive JavaScript framework",
  "category": "technical"
}
```

### Update Skill (Admin Only)
```http
PUT /api/skills/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Vue.js 3",
  "description": "Progressive JavaScript framework v3"
}
```

### Delete Skill (Admin Only)
```http
DELETE /api/skills/:id
Authorization: Bearer <token>
```

### Get User Skills
```http
GET /api/users/:id/skills
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "user-skill-id",
    "skillId": "skill-id",
    "skillName": "React.js",
    "level": 4,
    "certified": true,
    "certificateUrl": "https://example.com/cert.pdf",
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
]
```

### Update User Skill
```http
PUT /api/users/:id/skills/:skillId
Authorization: Bearer <token>
Content-Type: application/json

{
  "level": 5,
  "certified": true
}
```

## 📋 Job Titles Management

### Get All Job Titles
```http
GET /api/job-titles
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "job-title-id",
    "title": "Senior Software Engineer",
    "description": "Senior level software engineering position",
    "requirements": [
      {
        "skillId": "skill-id",
        "skillName": "React.js",
        "requiredLevel": 4
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Job Title (Admin Only)
```http
POST /api/job-titles
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Full Stack Developer",
  "description": "Full stack development position",
  "requirements": [
    {
      "skillId": "skill-id",
      "requiredLevel": 3
    }
  ]
}
```

## 🎯 Objectives Management

### Get All Objectives
```http
GET /api/objectives
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "objective-id",
    "title": "Learn React Hooks",
    "description": "Master React hooks and functional components",
    "category": "skill_improvement",
    "deadline": "2024-12-31T23:59:59Z",
    "progress": 75,
    "status": "in_progress",
    "assigneeType": "USER",
    "assigneeId": "user-id",
    "assigneeName": "John Doe",
    "createdBy": "manager-id",
    "createdByName": "Jane Manager",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Objective (Manager/Admin)
```http
POST /api/objectives
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Complete React Course",
  "description": "Finish the advanced React course",
  "category": "skill_improvement",
  "deadline": "2024-12-31T23:59:59Z",
  "assigneeType": "USER",
  "assigneeId": "user-id"
}
```

### Update Objective (Manager/Admin)
```http
PUT /api/objectives/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Complete Advanced React Course",
  "progress": 50
}
```

### Delete Objective (Manager/Admin)
```http
DELETE /api/objectives/:id
Authorization: Bearer <token>
```

### Submit Progress Update
```http
POST /api/objectives/:id/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "progress": 80,
  "notes": "Completed most of the course, working on final project"
}
```

## 📝 Skill Requests

### Get Skill Requests
```http
GET /api/skill-requests
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "request-id",
    "userId": "user-id",
    "userName": "John Doe",
    "skillId": "skill-id",
    "skillName": "React.js",
    "requestedLevel": 4,
    "currentLevel": 2,
    "type": "upgrade",
    "status": "pending",
    "reason": "Need for upcoming project",
    "certificateFileId": "file-id",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Submit Skill Request
```http
POST /api/skill-requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "skillId": "skill-id",
  "requestedLevel": 4,
  "type": "upgrade",
  "reason": "Required for new project"
}
```

### Approve/Reject Skill Request (Manager)
```http
PUT /api/skill-requests/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "notes": "Great work on the certification!"
}
```

## 📊 Analytics

### Get Dashboard Stats
```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalUsers": 150,
  "totalTeams": 12,
  "totalSkills": 45,
  "activeObjectives": 89,
  "pendingRequests": 15,
  "completedObjectives": 234
}
```

### Get Team Performance
```http
GET /api/analytics/teams/:id/performance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "teamId": "team-id",
  "teamName": "Frontend Team",
  "averageSkillLevel": 3.2,
  "completedObjectives": 12,
  "pendingObjectives": 8,
  "skillDistribution": {
    "technical": 15,
    "behavioral": 8
  }
}
```

## 🔔 Notifications

### Get User Notifications
```http
GET /api/notifications
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "notification-id",
    "type": "skill_request_approved",
    "title": "Skill Request Approved",
    "body": "Your React.js skill upgrade request has been approved",
    "isRead": false,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

### Get Unread Count
```http
GET /api/notifications/unread-count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "count": 5
}
```

## 📁 File Management

### Upload File
```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

**Response:**
```json
{
  "id": "file-id",
  "originalName": "certificate.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1024000,
  "url": "https://example.com/files/file-id"
}
```

### Download File
```http
GET /api/files/:id/download
Authorization: Bearer <token>
```

### Delete File
```http
DELETE /api/files/:id
Authorization: Bearer <token>
```

## 🔍 Search

### Search Users
```http
GET /api/search/users?q=john&role=employee
Authorization: Bearer <token>
```

### Search Skills
```http
GET /api/search/skills?q=react&category=technical
Authorization: Bearer <token>
```

### Search Objectives
```http
GET /api/search/objectives?q=react&status=in_progress
Authorization: Bearer <token>
```

## 📧 Email Service

### Send Email
```http
POST /api/emails/send
Content-Type: application/json

{
  "type": "skill_request_submitted",
  "recipientEmail": "manager@example.com",
  "data": {
    "employeeName": "John Doe",
    "skillName": "React.js",
    "targetLevel": 4
  }
}
```

### Get Email Status
```http
GET /api/emails/status/:jobId
```

## 🚨 Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "details": {
    "email": "Email is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "UnauthorizedError",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "ForbiddenError",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "NotFoundError",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred"
}
```

## 🔧 Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **File upload endpoints**: 10 requests per minute per user

## 📝 Pagination

List endpoints support pagination:

```http
GET /api/users?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🔐 Authentication Headers

All authenticated requests must include:
```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Error description",
  "details": {...}
}
```

---

**API Version**: 1.0.0  
**Base URL**: `https://your-domain.com/api`  
**Last Updated**: January 2024
