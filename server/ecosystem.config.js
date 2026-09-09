module.exports = {
  apps: [
    {
      name: 'school-exam-api',
      script: 'src/server.js',
      instances: 'max', // Scale to available CPU cores in cluster mode
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
