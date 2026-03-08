/**
 * PM2 Ecosystem Configuration
 *
 * Used on the production server to start, reload, and manage the API process.
 * Deploy with: pm2 start ecosystem.config.js --env production
 * Reload with: pm2 reload ecosystem.config.js --env production
 */
module.exports = {
  apps: [
    {
      name: 'wordmaster-api',
      script: 'src/server.js',
      cwd: '/home/ubuntu/Wordmaster/backend',
      instances: 1,
      exec_mode: 'fork',
      node_args: '--max-old-space-size=512',

      // Environment — secrets are kept in .env on the server, not here
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Restart policy
      watch: false,
      max_memory_restart: '400M',
      restart_delay: 2000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      out_file: '/home/ubuntu/.pm2/logs/wordmaster-api-out.log',
      error_file: '/home/ubuntu/.pm2/logs/wordmaster-api-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
