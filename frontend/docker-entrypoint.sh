#!/bin/sh

echo "========================================="
echo "Mise Frontend - Runtime Configuration"
echo "========================================="

# Replace placeholders in runtime config file
CONFIG_FILE="/usr/share/nginx/html/config.js"

if [ -f "$CONFIG_FILE" ]; then
  echo "✓ Found config.js, injecting environment variables..."

  # Replace backend URL
  if [ -n "$REACT_APP_BACKEND_URL" ]; then
    echo "  • Backend URL: $REACT_APP_BACKEND_URL"
    sed -i "s|__REACT_APP_BACKEND_URL__|${REACT_APP_BACKEND_URL}|g" "$CONFIG_FILE"
  else
    echo "  ⚠ Warning: REACT_APP_BACKEND_URL not set"
  fi

  # Replace OpenPanel URL
  if [ -n "$REACT_APP_OPENPANEL_URL" ]; then
    echo "  • OpenPanel URL: $REACT_APP_OPENPANEL_URL"
    sed -i "s|__REACT_APP_OPENPANEL_URL__|${REACT_APP_OPENPANEL_URL}|g" "$CONFIG_FILE"
  else
    sed -i "s|__REACT_APP_OPENPANEL_URL__|''|g" "$CONFIG_FILE"
  fi

  # Replace OpenPanel Client ID
  if [ -n "$REACT_APP_OPENPANEL_CLIENT_ID" ]; then
    echo "  • OpenPanel Client ID: ${REACT_APP_OPENPANEL_CLIENT_ID:0:8}..."
    sed -i "s|__REACT_APP_OPENPANEL_CLIENT_ID__|${REACT_APP_OPENPANEL_CLIENT_ID}|g" "$CONFIG_FILE"
  else
    sed -i "s|__REACT_APP_OPENPANEL_CLIENT_ID__|''|g" "$CONFIG_FILE"
  fi

  echo "✓ Runtime configuration complete"
else
  echo "✗ Error: config.js not found at $CONFIG_FILE"
  exit 1
fi

# Also replace OpenPanel placeholders in index.html for backwards compatibility
if [ -f "/usr/share/nginx/html/index.html" ]; then
  echo "✓ Injecting OpenPanel config into index.html..."
  sed -i "s|__REACT_APP_OPENPANEL_URL__|${REACT_APP_OPENPANEL_URL:-}|g" /usr/share/nginx/html/index.html
  sed -i "s|__REACT_APP_OPENPANEL_CLIENT_ID__|${REACT_APP_OPENPANEL_CLIENT_ID:-}|g" /usr/share/nginx/html/index.html
fi

echo "========================================="
echo "Starting nginx..."
echo "========================================="

# Execute the CMD
exec "$@"
