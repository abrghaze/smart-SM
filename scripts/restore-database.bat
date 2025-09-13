@echo off
REM Database Restore Script for Smart Skill Matrix (Windows)
REM This script restores the database from a backup file

setlocal enabledelayedexpansion

REM Configuration
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_NAME set DB_NAME=smart_skill_matrix
if not defined DB_USER set DB_USER=postgres
if not defined DB_PASSWORD set DB_PASSWORD=admin

REM Check if backup file is provided
if "%~1"=="" (
    echo ❌ Error: No backup file provided
    echo Usage: %0 ^<backup_file^>
    echo Example: %0 backups\backup_20240101_120000.sql
    exit /b 1
)

set BACKUP_FILE=%~1

REM Check if backup file exists
if not exist "%BACKUP_FILE%" (
    echo ❌ Error: Backup file '%BACKUP_FILE%' not found
    exit /b 1
)

echo 🗄️  Restoring database from backup...
echo Database: %DB_NAME%
echo Host: %DB_HOST%:%DB_PORT%
echo User: %DB_USER%
echo Backup file: %BACKUP_FILE%
echo.

REM Set password for psql
set PGPASSWORD=%DB_PASSWORD%

REM Confirm restoration
set /p CONFIRM="⚠️  This will overwrite the current database. Are you sure? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ Restoration cancelled
    exit /b 1
)

REM Drop and recreate database
echo 🗑️  Dropping existing database...
psql -h "%DB_HOST%" -p %DB_PORT% -U "%DB_USER%" -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;"

echo 🏗️  Creating new database...
psql -h "%DB_HOST%" -p %DB_PORT% -U "%DB_USER%" -d postgres -c "CREATE DATABASE %DB_NAME%;"

REM Restore from backup
echo 📦 Restoring from backup...
if "%BACKUP_FILE:~-5%"==".dump" (
    REM Restore from custom format dump
    pg_restore -h "%DB_HOST%" -p %DB_PORT% -U "%DB_USER%" -d "%DB_NAME%" --verbose --no-password "%BACKUP_FILE%"
) else (
    REM Restore from SQL dump
    psql -h "%DB_HOST%" -p %DB_PORT% -U "%DB_USER%" -d "%DB_NAME%" < "%BACKUP_FILE%"
)

echo.
echo ✅ Database restored successfully!
echo.
echo 🔧 To verify the restoration:
echo   psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "\dt"
echo.
echo 🐳 To restore in Docker:
echo   docker-compose exec -T postgres psql -U %DB_USER% -d %DB_NAME% ^< %BACKUP_FILE%

pause
