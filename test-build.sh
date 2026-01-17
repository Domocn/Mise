#!/bin/bash

# Script to test the Docker build and runtime configuration

set -e

echo "========================================="
echo "Mise Frontend - Build & Runtime Test"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
TEST_BACKEND_URL="http://192.168.1.234:8001"
TEST_IMAGE="mise-frontend-test"

echo "Step 1: Checking if config.js exists in source..."
if [ -f "frontend/public/config.js" ]; then
    echo -e "${GREEN}✓${NC} config.js found in frontend/public/"
    echo "Content:"
    cat frontend/public/config.js
else
    echo -e "${RED}✗${NC} config.js NOT FOUND in frontend/public/"
    exit 1
fi
echo ""

echo "Step 2: Building Docker image..."
docker build -t $TEST_IMAGE ./frontend
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Docker build successful"
else
    echo -e "${RED}✗${NC} Docker build failed"
    exit 1
fi
echo ""

echo "Step 3: Checking if config.js exists in built image..."
docker run --rm $TEST_IMAGE ls -la /usr/share/nginx/html/config.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} config.js found in image"
else
    echo -e "${RED}✗${NC} config.js NOT FOUND in image"
    exit 1
fi
echo ""

echo "Step 4: Checking config.js content in image (before injection)..."
echo "Should contain placeholders like __REACT_APP_BACKEND_URL__"
docker run --rm $TEST_IMAGE cat /usr/share/nginx/html/config.js
echo ""

echo "Step 5: Starting test container with environment variable..."
docker rm -f mise-frontend-test 2>/dev/null || true
docker run -d \
  --name mise-frontend-test \
  -e REACT_APP_BACKEND_URL=$TEST_BACKEND_URL \
  -p 3002:80 \
  $TEST_IMAGE

echo "Waiting for container to start..."
sleep 3
echo ""

echo "Step 6: Checking container logs..."
docker logs mise-frontend-test
echo ""

echo "Step 7: Checking config.js after runtime injection..."
echo "Should show actual URL, not placeholder"
docker exec mise-frontend-test cat /usr/share/nginx/html/config.js
echo ""

echo "Step 8: Verifying placeholders were replaced..."
PLACEHOLDERS=$(docker exec mise-frontend-test grep -o '__[A-Z_]*__' /usr/share/nginx/html/config.js 2>/dev/null || echo "")
if [ -z "$PLACEHOLDERS" ]; then
    echo -e "${GREEN}✓${NC} All placeholders replaced successfully"
else
    echo -e "${RED}✗${NC} Found unreplaced placeholders:"
    echo "$PLACEHOLDERS"
fi
echo ""

echo "Step 9: Testing HTTP access..."
sleep 2
curl -s http://localhost:3002/config.js | head -10
echo ""

echo "Step 10: Checking if config.js loads in browser..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/config.js)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} config.js is accessible via HTTP (status: 200)"
else
    echo -e "${RED}✗${NC} config.js returned status: $RESPONSE"
fi
echo ""

echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}✓${NC} If all steps passed, the build is working correctly"
echo -e "${YELLOW}→${NC} Access test app at: http://localhost:3002"
echo -e "${YELLOW}→${NC} Check browser console for: [Mise Config] logs"
echo ""
echo "To clean up:"
echo "  docker stop mise-frontend-test"
echo "  docker rm mise-frontend-test"
echo "  docker rmi $TEST_IMAGE"
echo ""
