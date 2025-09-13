#!/bin/bash

# Smart Skill Matrix Setup Script
# This script sets up the development environment for the Smart Skill Matrix application

set -e  # Exit on any error

echo "🚀 Setting up Smart Skill Matrix..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if PostgreSQL is installed and running
check_postgres() {
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL is not installed. Please install PostgreSQL 12 or higher."
        exit 1
    fi
    
    if ! pg_isready -q; then
        print_error "PostgreSQL is not running. Please start PostgreSQL service."
        exit 1
    fi
    
    print_success "PostgreSQL is installed and running"
}

# Check if Redis is installed (optional for email service)
check_redis() {
    if command -v redis-server &> /dev/null; then
        print_success "Redis is installed"
    else
        print_warning "Redis is not installed. Email service will not work without Redis."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    if [ -f "package.json" ]; then
        npm install
        print_success "Root dependencies installed"
    fi
    
    # Backend dependencies
    if [ -d "backend" ]; then
        cd backend
        npm install
        print_success "Backend dependencies installed"
        cd ..
    fi
    
    # Frontend dependencies
    if [ -d "frontend" ]; then
        cd frontend
        npm install
        print_success "Frontend dependencies installed"
        cd ..
    fi
    
    # Email service dependencies
    if [ -d "mails" ]; then
        cd mails
        npm install
        print_success "Email service dependencies installed"
        cd ..
    fi
}

# Setup environment files
setup_env_files() {
    print_status "Setting up environment files..."
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/env.example" ]; then
            cp backend/env.example backend/.env
            print_success "Backend .env file created from example"
            print_warning "Please edit backend/.env with your database credentials"
        else
            print_warning "Backend env.example not found"
        fi
    else
        print_success "Backend .env file already exists"
    fi
    
    # Email service .env
    if [ ! -f "mails/.env" ]; then
        if [ -f "mails/env.example" ]; then
            cp mails/env.example mails/.env
            print_success "Email service .env file created from example"
            print_warning "Please edit mails/.env with your email service credentials"
        else
            print_warning "Email service env.example not found"
        fi
    else
        print_success "Email service .env file already exists"
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw smart_skill_matrix; then
        print_success "Database smart_skill_matrix already exists"
    else
        print_status "Creating database..."
        createdb smart_skill_matrix
        print_success "Database smart_skill_matrix created"
    fi
    
    # Run migrations
    if [ -f "database/migration.sql" ]; then
        print_status "Running database migrations..."
        psql -d smart_skill_matrix -f database/migration.sql
        print_success "Database migrations completed"
    fi
    
    # Seed database
    if [ -f "database/seed.sql" ]; then
        print_status "Seeding database..."
        psql -d smart_skill_matrix -f database/seed.sql
        print_success "Database seeded with sample data"
    fi
}

# Create uploads directory
create_uploads_dir() {
    print_status "Creating uploads directory..."
    
    if [ ! -d "backend/uploads" ]; then
        mkdir -p backend/uploads
        print_success "Uploads directory created"
    else
        print_success "Uploads directory already exists"
    fi
}

# Main setup function
main() {
    echo "🔧 Smart Skill Matrix Setup"
    echo "=========================="
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    check_node
    check_postgres
    check_redis
    
    # Install dependencies
    install_dependencies
    
    # Setup environment files
    setup_env_files
    
    # Setup database
    setup_database
    
    # Create necessary directories
    create_uploads_dir
    
    echo ""
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Edit backend/.env with your database credentials"
    echo "2. Edit mails/.env with your email service credentials (optional)"
    echo "3. Start the development servers:"
    echo "   npm run dev"
    echo ""
    echo "Demo accounts:"
    echo "Admin: admin@smartskill.com / admin123"
    echo "Manager: manager1@smartskill.com / 12345678"
    echo "Employee: employee1@smartskill.com / 12345678"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"
