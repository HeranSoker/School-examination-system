require('dotenv').config();
const app = require('./app');
const { testConnection, closePool } = require('./config/database');

const PORT = process.env.PORT || 5000;

/**
 * Validate required environment variables before boot
 */
const validateEnvironment = () => {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET was not set. Using a fallback secret. Please set JWT_SECRET in your Railway environment variables!');
    process.env.JWT_SECRET = 'school_exam_system_prod_jwt_secret_key_change_me_later_123';
  }

  const hasDbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  const hasDbHost = process.env.DB_HOST || process.env.MYSQLHOST;
  const hasDbUser = process.env.DB_USER || process.env.MYSQLUSER;
  const hasDbName = process.env.DB_NAME || process.env.MYSQLDATABASE;

  if (!hasDbUrl && (!hasDbHost || !hasDbUser || !hasDbName)) {
    console.error('❌ FATAL: Missing required database environment variables (DB_HOST, DB_USER, DB_NAME or MYSQL_URL / MYSQLHOST).');
    console.error('Please configure them in your .env file or deployment environment.');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_in_production_2024') {
    console.warn('⚠️ WARNING: Using default development JWT_SECRET in production! Please set a unique secret.');
  }
};

let server;

const startServer = async () => {
  validateEnvironment();
  await testConnection();

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  });
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      console.log('🔌 HTTP server closed.');
      await closePool();
      console.log('👋 Process terminated gracefully.');
      process.exit(0);
    });

    // Force close after 10 seconds if hanging
    setTimeout(() => {
      console.error('⚠️ Forcefully shutting down due to timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

startServer();
