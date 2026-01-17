FROM python:3.11-slim

# OCI labels for GitHub Container Registry
LABEL org.opencontainers.image.source="https://github.com/Domocn/Mise"
LABEL org.opencontainers.image.description="Mise Backend - FastAPI server for recipe management"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install system dependencies (curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
