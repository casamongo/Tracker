#!/bin/bash
# Script to build and start all services with Docker Compose

set -e

echo "🏗️  Building Jira Update Automation..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your actual credentials before running again."
    exit 1
fi

# Check if service account file exists
if [ ! -f config/service-account.json ]; then
    echo "⚠️  Warning: config/service-account.json not found."
    echo "   Please place your Google Service Account JSON file there."
fi

# Build and start services
echo "📦 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "✅ All services started!"
echo ""
echo "📍 Access points:"
echo "   - Frontend:    http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs:    http://localhost:8000/docs"
echo "   - Nginx:       http://localhost:80"
echo ""
echo "📊 View logs with: docker-compose logs -f"
echo "🛑 Stop services with: docker-compose down"
