#!/bin/bash
set -e

echo "🚀 Deploying to Staging..."

# Pull latest code
git pull origin staging

# Copy staging environment file
cp server/.env.staging server/.env

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm ci --production

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build client with staging environment
echo "🏗️ Building client..."
cd ../client
npm ci
npm run build:staging

# Restart PM2 with staging environment
echo "🔄 Restarting application..."
cd ../server
pm2 restart prai-app --env staging

# Restart Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl reload nginx

echo "✅ Staging deployment complete!"