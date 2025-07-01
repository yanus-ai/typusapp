#!/bin/bash
set -e

echo "🚀 Deploying to Production..."

# Pull latest code
git pull origin main

# Copy production environment file
cp server/.env.production server/.env

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm ci --production

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build client with production environment
echo "🏗️ Building client..."
cd ../client
npm ci
npm run build:production

# Restart PM2 with production environment
echo "🔄 Restarting application..."
cd ../server
pm2 restart prai-app --env production

# Restart Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl reload nginx

echo "✅ Production deployment complete!"