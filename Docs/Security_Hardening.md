# Security Hardening Guide

**WMS (Warehouse Management System) - Phase 6**
**Last Updated**: 2025-12-28

This guide covers security best practices for production deployment.

---

## Table of Contents

1. [Overview](#overview)
2. [Server Security](#server-security)
3. [Application Security](#application-security)
4. [Database Security](#database-security)
5. [Network Security](#network-security)
6. [HTTPS Setup](#https-setup)
7. [Secrets Management](#secrets-management)
8. [Access Control](#access-control)
9. [Security Monitoring](#security-monitoring)
10. [Incident Response](#incident-response)

---

## Overview

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions for users and services
3. **Zero Trust**: Verify every access request
4. **Security by Default**: Secure defaults, opt-in for exceptions
5. **Continuous Monitoring**: Detect and respond to threats

### Compliance Considerations

- **GDPR**: EU data protection regulations (if storing EU citizen data)
- **PCI DSS**: Payment card security (if processing payments in future)
- **ISO 27001**: Information security management
- **SOC 2**: Security operational controls

---

## Server Security

### Operating System Hardening

#### 1. System Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Configure /etc/apt/apt.conf.d/50unattended-upgrades
# Uncomment:
# "${distro_id}:${distro_codename}-security";

# Manual update check
sudo apt update && sudo apt upgrade -y
```

#### 2. Firewall Configuration (UFW)

```bash
# Reset to defaults
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Rate limit SSH to prevent brute force
sudo ufw limit 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### 3. SSH Hardening

Edit `/etc/ssh/sshd_config`:

```bash
# Disable root login
PermitRootLogin no

# Use SSH keys only (disable password auth)
PasswordAuthentication no
PubkeyAuthentication yes

# Disable empty passwords
PermitEmptyPasswords no

# Limit authentication attempts
MaxAuthTries 3

# Use SSH Protocol 2 only
Protocol 2

# Disconnect idle sessions
ClientAliveInterval 300
ClientAliveCountMax 2

# Restrict SSH to specific users
AllowUsers deploy
```

Apply changes:
```bash
sudo systemctl restart sshd
```

#### 4. Fail2Ban (Brute Force Protection)

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

# Start and enable Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

#### 5. Disable Unnecessary Services

```bash
# List running services
systemctl list-units --type=service --state=running

# Disable unnecessary services
sudo systemctl disable <service-name>
sudo systemctl stop <service-name>
```

---

## Application Security

### 1. Environment Variables

**Never commit secrets to git!**

```bash
# Protect .env.prod file
chmod 600 /opt/wms/.env.prod
chown root:root /opt/wms/.env.prod

# Use strong secrets (min 32 characters)
# JWT_SECRET - 48+ characters
# DB_PASSWORD - 24+ characters
# VALKEY_PASSWORD - 24+ characters
```

### 2. Docker Security

#### Non-Root User

Already configured in `Dockerfile.prod`:

```dockerfile
# Backend runs as non-root user "appuser"
USER appuser

# Frontend (Nginx) runs as nginx user (default)
```

#### Read-Only Root Filesystem (Optional)

Add to `docker-compose.prod.yml` for extra security:

```yaml
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

#### Resource Limits

Add to `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 3. Rate Limiting (Phase 6E)

Already configured in `app/core/rate_limit.py`:

- Authentication: 20 req/min
- Read operations: 200 req/min
- Write operations: 100 req/min
- Bulk operations: 20 req/min

To enforce globally, update `app/main.py`:

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 4. CORS Configuration

Restrict CORS to specific origins in `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://wms.example.com"],  # Specific domain only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)
```

### 5. Security Headers

Already configured in `frontend/nginx.conf`:

- `X-Frame-Options: SAMEORIGIN` - Clickjacking protection
- `X-Content-Type-Options: nosniff` - MIME sniffing protection
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Content-Security-Policy` - CSP to prevent XSS
- `Referrer-Policy: strict-origin-when-cross-origin`

### 6. Input Validation

**All user input is validated** using Pydantic schemas:

- SQL Injection: Prevented by SQLAlchemy ORM (parameterized queries)
- XSS: Frontend sanitizes inputs using React's built-in escaping
- Path Traversal: File operations use absolute paths only
- Command Injection: No shell commands executed with user input

---

## Database Security

### 1. Strong Passwords

```bash
# Generate strong password
openssl rand -base64 24

# Update in .env.prod
DB_PASSWORD=<strong-random-password>
```

### 2. Network Isolation

Database is not exposed to public internet:

```yaml
services:
  db:
    ports:
      # INTERNAL ONLY - not exposed
      - "5432"  # No host binding
```

### 3. Encrypted Connections (SSL/TLS)

Configure PostgreSQL SSL in `docker-compose.prod.yml`:

```yaml
services:
  db:
    environment:
      POSTGRES_INITDB_ARGS: "-c ssl=on"
    volumes:
      - ./certs/server.crt:/var/lib/postgresql/server.crt:ro
      - ./certs/server.key:/var/lib/postgresql/server.key:ro
```

Update DATABASE_URL:
```bash
DATABASE_URL=postgresql+asyncpg://wms_user:password@db:5432/wms?ssl=require
```

### 4. Backup Encryption

Encrypt backups before storing:

```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup.sql

# Decrypt backup
gpg --decrypt backup.sql.gpg > backup.sql
```

### 5. Database User Permissions

```sql
-- Connect to database as superuser
psql -U postgres

-- Create limited user (already done, but for reference)
CREATE USER wms_user WITH PASSWORD '<strong-password>';

-- Grant minimal permissions
GRANT CONNECT ON DATABASE wms TO wms_user;
GRANT USAGE ON SCHEMA public TO wms_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO wms_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO wms_user;

-- Revoke superuser privileges
REVOKE ALL ON DATABASE postgres FROM wms_user;
```

---

## Network Security

### 1. Reverse Proxy (Nginx/Caddy)

**Recommended: Use Caddy for automatic HTTPS**

Install Caddy as reverse proxy:

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Create Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Caddyfile content:

```caddyfile
wms.example.com {
    reverse_proxy localhost:80

    # Security headers (additional to Nginx)
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
    }

    # Logging
    log {
        output file /var/log/caddy/wms-access.log
    }
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

### 2. Network Segmentation

Use Docker networks to isolate services:

```yaml
networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge

services:
  frontend:
    networks:
      - frontend-network
      - backend-network

  backend:
    networks:
      - backend-network
      - db-network

  db:
    networks:
      - db-network  # Isolated from frontend
```

### 3. VPN Access (Optional)

For administrative access, use VPN:

```bash
# Install WireGuard
sudo apt install wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Configure /etc/wireguard/wg0.conf
# (See WireGuard documentation)

# Start VPN
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0
```

---

## HTTPS Setup

### Option 1: Let's Encrypt with Caddy (Recommended)

Automatic HTTPS - Caddy handles certificates automatically.

```caddyfile
wms.example.com {
    reverse_proxy localhost:80
    # HTTPS is automatic!
}
```

### Option 2: Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d wms.example.com

# Auto-renewal (Certbot sets up cron job automatically)
sudo certbot renew --dry-run
```

### Option 3: Self-Signed Certificate (Testing Only)

```bash
# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/wms-selfsigned.key \
  -out /etc/ssl/certs/wms-selfsigned.crt

# Configure Nginx to use it
# (Add ssl_certificate and ssl_certificate_key directives)
```

### HTTPS Best Practices

Update `frontend/nginx.conf` for HTTPS:

```nginx
server {
    listen 80;
    server_name wms.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wms.example.com;

    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ... rest of configuration
}
```

---

## Secrets Management

### 1. Environment Variables

**Current approach** (good for small deployments):

```bash
# Store in .env.prod with restricted permissions
chmod 600 /opt/wms/.env.prod
chown root:root /opt/wms/.env.prod
```

### 2. Docker Secrets (Better)

Use Docker Swarm secrets for production:

```bash
# Create secrets
echo "<jwt-secret>" | docker secret create jwt_secret -
echo "<db-password>" | docker secret create db_password -

# Update docker-compose.prod.yml
secrets:
  jwt_secret:
    external: true
  db_password:
    external: true

services:
  backend:
    secrets:
      - jwt_secret
      - db_password
```

### 3. HashiCorp Vault (Enterprise)

For large deployments, use Vault:

```bash
# Install Vault
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt update && sudo apt install vault

# Store secrets in Vault
vault kv put secret/wms/prod \
  jwt_secret="<secret>" \
  db_password="<password>"

# Retrieve in application
vault kv get -field=jwt_secret secret/wms/prod
```

---

## Access Control

### 1. User Management

**Default Roles** (RBAC implemented):

- **admin**: Full system access
- **manager**: Management and reports
- **warehouse**: Inventory operations
- **viewer**: Read-only access

### 2. Password Policy

Enforce strong passwords in `app/core/security.py`:

```python
def validate_password(password: str) -> bool:
    """
    Validate password strength:
    - Min 12 characters
    - At least 1 uppercase
    - At least 1 lowercase
    - At least 1 digit
    - At least 1 special character
    """
    if len(password) < 12:
        return False
    if not any(c.isupper() for c in password):
        return False
    if not any(c.islower() for c in password):
        return False
    if not any(c.isdigit() for c in password):
        return False
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False
    return True
```

### 3. Session Management

JWT tokens configured in `.env.prod`:

```bash
# Short-lived access tokens
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Longer-lived refresh tokens
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 4. Multi-Factor Authentication (Future)

For Phase 7, implement TOTP-based MFA using `pyotp`:

```python
import pyotp

# Generate secret
secret = pyotp.random_base32()

# Verify token
totp = pyotp.TOTP(secret)
is_valid = totp.verify(user_input_token)
```

---

## Security Monitoring

### 1. Log Monitoring

Monitor security events in logs:

```bash
# Failed login attempts
docker compose -f docker-compose.prod.yml logs backend | grep "Authentication failed"

# Unusual access patterns
docker compose -f docker-compose.prod.yml logs backend | grep "429"  # Rate limit exceeded

# Database errors
docker compose -f docker-compose.prod.yml logs backend | grep "DatabaseError"
```

### 2. Intrusion Detection (OSSEC)

Install OSSEC for host-based intrusion detection:

```bash
# Install OSSEC
wget https://github.com/ossec/ossec-hids/archive/3.7.0.tar.gz
tar -xzf 3.7.0.tar.gz
cd ossec-hids-3.7.0
sudo ./install.sh

# Configure alerts
# Edit /var/ossec/etc/ossec.conf
```

### 3. Vulnerability Scanning

Regular vulnerability scans:

```bash
# Scan Docker images with Trivy
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image wms-backend-prod:latest

# Scan for outdated packages
sudo apt list --upgradable
```

### 4. Security Audit Logs

Enable audit logging for critical operations:

```python
# In app/core/logging_config.py
security_logger = logging.getLogger("wms.security")

# Log security events
security_logger.warning("Failed login attempt", extra={
    "username": username,
    "ip_address": request.client.host,
    "user_agent": request.headers.get("user-agent"),
})
```

---

## Incident Response

### Security Incident Procedures

#### 1. Detection

- Monitor logs for suspicious activity
- Review rate limit violations
- Check failed authentication attempts
- Monitor system resource usage

#### 2. Containment

```bash
# Block malicious IP with UFW
sudo ufw deny from <malicious-ip>

# Disable compromised user
docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.session import get_sync_session
from app.db.models.user import User

with get_sync_session() as session:
    user = session.query(User).filter(User.username == 'compromised_user').first()
    user.is_active = False
    session.commit()
"

# Take services offline if needed
docker compose -f docker-compose.prod.yml down
```

#### 3. Investigation

```bash
# Export logs for analysis
docker compose -f docker-compose.prod.yml logs --since 24h > /opt/wms/logs/incident-$(date +%Y%m%d-%H%M%S).log

# Check active connections
docker compose -f docker-compose.prod.yml exec db psql -U wms_user -d wms -c "
SELECT * FROM pg_stat_activity WHERE datname = 'wms';"

# Review recent user activity
# Check bin_movements table for unauthorized operations
```

#### 4. Eradication

```bash
# Rotate all secrets
# Update .env.prod with new JWT_SECRET, DB_PASSWORD, etc.

# Force logout all users (invalidate tokens)
# Restart backend to clear cache
docker compose -f docker-compose.prod.yml restart backend

# Update system packages
sudo apt update && sudo apt upgrade -y

# Restore from clean backup if needed
```

#### 5. Recovery

```bash
# Bring services back online
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d

# Verify health
curl http://localhost:8000/health

# Notify users of password reset requirement
```

#### 6. Lessons Learned

- Document incident in `/opt/wms/security/incidents/`
- Update security procedures
- Implement additional controls
- Train team on new procedures

---

## Security Checklist

### Pre-Production

- [ ] Strong passwords for all accounts (min 24 chars)
- [ ] SSH key-based authentication only
- [ ] Firewall configured (UFW)
- [ ] Fail2Ban installed and configured
- [ ] HTTPS with valid certificate
- [ ] Database not exposed to internet
- [ ] Secrets stored securely (600 permissions)
- [ ] Docker images scanned for vulnerabilities
- [ ] Backup encryption enabled
- [ ] Rate limiting configured
- [ ] Security headers configured
- [ ] CORS restricted to specific origins
- [ ] Default admin password changed

### Post-Production

- [ ] Monitor logs daily
- [ ] Review failed login attempts
- [ ] Check rate limit violations
- [ ] Run vulnerability scans weekly
- [ ] Update packages monthly
- [ ] Test backup restoration monthly
- [ ] Review user accounts quarterly
- [ ] Rotate secrets annually (or after incident)

---

## Related Documentation

- [Production_Deployment.md](./Production_Deployment.md) - Deployment procedures
- [Operations_Runbook.md](./Operations_Runbook.md) - Daily operations
- [Backup_Recovery.md](./Backup_Recovery.md) - Backup and recovery

---

## Security Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **CIS Benchmarks**: https://www.cisecurity.org/cis-benchmarks
- **Docker Security**: https://docs.docker.com/engine/security/
- **PostgreSQL Security**: https://www.postgresql.org/docs/current/security.html
