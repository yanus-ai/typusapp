// server/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'prai-app',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        // PM2 will load from .env.production file
      },
      env_staging: {
        NODE_ENV: 'staging',
        // PM2 will load from .env.staging file
      }
    }
  ]
};