@echo off
REM Smart Skill Matrix - Environment Setup Script for Windows
REM This script helps users set up their environment configuration

echo 🚀 Smart Skill Matrix - Environment Setup
echo ========================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the root directory of the Smart Skill Matrix project
    pause
    exit /b 1
)

if not exist "backend" (
    echo ❌ Backend directory not found
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Frontend directory not found
    pause
    exit /b 1
)

if not exist "mails" (
    echo ❌ Mails directory not found
    pause
    exit /b 1
)

echo.
echo ℹ️  This script will help you set up your environment configuration files.
echo.

REM Setup main .env file
echo ℹ️  Setting up main .env file...
if exist ".env" (
    set /p overwrite="⚠️  Main .env file already exists. Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo ℹ️  Skipping main .env file
        goto :backend_env
    )
)
copy env.example .env
echo ✅ Main .env file created

:backend_env
REM Setup backend .env file
echo ℹ️  Setting up backend .env file...
if exist "backend\.env" (
    set /p overwrite="⚠️  Backend .env file already exists. Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo ℹ️  Skipping backend .env file
        goto :frontend_env
    )
)
copy backend\env.example backend\.env
echo ✅ Backend .env file created

:frontend_env
REM Setup frontend .env file
echo ℹ️  Setting up frontend .env file...
if exist "frontend\.env" (
    set /p overwrite="⚠️  Frontend .env file already exists. Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo ℹ️  Skipping frontend .env file
        goto :email_env
    )
)
copy frontend\env.example frontend\.env
echo ✅ Frontend .env file created

:email_env
REM Setup email service .env file
echo ℹ️  Setting up email service .env file...
if exist "mails\.env" (
    set /p overwrite="⚠️  Email service .env file already exists. Do you want to overwrite it? (y/N): "
    if /i not "%overwrite%"=="y" (
        echo ℹ️  Skipping email service .env file
        goto :interactive_config
    )
)
copy mails\env.example mails\.env
echo ✅ Email service .env file created

:interactive_config
REM Ask for interactive configuration
echo.
set /p interactive="Do you want to configure database and email settings interactively? (y/N): "
if /i not "%interactive%"=="y" goto :end

echo.
echo ℹ️  Interactive Configuration:
echo.

REM Database configuration
set /p DB_HOST="Database host (default: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Database port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_NAME="Database name (default: smart_skill_matrix): "
if "%DB_NAME%"=="" set DB_NAME=smart_skill_matrix

set /p DB_USER="Database user (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASSWORD="Database password (default: admin): "
if "%DB_PASSWORD%"=="" set DB_PASSWORD=admin

REM Update .env files with database configuration
if exist ".env" (
    powershell -Command "(Get-Content .env) -replace 'DB_HOST=localhost', 'DB_HOST=%DB_HOST%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_PORT=5432', 'DB_PORT=%DB_PORT%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_NAME=smart_skill_matrix', 'DB_NAME=%DB_NAME%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_USER=postgres', 'DB_USER=%DB_USER%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'DB_PASSWORD=admin', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content .env"
)

if exist "backend\.env" (
    powershell -Command "(Get-Content backend\.env) -replace 'DB_HOST=localhost', 'DB_HOST=%DB_HOST%' | Set-Content backend\.env"
    powershell -Command "(Get-Content backend\.env) -replace 'DB_PORT=5432', 'DB_PORT=%DB_PORT%' | Set-Content backend\.env"
    powershell -Command "(Get-Content backend\.env) -replace 'DB_NAME=smart_skill_matrix', 'DB_NAME=%DB_NAME%' | Set-Content backend\.env"
    powershell -Command "(Get-Content backend\.env) -replace 'DB_USER=postgres', 'DB_USER=%DB_USER%' | Set-Content backend\.env"
    powershell -Command "(Get-Content backend\.env) -replace 'DB_PASSWORD=admin', 'DB_PASSWORD=%DB_PASSWORD%' | Set-Content backend\.env"
)

REM Email configuration
echo.
set /p SMTP_HOST="SMTP host (default: smtp.gmail.com): "
if "%SMTP_HOST%"=="" set SMTP_HOST=smtp.gmail.com

set /p SMTP_PORT="SMTP port (default: 587): "
if "%SMTP_PORT%"=="" set SMTP_PORT=587

set /p SMTP_USER="Email address: "

set /p SMTP_PASS="Email password/app password: "

REM Update email service .env file
if exist "mails\.env" (
    powershell -Command "(Get-Content mails\.env) -replace 'SMTP_HOST=smtp.gmail.com', 'SMTP_HOST=%SMTP_HOST%' | Set-Content mails\.env"
    powershell -Command "(Get-Content mails\.env) -replace 'SMTP_PORT=587', 'SMTP_PORT=%SMTP_PORT%' | Set-Content mails\.env"
    powershell -Command "(Get-Content mails\.env) -replace 'your_email@gmail.com', '%SMTP_USER%' | Set-Content mails\.env"
    powershell -Command "(Get-Content mails\.env) -replace 'your_app_password', '%SMTP_PASS%' | Set-Content mails\.env"
    powershell -Command "(Get-Content mails\.env) -replace 'FROM_EMAIL=your_email@gmail.com', 'FROM_EMAIL=%SMTP_USER%' | Set-Content mails\.env"
)

echo ✅ Configuration updated successfully

:end
echo.
echo ✅ Environment setup completed!
echo.
echo ℹ️  Next steps:
echo 1. Review the .env files and update any settings as needed
echo 2. Set up your PostgreSQL database
echo 3. Run: npm install
echo 4. Run: npm run setup:database
echo 5. Run: npm start
echo.
echo ⚠️  Important: Update the email configuration in mails\.env with your actual email credentials
echo.
pause
