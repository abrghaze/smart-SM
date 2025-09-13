# 🚀 Deployment Guide

This guide covers deploying the Smart Skill Matrix application using Docker and Docker Compose.

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Git
- 4GB+ RAM available
- 10GB+ disk space

## 🐳 Docker Deployment

### **Quick Start with Docker Compose**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-skill-matrix.git
   cd smart-skill-matrix
   ```

2. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Database Configuration
   POSTGRES_DB=smart_skill_matrix
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_secure_password
   
   # JWT Secrets (Generate strong secrets)
   JWT_SECRET=your_jwt_secret_here
   JWT_REFRESH_SECRET=your_refresh_secret_here
   
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Verify deployment**
   ```bash
   docker-compose ps
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Email Service: http://localhost:3001

### **Production Deployment**

#### **1. Environment Configuration**

Create production environment file:
```bash
cp env.example .env.production
```

Update with production values:
```env
NODE_ENV=production
POSTGRES_PASSWORD=your_very_secure_password
JWT_SECRET=your_production_jwt_secret
JWT_REFRESH_SECRET=your_production_refresh_secret
SMTP_USER=your_production_email
SMTP_PASS=your_production_app_password
```

#### **2. SSL/HTTPS Configuration**

For production, configure SSL certificates:

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend
```

#### **3. Database Backup**

Set up automated backups:
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec smart-skill-matrix-db pg_dump -U postgres smart_skill_matrix > backup_$DATE.sql
EOF

chmod +x backup.sh
```

#### **4. Monitoring and Logs**

Monitor container health:
```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f email-service

# Check container status
docker-compose ps
```

## 🔧 Manual Docker Build

### **Build Individual Services**

1. **Build Backend**
   ```bash
   cd backend
   docker build -t smart-skill-matrix-backend .
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   docker build -t smart-skill-matrix-frontend .
   ```

3. **Build Email Service**
   ```bash
   cd mails
   docker build -t smart-skill-matrix-email .
   ```

### **Run Individual Containers**

1. **Start PostgreSQL**
   ```bash
   docker run -d \
     --name postgres \
     -e POSTGRES_DB=smart_skill_matrix \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=admin \
     -p 5432:5432 \
     postgres:13
   ```

2. **Start Backend**
   ```bash
   docker run -d \
     --name backend \
     --link postgres:postgres \
     -e DB_HOST=postgres \
     -e DB_PASSWORD=admin \
     -p 5000:5000 \
     smart-skill-matrix-backend
   ```

3. **Start Email Service**
   ```bash
   docker run -d \
     --name email-service \
     -p 3001:3001 \
     smart-skill-matrix-email
   ```

4. **Start Frontend**
   ```bash
   docker run -d \
     --name frontend \
     --link backend:backend \
     -e REACT_APP_API_URL=http://localhost:5000 \
     -p 3000:3000 \
     smart-skill-matrix-frontend
   ```

## 🌐 Cloud Deployment

### **AWS Deployment**

1. **EC2 Instance Setup**
   ```bash
   # Install Docker
   sudo yum update -y
   sudo yum install -y docker
   sudo service docker start
   sudo usermod -a -G docker ec2-user
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.0.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **RDS Database Setup**
   - Create PostgreSQL RDS instance
   - Update connection string in docker-compose.yml
   - Configure security groups

3. **Deploy Application**
   ```bash
   git clone https://github.com/yourusername/smart-skill-matrix.git
   cd smart-skill-matrix
   docker-compose up -d
   ```

### **DigitalOcean Deployment**

1. **Droplet Setup**
   ```bash
   # Create Ubuntu 20.04 droplet
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

2. **Deploy with App Platform**
   - Connect GitHub repository
   - Configure environment variables
   - Deploy automatically

### **Google Cloud Platform**

1. **Cloud Run Deployment**
   ```bash
   # Build and push images
   gcloud builds submit --tag gcr.io/PROJECT_ID/smart-skill-matrix
   
   # Deploy to Cloud Run
   gcloud run deploy --image gcr.io/PROJECT_ID/smart-skill-matrix
   ```

## 🔒 Security Considerations

### **Environment Variables**
- Use strong, unique passwords
- Generate secure JWT secrets
- Rotate secrets regularly
- Never commit secrets to version control

### **Network Security**
- Use Docker networks for service isolation
- Configure firewall rules
- Use HTTPS in production
- Implement rate limiting

### **Database Security**
- Use strong database passwords
- Enable SSL connections
- Regular security updates
- Backup encryption

## 📊 Monitoring and Maintenance

### **Health Checks**
```bash
# Check service health
curl http://localhost:5000/api/health
curl http://localhost:3001/api/health
curl http://localhost:3000/health
```

### **Log Management**
```bash
# View logs
docker-compose logs -f

# Rotate logs
docker-compose logs --tail=1000 > logs/app.log
```

### **Updates and Maintenance**
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Clean up unused images
docker system prune -a
```

## 🚨 Troubleshooting

### **Common Issues**

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :5000
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Test connection
   docker exec -it smart-skill-matrix-db psql -U postgres -d smart_skill_matrix
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   docker stats
   
   # Increase memory limits in docker-compose.yml
   ```

4. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod -R 755 .
   ```

### **Recovery Procedures**

1. **Database Recovery**
   ```bash
   # Restore from backup
   docker exec -i smart-skill-matrix-db psql -U postgres -d smart_skill_matrix < backup.sql
   ```

2. **Service Recovery**
   ```bash
   # Restart specific service
   docker-compose restart backend
   
   # Restart all services
   docker-compose restart
   ```

## 📞 Support

For deployment issues:
- Check logs: `docker-compose logs`
- Verify configuration: `docker-compose config`
- Test connectivity: `docker-compose exec backend ping postgres`

For additional support, create an issue in the GitHub repository.