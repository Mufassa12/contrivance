#!/bin/bash

# Development setup script for Contrivance

set -e

echo "🚀 Setting up Contrivance development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first."
    echo "Visit https://rustup.rs/ for installation instructions."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://contrivance_user:contrivance_password@localhost:5432/contrivance

# JWT Configuration (Change in production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-please

# Service URLs
AUTH_SERVICE_URL=http://localhost:8001
USER_SERVICE_URL=http://localhost:8002
CONTRIVANCE_SERVICE_URL=http://localhost:8003

# Service Ports
PORT=8080

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60

# Logging
RUST_LOG=info

# Frontend
REACT_APP_API_URL=http://localhost:8080
EOF
    echo "✅ Created .env file with default values"
    echo "⚠️  IMPORTANT: Change JWT_SECRET before deploying to production!"
fi

# Build Rust workspace
echo "🔨 Building Rust workspace..."
cargo build

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "🐳 To start all services with Docker:"
echo "   docker-compose up -d"
echo ""
echo "🔧 To run services individually for development:"
echo "   # Start database first:"
echo "   docker-compose up -d postgres redis"
echo ""
echo "   # Then start each service in separate terminals:"
echo "   cargo run --bin auth-service"
echo "   cargo run --bin user-service" 
echo "   cargo run --bin contrivance-service"
echo "   cargo run --bin gateway-service"
echo ""
echo "   # And the frontend:"
echo "   cd frontend && npm start"
echo ""
echo "🌐 Access points:"
echo "   - Frontend: http://localhost:3000"
echo "   - API Gateway: http://localhost:8080"
echo "   - Auth Service: http://localhost:8001"
echo "   - User Service: http://localhost:8002"
echo "   - Contrivance Service: http://localhost:8003"
echo "   - Database: localhost:5432"
echo ""
echo "📖 See README.md for more detailed instructions"