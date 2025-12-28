#!/bin/bash
#
# WMS Zero-Downtime Deployment Script
# Deploys updates with minimal downtime using rolling restart
#
# Usage: bash deploy.sh [branch]
#   branch: Git branch to deploy (default: main)
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
BRANCH="${1:-main}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}WMS Zero-Downtime Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if WMS directory exists
if [ ! -d "$WMS_DIR" ]; then
    echo -e "${RED}Error: WMS directory not found: $WMS_DIR${NC}"
    echo "Run install-production.sh first"
    exit 1
fi

cd "$WMS_DIR"

# Check if .env.prod exists
if [ ! -f "$WMS_DIR/.env.prod" ]; then
    echo -e "${RED}Error: .env.prod not found${NC}"
    exit 1
fi

echo -e "${GREEN}[1/8] Pre-deployment backup...${NC}"
# Create backup before deployment
if [ -f "$WMS_DIR/scripts/backup-database.sh" ]; then
    bash "$WMS_DIR/scripts/backup-database.sh"
    echo -e "${GREEN}Backup completed${NC}"
else
    echo -e "${YELLOW}Warning: backup-database.sh not found, skipping backup${NC}"
    read -p "Continue without backup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}[2/8] Fetching latest code...${NC}"
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"

echo -e "${GREEN}[3/8] Checking out $BRANCH branch...${NC}"
git checkout "$BRANCH"
git pull origin "$BRANCH"
NEW_COMMIT=$(git rev-parse HEAD)
echo "New commit: $NEW_COMMIT"

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo -e "${YELLOW}No new commits, already up to date${NC}"
    read -p "Continue deployment anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 0
    fi
fi

echo -e "${GREEN}[4/8] Building Docker images...${NC}"
cd "$WMS_DIR/w7-WHv1"
docker compose -f docker-compose.prod.yml --env-file ../.env.prod build --no-cache

echo -e "${GREEN}[5/8] Running database migrations...${NC}"
# Run migrations before restarting services
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head || {
    echo -e "${RED}Error: Database migration failed${NC}"
    echo "Rolling back to previous commit..."
    cd "$WMS_DIR"
    git checkout "$CURRENT_COMMIT"
    exit 1
}

echo -e "${GREEN}[6/8] Rolling restart of services...${NC}"
# Restart services one by one to minimize downtime

echo "  - Restarting backend..."
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
sleep 5

# Check backend health
echo "  - Checking backend health..."
for i in {1..30}; do
    if curl -sf http://localhost:8000/health > /dev/null; then
        echo -e "${GREEN}  ✓ Backend is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Error: Backend health check failed${NC}"
        echo "Rolling back to previous commit..."
        cd "$WMS_DIR"
        git checkout "$CURRENT_COMMIT"
        cd w7-WHv1
        docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
        exit 1
    fi
    echo "  Waiting for backend... ($i/30)"
    sleep 2
done

echo "  - Restarting frontend..."
docker compose -f docker-compose.prod.yml up -d --no-deps --build frontend
sleep 3

# Check frontend health
echo "  - Checking frontend health..."
for i in {1..10}; do
    if curl -sf http://localhost/health > /dev/null; then
        echo -e "${GREEN}  ✓ Frontend is healthy${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${YELLOW}Warning: Frontend health check failed${NC}"
    fi
    sleep 1
done

echo "  - Restarting Celery worker..."
docker compose -f docker-compose.prod.yml up -d --no-deps --build celery-worker
sleep 2

echo "  - Restarting Celery beat..."
docker compose -f docker-compose.prod.yml up -d --no-deps --build celery-beat
sleep 2

echo -e "${GREEN}[7/8] Post-deployment verification...${NC}"

# Check all services are running
SERVICES=$(docker compose -f docker-compose.prod.yml ps --services)
RUNNING_SERVICES=$(docker compose -f docker-compose.prod.yml ps --services --filter "status=running")

if [ "$(echo "$SERVICES" | wc -l)" -ne "$(echo "$RUNNING_SERVICES" | wc -l)" ]; then
    echo -e "${RED}Error: Not all services are running${NC}"
    docker compose -f docker-compose.prod.yml ps
    exit 1
fi

# Final health checks
echo "  - Backend health: $(curl -sf http://localhost:8000/health || echo 'FAIL')"
echo "  - Frontend health: $(curl -sf http://localhost/health || echo 'FAIL')"

# Check database connectivity
echo "  - Database connectivity..."
docker compose -f docker-compose.prod.yml exec -T db psql -U wms_user -d wms -c "SELECT 1;" > /dev/null && \
    echo -e "${GREEN}  ✓ Database connection OK${NC}" || \
    echo -e "${RED}  ✗ Database connection FAILED${NC}"

# Check Celery
echo "  - Celery worker status..."
docker compose -f docker-compose.prod.yml exec celery-worker celery -A app.tasks.celery_app inspect ping > /dev/null 2>&1 && \
    echo -e "${GREEN}  ✓ Celery worker OK${NC}" || \
    echo -e "${RED}  ✗ Celery worker FAILED${NC}"

echo -e "${GREEN}[8/8] Cleanup...${NC}"
# Remove old Docker images
docker image prune -f > /dev/null 2>&1

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Deployment Summary:"
echo "  Previous commit: $CURRENT_COMMIT"
echo "  New commit: $NEW_COMMIT"
echo "  Branch: $BRANCH"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Create deployment log
DEPLOY_LOG="$WMS_DIR/logs/deploy-${TIMESTAMP}.log"
cat > "$DEPLOY_LOG" << EOF
Deployment Log: $TIMESTAMP
==============================
Previous commit: $CURRENT_COMMIT
New commit: $NEW_COMMIT
Branch: $BRANCH
User: $(whoami)
Status: SUCCESS

Services:
$(docker compose -f "$WMS_DIR/w7-WHv1/docker-compose.prod.yml" ps)
EOF

echo "Deployment log: $DEPLOY_LOG"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Monitor logs for errors: docker compose -f docker-compose.prod.yml logs -f"
echo "2. Test critical functionality"
echo "3. Monitor metrics and alerts"
echo ""
echo -e "${GREEN}Deployment successful!${NC}"
