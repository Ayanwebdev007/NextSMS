#!/bin/bash

echo "=================================================="
echo "🚀 NextSMS Deployment Script"
echo "=================================================="

# Navigate to project root (in case script is run from elsewhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Pull latest code
echo ""
echo "📥 Pulling latest code from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Please resolve conflicts manually."
    exit 1
fi

# 2. Install server dependencies (if package.json changed)
echo ""
echo "📦 Checking server dependencies..."
cd server
npm install --production
cd ..

# 3. Build client
echo ""
echo "🏗️  Building frontend..."
cd client
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed. Check errors above."
    exit 1
fi

cd ..

# 4. Restart PM2
echo ""
echo "🔄 Restarting server..."
pm2 restart nextsms-server

echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  • Check logs with: pm2 logs nextsms-server"
echo "  • Monitor status: pm2 status"
echo ""
