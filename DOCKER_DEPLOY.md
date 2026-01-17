# Docker Deployment Guide

This guide explains how to deploy Kitchenry using Docker and Portainer.

## Prerequisites

- Docker installed
- Portainer installed (optional, for GUI management)
- Supabase account with database setup

## Quick Start with Docker Compose

### 1. Clone/Upload the Project

Upload or clone this project to your server:

```bash
cd /path/to/kitchenry
```

### 2. Configure Environment Variables

Create a `.env` file in the project root with your Supabase credentials:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Build and Run

```bash
# Build and start the container
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The app will be available at `http://localhost:3000`

## Deploying with Portainer

### Method 1: Using Portainer Stacks (Recommended)

1. Log in to Portainer
2. Navigate to **Stacks** → **Add stack**
3. Name your stack (e.g., "kitchenry")
4. Choose **Upload from computer** or **Repository**
5. Upload the `docker-compose.yml` file
6. Add environment variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
7. Click **Deploy the stack**

### Method 2: Using Portainer Containers

1. Log in to Portainer
2. Navigate to **Images** → **Build a new image**
3. Name the image (e.g., "kitchenry:latest")
4. Upload the Dockerfile or build from Git
5. Navigate to **Containers** → **Add container**
6. Configure:
   - **Name**: kitchenry
   - **Image**: kitchenry:latest
   - **Port mapping**: `3000:80`
   - **Environment variables**:
     - `REACT_APP_SUPABASE_URL=https://your-project.supabase.co`
     - `REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here`
   - **Restart policy**: Unless stopped
7. Click **Deploy the container**

## Configuration Options

### Port Configuration

To change the port, modify the `docker-compose.yml` or container settings:

```yaml
ports:
  - "8080:80"  # Change 8080 to your desired port
```

### Custom Domain

If you're using a reverse proxy (nginx, Traefik, Caddy):

1. Don't expose port 3000 publicly
2. Configure your reverse proxy to forward to `container_name:80`
3. Add SSL/TLS certificates in your reverse proxy

Example nginx config:

```nginx
server {
    listen 80;
    server_name kitchenry.yourdomain.com;

    location / {
        proxy_pass http://kitchenry:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Updating the Application

### Using Docker Compose

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Using Portainer

1. Navigate to **Stacks** or **Containers**
2. Select your kitchenry stack/container
3. Click **Pull and redeploy**
   - OR rebuild the image in **Images** section
4. Restart the container

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs kitchenry
```

Or in Portainer: **Containers** → Select container → **Logs**

### Can't connect to Supabase

1. Verify environment variables are set correctly
2. Check Supabase URL is accessible from the container
3. Verify API keys are valid

### Port already in use

Change the port in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Use a different port
```

## Maintenance

### View logs
```bash
docker-compose logs -f
```

### Restart container
```bash
docker-compose restart
```

### Stop container
```bash
docker-compose down
```

### Remove everything (including volumes)
```bash
docker-compose down -v
```

## Production Recommendations

1. Use a reverse proxy with SSL/TLS (Let's Encrypt)
2. Set up automated backups of your Supabase data
3. Monitor container health and logs
4. Use secrets management for environment variables
5. Implement rate limiting at the reverse proxy level
6. Regular security updates for the base image

## Support

For issues or questions:
- Check the logs first
- Verify Supabase connection
- Ensure environment variables are set correctly
- Check firewall and network settings
