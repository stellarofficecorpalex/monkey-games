#!/bin/bash

# Monkey Games Auto-Installer
# Run this on your server: curl -sSL https://... | bash

set -e

echo "🐵 Installing Monkey Games..."

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install PM2
npm install -g pm2

# Create app directory
mkdir -p /opt/monkey-games
cd /opt/monkey-games

# Download project (placeholder - user will need to upload)
echo "📁 Project files should be uploaded to /opt/monkey-games"

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..

# Create .env file
if [ ! -f apps/backend/.env ]; then
    cp apps/backend/.env.example apps/backend/.env
    echo "⚠️  Please edit /opt/monkey-games/apps/backend/.env with your settings"
fi

# Start databases
echo "🗄️  Starting databases..."
docker-compose up -d

# Wait for databases
sleep 10

# Build
echo "🔨 Building project..."
npm run build

# Start with PM2
echo "🚀 Starting services..."
pm2 start npm --name "monkey-backend" -- run start:backend
pm2 start npm --name "monkey-frontend" -- run start:frontend
pm2 save
pm2 startup

echo ""
echo "✅ Installation complete!"
echo ""
echo "🌐 Frontend: http://YOUR_SERVER_IP:3001"
echo "🔧 Backend:  http://YOUR_SERVER_IP:3000"
echo "📚 API Docs: http://YOUR_SERVER_IP:3000/api/docs"
echo ""
echo "🔐 Admin login: admin / admin123"
echo ""
echo "Next steps:"
echo "1. Edit .env: nano /opt/monkey-games/apps/backend/.env"
echo "2. Restart: pm2 restart all"
echo ""
