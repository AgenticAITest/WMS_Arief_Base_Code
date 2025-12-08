# WMS Docker Deployment Guide

This guide explains how to build and run the WMS application in Docker.

## Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)
- PostgreSQL server running (not in Docker)
- Node.js 20+ (for local development)

## Quick Start

### 1. Configure Environment Variables

Copy the docker environment template:
```bash
cp .env.docker .env
```

Edit `.env` and update the following:
- `DATABASE_URL`: Your PostgreSQL connection string (use `host.docker.internal` for host machine database)
- `ACCESS_TOKEN_SECRET`: Secure random string
- `REFRESH_TOKEN_SECRET`: Secure random string
- `RESET_PASSWORD_TOKEN_SECRET`: Secure random string
- `BASE_URL`: Your application URL
- SMTP settings if using email features

### 2. Build the Docker Image

```bash
docker build -t wms-app:latest .
```

### 3. Run with Docker Compose (Recommended)

```bash
docker-compose up -d
```

This will:
- Build the application image
- Start the container on port 5000
- Mount the `storage` directory for file persistence
- Configure health checks

### 4. Run with Docker CLI (Alternative)

```bash
docker run -d \
  --name wms-app \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/storage:/app/storage \
  --add-host=host.docker.internal:host-gateway \
  wms-app:latest
```

## Database Connection

Since you're using an external PostgreSQL server, ensure:

1. **Host Machine Database**: Use `host.docker.internal` in DATABASE_URL
   ```
   DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/wms_db
   ```

2. **Remote Database**: Use the actual hostname/IP
   ```
   DATABASE_URL=postgresql://user:pass@192.168.1.100:5432/wms_db
   ```

3. **PostgreSQL Configuration**: Ensure PostgreSQL accepts connections from Docker containers
   - Edit `postgresql.conf`: Set `listen_addresses = '*'` or specific IP
   - Edit `pg_hba.conf`: Add appropriate host entries

## Running Migrations

Before first run, apply database migrations:

```bash
# Using Docker Compose
docker-compose exec wms-app npm run db:migrate

# Using Docker CLI
docker exec -it wms-app npm run db:migrate
```

## Container Management

### View Logs
```bash
docker-compose logs -f wms-app
```

### Stop Container
```bash
docker-compose down
```

### Restart Container
```bash
docker-compose restart wms-app
```

### Access Container Shell
```bash
docker-compose exec wms-app sh
```

## Health Check

The container includes a health check that runs every 30 seconds:
```bash
docker inspect wms-app | grep -A 10 Health
```

Access the application at: http://localhost:5000

## Production Deployment

For production:

1. **Use Production Secrets**
   - Generate strong random secrets for JWT tokens
   - Use a secrets management system (AWS Secrets Manager, HashiCorp Vault, etc.)

2. **Environment-Specific Configuration**
   ```bash
   docker run -d \
     --name wms-app-prod \
     -p 80:5000 \
     -e NODE_ENV=production \
     -e DATABASE_URL=postgresql://... \
     -e ACCESS_TOKEN_SECRET=$ACCESS_TOKEN_SECRET \
     -v /data/wms/storage:/app/storage \
     --restart unless-stopped \
     wms-app:latest
   ```

3. **Reverse Proxy**
   - Use nginx or Traefik in front of the container
   - Enable HTTPS with SSL certificates
   - Configure proper CORS settings

4. **Monitoring**
   - Set up logging aggregation (ELK stack, CloudWatch)
   - Monitor container metrics
   - Configure alerts for health check failures

## Troubleshooting

### Cannot Connect to Database
- Verify DATABASE_URL is correct
- Check PostgreSQL is accepting connections
- Ensure firewall allows connections from Docker network
- Test with: `docker-compose exec wms-app ping host.docker.internal`

### Container Won't Start
```bash
# Check logs
docker-compose logs wms-app

# Verify environment variables
docker-compose config
```

### Storage Issues
- Ensure `./storage` directory exists and has correct permissions
- Check volume mounts: `docker inspect wms-app`

### Port Already in Use
- Change port mapping in `docker-compose.yml`:
  ```yaml
  ports:
    - "8080:5000"  # Use 8080 instead of 5000
  ```

## Build Options

### Development Build
For development with hot-reload (not using Docker typically):
```bash
npm run dev
```

### Custom Build
```bash
docker build \
  --build-arg NODE_VERSION=20 \
  -t wms-app:v1.0.0 \
  .
```

## Updating the Application

1. Pull latest code
2. Rebuild image: `docker-compose build`
3. Recreate container: `docker-compose up -d`
4. Run migrations if needed: `docker-compose exec wms-app npm run db:migrate`

## Cleanup

Remove container and volumes:
```bash
docker-compose down -v
```

Remove image:
```bash
docker rmi wms-app:latest
```

## Support

For issues or questions, refer to the main README.md or project documentation.
