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
        PORT: 3001,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
    }
  ]
};