# 🧪 Testing Guide

This guide covers testing strategies and examples for the Smart Skill Matrix application.

## 🎯 Testing Overview

The application includes comprehensive testing across multiple layers:
- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoint and service integration testing
- **End-to-End Tests**: Complete user workflow testing
- **Performance Tests**: Load and stress testing

## 🚀 Quick Start

### **Run All Tests**
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### **Run Specific Test Suites**
```bash
# Frontend tests
npm run test:frontend

# Backend tests
npm run test:backend

# Email service tests
npm run test:email

# Integration tests
npm run test:integration
```

## 🔧 Test Configuration

### **Frontend Testing (Jest + React Testing Library)**

**Setup:**
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

**Example Test:**
```javascript
// frontend/src/components/__tests__/Login.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../auth/Login';

describe('Login Component', () => {
  test('renders login form', () => {
    render(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    render(<Login />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Assert expected behavior
  });
});
```

### **Backend Testing (Jest + Supertest)**

**Setup:**
```bash
cd backend
npm install --save-dev jest supertest
```

**Example Test:**
```javascript
// backend/tests/auth.test.js
const request = require('supertest');
const app = require('../server');

describe('Authentication Endpoints', () => {
  test('POST /api/auth/login - should login user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  test('POST /api/auth/login - should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
  });
});
```

### **Email Service Testing**

**Example Test:**
```javascript
// mails/tests/emailService.test.js
const emailService = require('../services/emailService');

describe('Email Service', () => {
  test('should send notification email', async () => {
    const emailData = {
      recipientEmail: 'test@example.com',
      recipientName: 'Test User',
      subject: 'Test Notification',
      content: 'This is a test notification'
    };

    const result = await emailService.sendNotification(emailData);
    expect(result.success).toBe(true);
  });
});
```

## 📊 Test Categories

### **1. Unit Tests**

**Purpose**: Test individual functions and components in isolation.

**Examples**:
- Utility function testing
- Component rendering
- State management
- Data validation

**Location**: `*/tests/unit/`

### **2. Integration Tests**

**Purpose**: Test interaction between different parts of the system.

**Examples**:
- API endpoint testing
- Database operations
- Service integration
- Authentication flow

**Location**: `*/tests/integration/`

### **3. End-to-End Tests**

**Purpose**: Test complete user workflows from start to finish.

**Examples**:
- User registration and login
- Creating and managing objectives
- Skill request workflow
- Notification system

**Location**: `*/tests/e2e/`

### **4. Performance Tests**

**Purpose**: Test system performance under various loads.

**Examples**:
- Load testing
- Stress testing
- Memory usage
- Response times

**Location**: `*/tests/performance/`

## 🔍 Test Examples

### **Frontend Component Testing**

```javascript
// Testing a skill card component
import { render, screen } from '@testing-library/react';
import SkillCard from '../SkillCard';

describe('SkillCard', () => {
  const mockSkill = {
    id: '1',
    name: 'React',
    level: 3,
    category: 'Frontend'
  };

  test('displays skill information correctly', () => {
    render(<SkillCard skill={mockSkill} />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const mockOnClick = jest.fn();
    render(<SkillCard skill={mockSkill} onClick={mockOnClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledWith(mockSkill);
  });
});
```

### **API Endpoint Testing**

```javascript
// Testing objectives API
describe('Objectives API', () => {
  let authToken;

  beforeAll(async () => {
    // Login to get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = response.body.token;
  });

  test('GET /api/objectives - should return user objectives', async () => {
    const response = await request(app)
      .get('/api/objectives')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/objectives - should create new objective', async () => {
    const objectiveData = {
      title: 'Learn React',
      description: 'Master React fundamentals',
      category: 'learning',
      deadline: '2024-12-31'
    };

    const response = await request(app)
      .post('/api/objectives')
      .set('Authorization', `Bearer ${authToken}`)
      .send(objectiveData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### **Database Testing**

```javascript
// Testing database operations
const { Pool } = require('pg');

describe('Database Operations', () => {
  let pool;

  beforeAll(() => {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'smart_skill_matrix_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin'
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('should create user', async () => {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['test@example.com', 'hashedpassword', 'Test', 'User', 'employee']
    );

    expect(result.rows[0]).toHaveProperty('id');
  });
});
```

## 🎭 Mocking and Test Data

### **API Mocking**

```javascript
// Mock external API calls
jest.mock('axios');

const axios = require('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('External API Integration', () => {
  test('should handle external API response', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { success: true, message: 'External API response' }
    });

    const result = await externalApiCall();
    expect(result.success).toBe(true);
  });
});
```

### **Database Mocking**

```javascript
// Mock database operations
jest.mock('../config/database');

const mockQuery = jest.fn();
require('../config/database').query = mockQuery;

describe('Service with Database', () => {
  test('should handle database operations', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: '1', name: 'Test' }]
    });

    const result = await service.getData();
    expect(result).toHaveLength(1);
  });
});
```

## 📈 Test Coverage

### **Coverage Configuration**

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### **Coverage Reports**

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## 🚀 Continuous Integration

### **GitHub Actions Workflow**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run tests
        run: npm test
        
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

## 🔧 Test Utilities

### **Test Helpers**

```javascript
// tests/helpers/testHelpers.js
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'employee',
  ...overrides
});

export const createMockObjective = (overrides = {}) => ({
  id: '1',
  title: 'Test Objective',
  description: 'Test Description',
  category: 'learning',
  deadline: '2024-12-31',
  progress: 0,
  ...overrides
});
```

### **Test Database Setup**

```javascript
// tests/setup/testDatabase.js
const { Pool } = require('pg');

const setupTestDatabase = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'smart_skill_matrix_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin'
  });

  // Clean database
  await pool.query('TRUNCATE TABLE users, objectives, skills CASCADE');
  
  return pool;
};

module.exports = { setupTestDatabase };
```

## 📊 Performance Testing

### **Load Testing with Artillery**

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/objectives"
          headers:
            Authorization: "Bearer {{ token }}"
```

```bash
# Run load test
artillery run artillery-config.yml
```

## 🐛 Debugging Tests

### **Debug Mode**

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test with debug
npm test -- --testNamePattern="Login" --verbose
```

### **Test Debugging Tips**

1. **Use `console.log`** for debugging test execution
2. **Check test data** with `screen.debug()`
3. **Verify async operations** with proper `await`
4. **Mock external dependencies** to isolate tests
5. **Use descriptive test names** for better error messages

## 📞 Test Support

For testing issues:
- Check test logs: `npm test -- --verbose`
- Debug specific tests: `npm test -- --testNamePattern="TestName"`
- Verify test environment: `npm run test:env`

For additional testing support, create an issue in the GitHub repository.