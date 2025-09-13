#!/bin/bash

# Docker Volume Import Script for Smart Skill Matrix
# This script imports a Docker volume from a tar file

set -e

# Configuration
VOLUME_NAME=${1:-smart_skill_matrix_postgres_data}
TAR_FILE=${2}

# Check if tar file is provided
if [ -z "$TAR_FILE" ]; then
    echo "❌ Error: No tar file provided"
    echo "Usage: $0 <volume_name> <tar_file>"
    echo "Example: $0 smart_skill_matrix_postgres_data ./backups/volumes/volume_smart_skill_matrix_postgres_data_20240101_120000.tar.gz"
    exit 1
fi

# Check if tar file exists
if [ ! -f "$TAR_FILE" ]; then
    echo "❌ Error: Tar file '$TAR_FILE' not found"
    exit 1
fi

echo "📦 Importing Docker volume..."
echo "Volume: $VOLUME_NAME"
echo "Tar file: $TAR_FILE"
echo ""

# Confirm import
read -p "⚠️  This will overwrite the existing volume. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Import cancelled"
    exit 1
fi

# Create volume if it doesn't exist
echo "🏗️  Creating volume..."
docker volume create "$VOLUME_NAME" 2>/dev/null || echo "Volume already exists"

# Create a temporary container to import the volume
echo "🔧 Creating temporary container..."
CONTAINER_NAME="volume_importer_$(date +%s)"

# Create container
docker run --rm -d --name "$CONTAINER_NAME" -v "$VOLUME_NAME":/data alpine tail -f /dev/null

# Import the volume
echo "📥 Importing volume data..."
docker cp "$TAR_FILE" "$CONTAINER_NAME:/backup.tar.gz"
docker exec "$CONTAINER_NAME" sh -c "cd /data && tar -xzf /backup.tar.gz --strip-components=1"

# Stop and remove container
echo "🧹 Cleaning up temporary container..."
docker stop "$CONTAINER_NAME"

echo ""
echo "✅ Volume imported successfully!"
echo ""
echo "🔧 To verify the import:"
echo "  docker run --rm -v $VOLUME_NAME:/data alpine ls -la /data"
echo ""
echo "🐳 To use with docker-compose:"
echo "  docker-compose up -d postgres"
