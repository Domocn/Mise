# Build & Publish Guide - Runtime Configuration Fix

This guide shows you how to rebuild and publish your frontend image with the fixed runtime configuration system.

## What Was Fixed

The runtime configuration now uses a dedicated `config.js` file instead of trying to replace placeholders in minified JavaScript. This is more reliable and follows industry best practices.

## Testing Locally (Recommended First Step)

Before publishing, test that the build works:

```bash
# Run the comprehensive test
bash test-build.sh
```

This will:
1. Build a test image
2. Check if config.js is present
3. Start a test container
4. Verify placeholders are replaced
5. Test HTTP access

The test container will run on `http://localhost:3002`

If the test passes, proceed to publishing.

## Publishing to GitHub Container Registry

### 1. Build the frontend image

```bash
cd frontend
docker build -t ghcr.io/domocn/mise-frontend:latest .
```

During build, you should see:
- ✓ Verification that config.js exists in /app/build/config.js

### 2. Push to registry

```bash
docker push ghcr.io/domocn/mise-frontend:latest
```

### 3. Pull and test on your server

On your deployment server:

```bash
# Pull the new image
docker pull ghcr.io/domocn/mise-frontend:latest

# Stop existing container
docker-compose -f docker-compose.simple.yml stop frontend

# Remove old container
docker-compose -f docker-compose.simple.yml rm -f frontend

# Start with new image
docker-compose -f docker-compose.simple.yml up -d frontend
```

### 4. Verify it's working

Check the logs to see runtime injection:

```bash
docker logs mise-frontend
```

You should see:
```
=========================================
Mise Frontend - Runtime Configuration
=========================================
✓ Found config.js, injecting environment variables...

Before injection:
window._env_ = {
  REACT_APP_BACKEND_URL: '__REACT_APP_BACKEND_URL__',
  ...
};

  • Backend URL: http://192.168.1.234:8001

After injection:
window._env_ = {
  REACT_APP_BACKEND_URL: 'http://192.168.1.234:8001',
  ...
};

✓ All placeholders replaced successfully
```

### 5. Test in browser

Open your browser console and type:

```javascript
window._env_
```

You should see:
```javascript
{
  REACT_APP_BACKEND_URL: "http://192.168.1.234:8001",
  REACT_APP_OPENPANEL_URL: "",
  REACT_APP_OPENPANEL_CLIENT_ID: ""
}
```

Also check for configuration logs:
```
[Mise Config] Using runtime config URL: http://192.168.1.234:8001
```

## Troubleshooting

### If config.js is missing from the build

Check that `frontend/public/config.js` exists before building:

```bash
ls -la frontend/public/config.js
cat frontend/public/config.js
```

### If placeholders aren't replaced

1. Check environment variable is set in docker-compose.simple.yml
2. Check container logs: `docker logs mise-frontend`
3. Run diagnostic: `bash check-container.sh`

### If frontend can't connect to backend

1. Verify backend URL is correct and accessible
2. Check browser console for `[Mise Config]` logs
3. Try the `/server` page to manually configure the URL

## Diagnostic Scripts

Two helper scripts are available:

### test-build.sh
Comprehensive test that builds and verifies the entire process locally.

```bash
bash test-build.sh
```

### check-container.sh
Quick diagnostic for a running container.

```bash
bash check-container.sh
```

## Configuration Options

Your docker-compose.simple.yml should have:

```yaml
frontend:
  image: ghcr.io/domocn/mise-frontend:latest
  environment:
    - REACT_APP_BACKEND_URL=http://your-server-ip:8001
    # Optional: Add analytics
    # - REACT_APP_OPENPANEL_URL=https://your-analytics.com
    # - REACT_APP_OPENPANEL_CLIENT_ID=your-client-id
```

## Key Benefits

✅ **Single Image for All Environments** - No rebuild needed for different servers
✅ **No Secrets in Image** - API keys injected at runtime, not baked in
✅ **Clear Logging** - See exactly what's injected at startup
✅ **Easy Debugging** - Browser console shows configuration source
✅ **Fallback Option** - Manual config via `/server` page still works

## More Information

See [RUNTIME-CONFIG.md](RUNTIME-CONFIG.md) for detailed technical documentation.
