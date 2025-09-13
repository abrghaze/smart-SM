#!/bin/bash

# Docker Volume Export Script for Smart Skill Matrix
# This script exports Docker volumes to tar files for backup/transfer

set -e

# Configuration
VOLUME_NAME=${1:-smart_skill_matrix_postgres_data}
OUTPUT_DIR=${2:-./backups/volumes}

echo "📦 Exporting Docker volume..."
echo "Volume: $VOLUME_NAME"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Generate timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if volume exists
if ! docker volume ls | grep -q "$VOLUME_NAME"; then
    echo "❌ Error: Volume '$VOLUME_NAME' not found"
    echo "Available volumes:"
    docker volume ls
    exit 1
fi

# Create a temporary container to export the volume
echo "🔧 Creating temporary container..."
CONTAINER_NAME="volume_exporter_$TIMESTAMP"

# Create container
docker run --rm -d --name "$CONTAINER_NAME" -v "$VOLUME_NAME":/data alpine tail -f /dev/null

# Export the volume
echo "📤 Exporting volume data..."
docker cp "$CONTAINER_NAME:/data" "$OUTPUT_DIR/volume_$TIMESTAMP"

# Stop and remove container
echo "🧹 Cleaning up temporary container..."
docker stop "$CONTAINER_NAME"

# Create tar archive
echo "📦 Creating tar archive..."
cd "$OUTPUT_DIR"
tar -czf "volume_$VOLUME_NAME_$TIMESTAMP.tar.gz" "volume_$TIMESTAMP"
rm -rf "volume_$TIMESTAMP"

echo ""
echo "✅ Volume exported successfully!"
echo ""
echo "📁 Export files created:"
echo "  - Volume data: $OUTPUT_DIR/volume_$VOLUME_NAME_$TIMESTAMP.tar.gz"
echo ""
echo "🔧 To import this volume:"
echo "  ./scripts/import-volume.sh $VOLUME_NAME $OUTPUT_DIR/volume_$VOLUME_NAME_$TIMESTAMP.tar.gz"
echo ""
echo "🐳 To restore in Docker:"
echo "  docker volume create $VOLUME_NAME"
echo "  docker run --rm -v $VOLUME_NAME:/data -v \$(pwd)/$OUTPUT_DIR:/backup alpine sh -c 'cd /data && tar -xzf /backup/volume_$VOLUME_NAME_$TIMESTAMP.tar.gz --strip-components=1'"
