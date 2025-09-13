#!/bin/bash

# Smart Skill Matrix - Environment Setup Script
# This script helps users set up their environment configuration

echo "🚀 Smart Skill Matrix - Environment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env files already exist
check_existing_env() {
    if [ -f ".env" ]; then
        print_warning "Main .env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping main .env file"
            return 1
        fi
    fi
    return 0
}

# Generate random secrets
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Setup main .env file
setup_main_env() {
    print_info "Setting up main .env file..."
    
    if check_existing_env; then
        cp env.example .env
        
        # Generate random secrets
        JWT_SECRET=$(generate_secret)
        JWT_REFRESH_SECRET=$(generate_secret)
        SESSION_SECRET=$(generate_secret)
        
        # Replace placeholder secrets
        sed -i.bak "s/your_jwt_secret_here_change_this_in_production/$JWT_SECRET/g" .env
        sed -i.bak "s/your_refresh_secret_here_change_this_in_production/$JWT_REFRESH_SECRET/g" .env
        sed -i.bak "s/your_session_secret_here/$SESSION_SECRET/g" .env
        
        # Clean up backup files
        rm .env.bak
        
        print_status "Main .env file created with random secrets"
    fi
}

# Setup backend .env file
setup_backend_env() {
    print_info "Setting up backend .env file..."
    
    if [ -f "backend/.env" ]; then
        print_warning "Backend .env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping backend .env file"
            return
        fi
    fi
    
    cp backend/env.example backend/.env
    
    # Generate random secrets
    JWT_SECRET=$(generate_secret)
    JWT_REFRESH_SECRET=$(generate_secret)
    SESSION_SECRET=$(generate_secret)
    
    # Replace placeholder secrets
    sed -i.bak "s/your_jwt_secret_here_change_this_in_production/$JWT_SECRET/g" backend/.env
    sed -i.bak "s/your_refresh_secret_here_change_this_in_production/$JWT_REFRESH_SECRET/g" backend/.env
    sed -i.bak "s/your_session_secret_here/$SESSION_SECRET/g" backend/.env
    
    # Clean up backup files
    rm backend/.env.bak
    
    print_status "Backend .env file created with random secrets"
}

# Setup frontend .env file
setup_frontend_env() {
    print_info "Setting up frontend .env file..."
    
    if [ -f "frontend/.env" ]; then
        print_warning "Frontend .env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping frontend .env file"
            return
        fi
    fi
    
    cp frontend/env.example frontend/.env
    print_status "Frontend .env file created"
}

# Setup email service .env file
setup_email_env() {
    print_info "Setting up email service .env file..."
    
    if [ -f "mails/.env" ]; then
        print_warning "Email service .env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping email service .env file"
            return
        fi
    fi
    
    cp mails/env.example mails/.env
    print_status "Email service .env file created"
}

# Interactive configuration
interactive_config() {
    print_info "Starting interactive configuration..."
    
    # Database configuration
    echo
    print_info "Database Configuration:"
    read -p "Database host (default: localhost): " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database port (default: 5432): " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Database name (default: smart_skill_matrix): " DB_NAME
    DB_NAME=${DB_NAME:-smart_skill_matrix}
    
    read -p "Database user (default: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -s -p "Database password (default: admin): " DB_PASSWORD
    DB_PASSWORD=${DB_PASSWORD:-admin}
    echo
    
    # Update all .env files with database configuration
    if [ -f ".env" ]; then
        sed -i.bak "s/DB_HOST=localhost/DB_HOST=$DB_HOST/g" .env
        sed -i.bak "s/DB_PORT=5432/DB_PORT=$DB_PORT/g" .env
        sed -i.bak "s/DB_NAME=smart_skill_matrix/DB_NAME=$DB_NAME/g" .env
        sed -i.bak "s/DB_USER=postgres/DB_USER=$DB_USER/g" .env
        sed -i.bak "s/DB_PASSWORD=admin/DB_PASSWORD=$DB_PASSWORD/g" .env
        rm .env.bak
    fi
    
    if [ -f "backend/.env" ]; then
        sed -i.bak "s/DB_HOST=localhost/DB_HOST=$DB_HOST/g" backend/.env
        sed -i.bak "s/DB_PORT=5432/DB_PORT=$DB_PORT/g" backend/.env
        sed -i.bak "s/DB_NAME=smart_skill_matrix/DB_NAME=$DB_NAME/g" backend/.env
        sed -i.bak "s/DB_USER=postgres/DB_USER=$DB_USER/g" backend/.env
        sed -i.bak "s/DB_PASSWORD=admin/DB_PASSWORD=$DB_PASSWORD/g" backend/.env
        rm backend/.env.bak
    fi
    
    # Email configuration
    echo
    print_info "Email Configuration:"
    read -p "SMTP host (default: smtp.gmail.com): " SMTP_HOST
    SMTP_HOST=${SMTP_HOST:-smtp.gmail.com}
    
    read -p "SMTP port (default: 587): " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    
    read -p "Email address: " SMTP_USER
    
    read -s -p "Email password/app password: " SMTP_PASS
    echo
    
    # Update email service .env file
    if [ -f "mails/.env" ]; then
        sed -i.bak "s/SMTP_HOST=smtp.gmail.com/SMTP_HOST=$SMTP_HOST/g" mails/.env
        sed -i.bak "s/SMTP_PORT=587/SMTP_PORT=$SMTP_PORT/g" mails/.env
        sed -i.bak "s/your_email@gmail.com/$SMTP_USER/g" mails/.env
        sed -i.bak "s/your_app_password/$SMTP_PASS/g" mails/.env
        sed -i.bak "s/FROM_EMAIL=your_email@gmail.com/FROM_EMAIL=$SMTP_USER/g" mails/.env
        rm mails/.env.bak
    fi
    
    print_status "Configuration updated successfully"
}

# Main setup function
main() {
    echo
    print_info "This script will help you set up your environment configuration files."
    echo
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "mails" ]; then
        print_error "Please run this script from the root directory of the Smart Skill Matrix project"
        exit 1
    fi
    
    # Setup all .env files
    setup_main_env
    setup_backend_env
    setup_frontend_env
    setup_email_env
    
    # Ask for interactive configuration
    echo
    read -p "Do you want to configure database and email settings interactively? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        interactive_config
    fi
    
    echo
    print_status "Environment setup completed!"
    echo
    print_info "Next steps:"
    echo "1. Review the .env files and update any settings as needed"
    echo "2. Set up your PostgreSQL database"
    echo "3. Run: npm install"
    echo "4. Run: npm run setup:database"
    echo "5. Run: npm start"
    echo
    print_warning "Important: Update the email configuration in mails/.env with your actual email credentials"
    echo
}

# Run main function
main
