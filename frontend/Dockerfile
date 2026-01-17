# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build argument for backend URL - use placeholder for runtime injection
# The actual URL will be injected by docker-entrypoint.sh at container startup
ARG REACT_APP_BACKEND_URL=%REACT_APP_BACKEND_URL%
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# OCI labels for GitHub Container Registry
LABEL org.opencontainers.image.source="https://github.com/Domocn/Mise"
LABEL org.opencontainers.image.description="Mise Frontend - React web application for recipe management"
LABEL org.opencontainers.image.licenses="MIT"

# Copy built files
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
