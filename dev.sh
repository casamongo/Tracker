#!/bin/bash
# Script for local development without Docker

set -e

echo "🔧 Starting Jira Update Automation in development mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your actual credentials before running again."
    exit 1
fi

# Backend setup
echo "🐍 Setting up Python backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

echo "  Starting backend on port 8000..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd ..

# Frontend setup
echo "⚛️  Setting up React frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "  Installing npm dependencies..."
    npm install
fi

echo "  Starting frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ Development servers started!"
echo ""
echo "📍 Access points:"
echo "   - Frontend:    http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs:    http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
