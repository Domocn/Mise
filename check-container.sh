#!/bin/bash

# Diagnostic script to check if environment injection is working

echo "=== Checking Frontend Container Configuration ==="
echo ""

echo "1. Checking environment variable in container:"
docker exec mise-frontend printenv | grep REACT_APP_BACKEND_URL || echo "   Variable not set!"
echo ""

echo "2. Checking if placeholder was replaced in built files:"
docker exec mise-frontend sh -c "grep -r '%REACT_APP_BACKEND_URL%' /usr/share/nginx/html/*.js 2>/dev/null | head -5"
if [ $? -eq 0 ]; then
    echo "   ❌ PROBLEM: Placeholder still exists in built files!"
else
    echo "   ✓ Good: Placeholder was replaced"
fi
echo ""

echo "3. Checking what backend URL is actually in the files:"
docker exec mise-frontend sh -c "grep -o 'http[s]*://[^\"'\'' ]*:8001' /usr/share/nginx/html/static/js/*.js 2>/dev/null | head -3"
echo ""

echo "4. Container logs (last 20 lines):"
docker logs mise-frontend --tail 20
echo ""

echo "=== Recommended Actions ==="
echo "If placeholder still exists:"
echo "  1. Pull latest image: docker pull ghcr.io/domocn/mise-frontend:latest"
echo "  2. Recreate container: docker-compose -f docker-compose.simple.yml up -d frontend"
echo ""
echo "If URL is wrong in files:"
echo "  1. Check your docker-compose.simple.yml has correct REACT_APP_BACKEND_URL"
echo "  2. Restart container: docker-compose -f docker-compose.simple.yml restart frontend"
