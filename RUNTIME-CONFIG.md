# Runtime Configuration System

This document explains how Mise handles runtime environment variable injection for Docker deployments.

## Overview

The frontend application needs to know the backend API URL at runtime, but Docker images are built once and deployed to different environments. We solve this using **runtime configuration injection** via a `config.js` file.

## How It Works

### 1. Build Time

When the Docker image is built:

- A `public/config.js` file is created with placeholder values
- The file is copied to `/usr/share/nginx/html/config.js` in the image
- Placeholders look like: `__REACT_APP_BACKEND_URL__`

### 2. Container Startup

When a container starts:

- The entrypoint script (`docker-entrypoint.sh`) runs first
- It reads environment variables from the container
- It replaces placeholders in `config.js` with actual values
- Then nginx starts and serves the application

### 3. Runtime

When the React app loads:

- `index.html` loads `config.js` before the React bundle
- Configuration is available at `window._env_`
- The app reads `window._env_.REACT_APP_BACKEND_URL`

## Configuration Priority

The app checks for backend URL in this order:

1. **User Config** - From localStorage (set via `/server` page)
2. **Runtime Env** - From `window._env_.REACT_APP_BACKEND_URL` (injected at startup)
3. **Build Env** - From `process.env.REACT_APP_BACKEND_URL` (for local dev)
4. **None** - Redirects to `/server` config page

## Environment Variables

### Required

- `REACT_APP_BACKEND_URL` - Backend API URL (e.g., `http://192.168.1.234:8001`)

### Optional

- `REACT_APP_OPENPANEL_URL` - OpenPanel analytics URL
- `REACT_APP_OPENPANEL_CLIENT_ID` - OpenPanel client ID

## Docker Compose Configuration

### Simple Deployment (docker-compose.simple.yml)

```yaml
services:
  frontend:
    image: ghcr.io/domocn/mise-frontend:latest
    environment:
      - REACT_APP_BACKEND_URL=http://192.168.1.234:8001
```

### Full Deployment (docker-compose.yml)

```yaml
services:
  frontend:
    image: ghcr.io/domocn/mise-frontend:latest
    environment:
      - REACT_APP_BACKEND_URL=http://your-domain.com
      - REACT_APP_OPENPANEL_URL=https://analytics.example.com
      - REACT_APP_OPENPANEL_CLIENT_ID=your-client-id
```

## Troubleshooting

### Check Configuration

Run the diagnostic script:

```bash
bash check-container.sh
```

This will verify:
- Environment variables are set
- config.js exists
- Placeholders were replaced
- Startup logs show successful injection

### Manual Inspection

Check config.js content:

```bash
docker exec mise-frontend cat /usr/share/nginx/html/config.js
```

Should show:
```javascript
window._env_ = {
  REACT_APP_BACKEND_URL: 'http://192.168.1.234:8001',
  REACT_APP_OPENPANEL_URL: '',
  REACT_APP_OPENPANEL_CLIENT_ID: ''
};
```

### Browser Console

Open browser console and type:
```javascript
window._env_
```

Should show the injected configuration.

### Common Issues

**Problem**: Placeholders still showing (`__REACT_APP_BACKEND_URL__`)

**Solution**:
1. Check environment variable is set in docker-compose.yml
2. Restart container: `docker-compose restart frontend`
3. Check logs: `docker logs mise-frontend`

**Problem**: Frontend can't connect to backend

**Solution**:
1. Verify backend URL is correct and accessible
2. Check backend container is running
3. Verify no firewall blocking the connection
4. Use `/server` page to manually configure URL

## Publishing the Image

When building and publishing the Docker image:

1. **No environment variables needed during build**:
   ```bash
   docker build -t ghcr.io/domocn/mise-frontend:latest ./frontend
   ```

2. **Placeholders will be automatically injected at runtime**:
   - The image contains config.js with placeholders
   - The entrypoint script handles injection when container starts

3. **Users configure via docker-compose.yml**:
   - Users only need to set environment variables in their compose file
   - No rebuilding required for different environments

## Benefits

✅ **Single Image** - One image works for all environments
✅ **No Rebuilds** - Change config without rebuilding
✅ **No Secrets in Image** - API keys injected at runtime, not baked in
✅ **Easy Updates** - Pull new image, restart with same config
✅ **Fallback Option** - Manual config via `/server` page still works

## Files Involved

- `frontend/public/config.js` - Template with placeholders
- `frontend/docker-entrypoint.sh` - Injection script
- `frontend/src/lib/api.js` - Reads from `window._env_`
- `frontend/public/index.html` - Loads config.js
- `docker-compose.simple.yml` - Example configuration
