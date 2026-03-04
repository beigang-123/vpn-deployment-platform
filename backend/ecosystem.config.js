/**
 * PM2 Ecosystem Configuration File
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 *
 * Monitor:
 *   pm2 monit
 *   pm2 logs vpn-backend
 *
 * Manage:
 *   pm2 restart vpn-backend
 *   pm2 stop vpn-backend
 *   pm2 delete vpn-backend
 */

module.exports = {
  apps: [
    {
      name: 'vpn-backend',

      // Script to run
      script: 'dist/main.js',

      // Interpreter
      interpreter: 'node',

      // Instances (for clustering)
      // Use 'max' to use all CPU cores
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',

      // Auto restart on failure
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Additional options
      pmx: true,
      automation: false,
      treekill: true,
    },
  ],
};
