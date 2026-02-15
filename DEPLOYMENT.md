# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Google Cloud Service Account with Sheets and Docs API access
- Jira API credentials (email + API token)
- Anthropic (Claude) API key
- Access to target Google Sheet

## Step-by-Step Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/casamongo/Tracker.git
cd Tracker
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Google Configuration
GOOGLE_SERVICE_ACCOUNT_JSON=./config/service-account.json
GOOGLE_SHEET_ID=your-sheet-id-here

# Jira Configuration
JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

# Anthropic Configuration
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Application Ports (optional, defaults shown)
APP_PORT=8000
FRONTEND_PORT=3000
```

**Finding your Google Sheet ID:**
From the Sheet URL: `https://docs.google.com/spreadsheets/d/[THIS_IS_THE_SHEET_ID]/edit`

### 3. Set Up Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Google Sheets API
   - Google Docs API
4. Create a Service Account:
   - IAM & Admin → Service Accounts → Create Service Account
   - Grant "Editor" role
   - Create and download JSON key
5. Save the JSON file as `config/service-account.json`
6. Share your Google Sheet with the service account email (found in the JSON)

### 4. Set Up Jira API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a label (e.g., "Jira Update Automation")
4. Copy the token to `.env` as `JIRA_API_TOKEN`

### 5. Get Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys
3. Create a new key
4. Copy to `.env` as `ANTHROPIC_API_KEY`

### 6. Deploy with Docker Compose

```bash
# Make scripts executable
chmod +x start.sh dev.sh

# Build and start all services
./start.sh
```

Or manually:

```bash
docker-compose up --build -d
```

### 7. Verify Deployment

Check service status:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 8. Test the Setup

1. Open http://localhost:3000
2. The Dashboard should load and display workstreams
3. Click "Preview" on a milestone to test AI generation
4. Review the generated update
5. Click "Post to Jira & Sheet" to test posting

## Production Deployment

### Security Best Practices

1. **Use environment-specific .env files**
   ```bash
   .env.production
   .env.staging
   ```

2. **Secure sensitive files**
   ```bash
   chmod 600 .env
   chmod 600 config/service-account.json
   ```

3. **Use Docker secrets** for sensitive data in production

4. **Configure CORS properly** in `backend/main.py`:
   ```python
   allow_origins=["https://your-domain.com"]
   ```

5. **Use HTTPS** with SSL certificates (Let's Encrypt recommended)

### Nginx Configuration for Production

Update `nginx/nginx.conf` to handle SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # ... rest of configuration
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### Environment Variables for Production

```bash
# Production .env
GOOGLE_SERVICE_ACCOUNT_JSON=/secure/path/service-account.json
GOOGLE_SHEET_ID=production-sheet-id

JIRA_BASE_URL=https://yourorg.atlassian.net
JIRA_EMAIL=production-email@company.com
JIRA_API_TOKEN=production-token

ANTHROPIC_API_KEY=sk-ant-production-key

# Use different ports if needed
APP_PORT=8000
FRONTEND_PORT=3000
```

### Monitoring and Logging

1. **Application logs**:
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

2. **Health checks**:
   ```bash
   curl http://localhost:8000/health
   ```

3. **Resource monitoring**:
   ```bash
   docker stats
   ```

### Backup and Recovery

1. **Backup configuration**:
   ```bash
   tar -czf backup-$(date +%Y%m%d).tar.gz .env config/
   ```

2. **Docker image backup**:
   ```bash
   docker save -o backend-image.tar tracker_backend
   docker save -o frontend-image.tar tracker_frontend
   ```

### Scaling Considerations

For high-volume usage:

1. **Backend scaling**:
   ```yaml
   backend:
     deploy:
       replicas: 3
   ```

2. **Caching**: Implement Redis for doc content caching

3. **Queue system**: Use Celery for background jobs

4. **Database**: Add PostgreSQL for configuration and audit logs

## Troubleshooting Deployment

### Container won't start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Port conflicts
```bash
# Change ports in .env
APP_PORT=8080
FRONTEND_PORT=3001
```

### Permission issues
```bash
chmod -R 755 backend frontend
chown -R $(whoami) backend frontend
```

### Network issues
```bash
# Recreate network
docker-compose down
docker network prune
docker-compose up
```

## Maintenance

### Updating the application
```bash
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Cleaning up
```bash
# Remove stopped containers
docker-compose down

# Remove images
docker-compose down --rmi all

# Remove volumes (⚠️  removes all data)
docker-compose down -v
```

### Logs rotation
Implement log rotation to prevent disk space issues:

```yaml
# docker-compose.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Support

For issues during deployment:
1. Check logs: `docker-compose logs -f`
2. Review TROUBLESHOOTING.md
3. Verify all credentials are correct
4. Test individual components (see API.md)
