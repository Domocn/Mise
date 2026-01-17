#!/bin/bash

# Diagnostic script to check if runtime configuration injection is working

echo "========================================="
echo "Mise Frontend - Configuration Check"
echo "========================================="
echo ""

echo "1. Checking environment variable in container:"
ENV_VAR=$(docker exec mise-frontend printenv REACT_APP_BACKEND_URL 2>/dev/null)
if [ -z "$ENV_VAR" ]; then
    echo "   ❌ REACT_APP_BACKEND_URL not set in container!"
else
    echo "   ✓ REACT_APP_BACKEND_URL = $ENV_VAR"
fi
echo ""

echo "2. Checking if config.js exists:"
docker exec mise-frontend test -f /usr/share/nginx/html/config.js && echo "   ✓ config.js exists" || echo "   ❌ config.js NOT FOUND!"
echo ""

echo "3. Checking config.js content:"
docker exec mise-frontend cat /usr/share/nginx/html/config.js 2>/dev/null | head -10
echo ""

echo "4. Checking for unreplaced placeholders in config.js:"
PLACEHOLDERS=$(docker exec mise-frontend grep -o '__[A-Z_]*__' /usr/share/nginx/html/config.js 2>/dev/null)
if [ -n "$PLACEHOLDERS" ]; then
    echo "   ❌ PROBLEM: Found unreplaced placeholders:"
    echo "$PLACEHOLDERS"
else
    echo "   ✓ Good: All placeholders were replaced"
fi
echo ""

echo "5. Container startup logs:"
docker logs mise-frontend 2>&1 | grep -A 20 "Mise Frontend"
echo ""

echo "========================================="
echo "Recommendations"
echo "========================================="

if [ -z "$ENV_VAR" ]; then
    echo "❌ Environment variable not set:"
    echo "   Check docker-compose.simple.yml has REACT_APP_BACKEND_URL defined"
    echo ""
fi

if [ -n "$PLACEHOLDERS" ]; then
    echo "❌ Placeholders not replaced:"
    echo "   1. Check the entrypoint script ran successfully (see logs above)"
    echo "   2. Restart container: docker-compose -f docker-compose.simple.yml restart frontend"
    echo "   3. If issue persists, rebuild: docker-compose -f docker-compose.simple.yml up -d --force-recreate frontend"
    echo ""
fi

echo "To test in browser:"
echo "   1. Open http://$(hostname -I | awk '{print $1}'):3001"
echo "   2. Open browser console and type: window._env_"
echo "   3. Verify REACT_APP_BACKEND_URL shows correct value"
echo ""
