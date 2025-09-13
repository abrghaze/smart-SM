#!/bin/bash

# Database Dump Script for Smart Skill Matrix
# This script creates a complete backup of the database including schema and data

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-smart_skill_matrix}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-admin}

# Create backup directory if it doesn't exist
mkdir -p backups

# Generate timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🗄️  Creating database backup..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Set password for psql
export PGPASSWORD="$DB_PASSWORD"

# Create full database dump (schema + data)
echo "📦 Creating full database dump..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=custom \
    --file="backups/smart_skill_matrix_full_$TIMESTAMP.dump"

# Create SQL dump (schema + data)
echo "📄 Creating SQL dump..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --format=plain \
    --file="backups/backup_$TIMESTAMP.sql"

# Create schema-only dump
echo "🏗️  Creating schema-only dump..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --schema-only \
    --format=plain \
    --file="backups/schema_$TIMESTAMP.sql"

# Create data-only dump
echo "📊 Creating data-only dump..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --verbose \
    --no-password \
    --data-only \
    --format=plain \
    --file="backups/data_$TIMESTAMP.sql"

# Get table row counts
echo "📈 Getting table row counts..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins as row_count
FROM pg_stat_user_tables 
ORDER BY tablename;
" > "backups/table_counts_$TIMESTAMP.txt"

echo ""
echo "✅ Database backup completed successfully!"
echo ""
echo "📁 Backup files created:"
echo "  - Full dump: backups/smart_skill_matrix_full_$TIMESTAMP.dump"
echo "  - SQL dump: backups/backup_$TIMESTAMP.sql"
echo "  - Schema only: backups/schema_$TIMESTAMP.sql"
echo "  - Data only: backups/data_$TIMESTAMP.sql"
echo "  - Table counts: backups/table_counts_$TIMESTAMP.txt"
echo ""
echo "🔧 To restore from backup:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < backups/backup_$TIMESTAMP.sql"
echo ""
echo "🐳 To restore in Docker:"
echo "  docker-compose exec -T postgres psql -U $DB_USER -d $DB_NAME < backups/backup_$TIMESTAMP.sql"
