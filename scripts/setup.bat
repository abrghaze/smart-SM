@echo off
REM Smart Skill Matrix Setup Script for Windows
REM This script sets up the development environment for the Smart Skill Matrix application

echo 🚀 Setting up Smart Skill Matrix...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js is installed
node --version

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL is not installed. Please install PostgreSQL 12 or higher.
    pause
    exit /b 1
)

echo [SUCCESS] PostgreSQL is installed

REM Install dependencies
echo [INFO] Installing dependencies...

REM Root dependencies
if exist "package.json" (
    npm install
    echo [SUCCESS] Root dependencies installed
)

REM Backend dependencies
if exist "backend" (
    cd backend
    npm install
    echo [SUCCESS] Backend dependencies installed
    cd ..
)

REM Frontend dependencies
if exist "frontend" (
    cd frontend
    npm install
    echo [SUCCESS] Frontend dependencies installed
    cd ..
)

REM Email service dependencies
if exist "mails" (
    cd mails
    npm install
    echo [SUCCESS] Email service dependencies installed
    cd ..
)

REM Setup environment files
echo [INFO] Setting up environment files...

REM Backend .env
if not exist "backend\.env" (
    if exist "backend\env.example" (
        copy "backend\env.example" "backend\.env" >nul
        echo [SUCCESS] Backend .env file created from example
        echo [WARNING] Please edit backend\.env with your database credentials
    ) else (
        echo [WARNING] Backend env.example not found
    )
) else (
    echo [SUCCESS] Backend .env file already exists
)

REM Email service .env
if not exist "mails\.env" (
    if exist "mails\env.example" (
        copy "mails\env.example" "mails\.env" >nul
        echo [SUCCESS] Email service .env file created from example
        echo [WARNING] Please edit mails\.env with your email service credentials
    ) else (
        echo [WARNING] Email service env.example not found
    )
) else (
    echo [SUCCESS] Email service .env file already exists
)

REM Setup database
echo [INFO] Setting up database...

REM Check if database exists
psql -lqt | findstr "smart_skill_matrix" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Creating database...
    createdb smart_skill_matrix
    echo [SUCCESS] Database smart_skill_matrix created
) else (
    echo [SUCCESS] Database smart_skill_matrix already exists
)

REM Run migrations
if exist "database\migration.sql" (
    echo [INFO] Running database migrations...
    psql -d smart_skill_matrix -f database\migration.sql
    echo [SUCCESS] Database migrations completed
)

REM Seed database
if exist "database\seed.sql" (
    echo [INFO] Seeding database...
    psql -d smart_skill_matrix -f database\seed.sql
    echo [SUCCESS] Database seeded with sample data
)

REM Create uploads directory
echo [INFO] Creating uploads directory...
if not exist "backend\uploads" (
    mkdir "backend\uploads"
    echo [SUCCESS] Uploads directory created
) else (
    echo [SUCCESS] Uploads directory already exists
)

echo.
echo [SUCCESS] 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit backend\.env with your database credentials
echo 2. Edit mails\.env with your email service credentials (optional)
echo 3. Start the development servers:
echo    npm run dev
echo.
echo Demo accounts:
echo Admin: admin@smartskill.com / admin123
echo Manager: manager1@smartskill.com / 12345678
echo Employee: employee1@smartskill.com / 12345678
echo.
echo Happy coding! 🚀
pause
