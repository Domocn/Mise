# Quick Start Guide

## Fix the "White Screen" Issue

Your `.env` file has been configured with the correct backend URL. Now restart your Docker containers:

```bash
# Stop all containers
docker-compose down

# Rebuild and start (this will inject the backend URL into the frontend)
docker-compose up -d --build
```

The frontend will now be configured to connect to `http://192.168.1.234:8001`.

## What Was Fixed

1. **Added `.env` file** with the correct `BACKEND_URL=http://192.168.1.234:8001`
2. Docker Compose will automatically read this file
3. The frontend container will inject this URL at runtime using the `docker-entrypoint.sh` script
4. Your browser will now connect to the correct backend

## Verify It's Working

1. Open your browser to wherever the frontend is running (e.g., `http://192.168.1.234:3000`)
2. You should see the Mise landing page with "Your Family's Recipe Haven"
3. Click "Get Started" to create an account

## If Still Having Issues

Check the browser console (F12) for any errors, and verify:
- Backend is accessible at: `http://192.168.1.234:8001/api/health`
- MongoDB container is running: `docker ps | grep mise-db`
- Frontend container is running: `docker ps | grep mise-frontend`
