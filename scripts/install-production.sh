#!/bin/bash
#
# WMS Production Installation Script
# Installs and configures WMS on a fresh Ubuntu 24.04 server
#
# Usage: sudo bash install-production.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WMS_DIR="/opt/wms"
BACKUP_DIR="/opt/wms/backups"
LOG_DIR="/opt/wms/logs"
REPO_URL="https://github.com/w7-mgfcode/warehouse-management-system.git"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}WMS Production Installation${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root${NC}"
   echo "Usage: sudo bash install-production.sh"
   exit 1
fi

# Check Ubuntu version
if ! grep -q "Ubuntu 24.04" /etc/os-release; then
    echo -e "${YELLOW}Warning: This script is designed for Ubuntu 24.04${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}[1/10] Updating system packages...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git vim htop ufw unzip jq

echo -e "${GREEN}[2/10] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${YELLOW}Docker already installed, skipping...${NC}"
fi

# Add current user to docker group
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker "$SUDO_USER"
    echo -e "${GREEN}Added $SUDO_USER to docker group${NC}"
fi

echo -e "${GREEN}[3/10] Configuring firewall (UFW)...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw limit 22/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured${NC}"

echo -e "${GREEN}[4/10] Installing Fail2Ban...${NC}"
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
echo -e "${GREEN}Fail2Ban installed and started${NC}"

echo -e "${GREEN}[5/10] Creating application directories...${NC}"
mkdir -p "$WMS_DIR"
mkdir -p "$BACKUP_DIR"/{database,volumes,config,ssl}
mkdir -p "$LOG_DIR"

# Set ownership to sudo user if available
if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER:$SUDO_USER" "$WMS_DIR"
fi

echo -e "${GREEN}[6/10] Cloning repository...${NC}"
if [ -d "$WMS_DIR/.git" ]; then
    echo -e "${YELLOW}Repository already exists, pulling latest...${NC}"
    cd "$WMS_DIR"
    sudo -u "$SUDO_USER" git pull origin main
else
    sudo -u "$SUDO_USER" git clone "$REPO_URL" "$WMS_DIR"
    cd "$WMS_DIR"
    sudo -u "$SUDO_USER" git checkout main
fi

echo -e "${GREEN}[7/10] Generating secrets...${NC}"
JWT_SECRET=$(openssl rand -base64 48)
DB_PASSWORD=$(openssl rand -base64 24)
VALKEY_PASSWORD=$(openssl rand -base64 24)

echo -e "${GREEN}[8/10] Creating .env.prod file...${NC}"
cat > "$WMS_DIR/.env.prod" << EOF
# Database Configuration
DB_NAME=wms
DB_USER=wms_user
DB_PASSWORD=${DB_PASSWORD}

# JWT Authentication
JWT_SECRET=${JWT_SECRET}
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Valkey (Redis) Configuration
VALKEY_PASSWORD=${VALKEY_PASSWORD}

# Application Settings
TIMEZONE=Europe/Budapest
LANGUAGE=hu
DEBUG=false

# Celery (Background Tasks)
CELERY_BROKER_URL=redis://:${VALKEY_PASSWORD}@valkey:6379/0
CELERY_RESULT_BACKEND=redis://:${VALKEY_PASSWORD}@valkey:6379/0

# Email Configuration (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=wms@example.com
SMTP_PASSWORD=CHANGE_ME
SMTP_FROM_EMAIL=wms@example.com
SMTP_TLS=true
EMAIL_ENABLED=false

# Expiry Alerts
EXPIRY_WARNING_DAYS=14
EXPIRY_CRITICAL_DAYS=7
ALERT_RECIPIENT_EMAILS=manager@example.com
EOF

# Secure .env.prod
chmod 600 "$WMS_DIR/.env.prod"
chown root:root "$WMS_DIR/.env.prod"

echo -e "${GREEN}[9/10] Building Docker images...${NC}"
cd "$WMS_DIR/w7-WHv1"
docker compose -f docker-compose.prod.yml --env-file ../.env.prod build

echo -e "${GREEN}[10/10] Starting services...${NC}"
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Run database migrations
echo -e "${GREEN}Running database migrations...${NC}"
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Seed initial data
echo -e "${GREEN}Seeding database...${NC}"
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT INFORMATION:${NC}"
echo ""
echo "Generated secrets have been saved to: ${WMS_DIR}/.env.prod"
echo ""
echo -e "${RED}Save these credentials securely:${NC}"
echo "  DB_PASSWORD: ${DB_PASSWORD}"
echo "  VALKEY_PASSWORD: ${VALKEY_PASSWORD}"
echo ""
echo -e "${YELLOW}Default admin credentials:${NC}"
echo "  Username: admin"
echo "  Password: Admin123!"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Change admin password immediately after first login!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update SMTP settings in .env.prod if email alerts are needed"
echo "2. Access the application at http://$(hostname -I | awk '{print $1}')"
echo "3. Configure HTTPS (see Docs/Security_Hardening.md)"
echo "4. Set up automated backups (see Docs/Backup_Recovery.md)"
echo ""
echo -e "${GREEN}For more information:${NC}"
echo "  - Production Deployment: ${WMS_DIR}/Docs/Production_Deployment.md"
echo "  - Operations Runbook: ${WMS_DIR}/Docs/Operations_Runbook.md"
echo "  - Security Hardening: ${WMS_DIR}/Docs/Security_Hardening.md"
echo "  - Backup & Recovery: ${WMS_DIR}/Docs/Backup_Recovery.md"
echo ""

# Create reminder file
cat > /etc/motd << EOF

================================================================================
                        WMS Production Server
================================================================================

Application Directory: ${WMS_DIR}
Backup Directory: ${BACKUP_DIR}
Log Directory: ${LOG_DIR}

Quick Commands:
  - View logs: cd ${WMS_DIR}/w7-WHv1 && docker compose -f docker-compose.prod.yml logs -f
  - Restart services: cd ${WMS_DIR}/w7-WHv1 && docker compose -f docker-compose.prod.yml restart
  - Health check: curl http://localhost:8000/health

Documentation: ${WMS_DIR}/Docs/

================================================================================
EOF

echo -e "${GREEN}Installation script completed successfully!${NC}"
