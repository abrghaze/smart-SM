#!/bin/bash

# Database Restore Script for Smart Skill Matrix
# This script restores the database from a backup file

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-smart_skill_matrix}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-admin}

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: No backup file provided"
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/backup_20240101_120000.sql"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file '$BACKUP_FILE' not found"
    exit 1
fi

echo "🗄️  Restoring database from backup..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"
echo ""

# Set password for psql
export PGPASSWORD="$DB_PASSWORD"

# Confirm restoration
read -p "⚠️  This will overwrite the current database. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restoration cancelled"
    exit 1
fi

# Drop and recreate database
echo "🗑️  Dropping existing database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "🏗️  Creating new database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore from backup
echo "📦 Restoring from backup..."
if [[ "$BACKUP_FILE" == *.dump ]]; then
    # Restore from custom format dump
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --verbose --no-password "$BACKUP_FILE"
else
    # Restore from SQL dump
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

echo ""
echo "✅ Database restored successfully!"
echo ""
echo "🔧 To verify the restoration:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\\dt'"
echo ""
echo "🐳 To restore in Docker:"
echo "  docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
