const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const poolConfig = process.env.MYSQL_URL || process.env.DATABASE_URL
  ? {
      uri: process.env.MYSQL_URL || process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    }
  : {
      host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
      user: process.env.MYSQLUSER || process.env.DB_USER || 'exam_user',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'ExamSystem@123',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'school_exam_system',
      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };

const pool = mysql.createPool(poolConfig);

/**
 * Initializes database schema if tables are not present
 */
const initializeSchemaIfEmpty = async () => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    if (tables.length === 0) {
      console.log('📦 Empty database detected. Auto-applying schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        let schema = fs.readFileSync(schemaPath, 'utf8');
        schema = schema.replace(/--.*$/gm, '');
        const statements = schema
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

        for (const stmt of statements) {
          try {
            await pool.query(stmt);
          } catch (err) {
            if (err.code !== 'ER_DUP_ENTRY' && err.code !== 'ER_TABLE_EXISTS_ERROR') {
              console.warn('⚠️ Schema notice:', err.message);
            }
          }
        }
        console.log('✅ Database schema auto-initialized successfully');
      }
    }

    // Auto-seed default admin if users table is empty
    const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0] && userRows[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const adminPass = await bcrypt.hash('admin123', salt);
      await pool.query(
        'INSERT INTO users (full_name, username, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin User', 'admin', 'admin@school.edu', adminPass, 'admin', 'active']
      );
      console.log('✅ Default admin initialized: username "admin" / password "admin123"');
    }
  } catch (err) {
    console.warn('⚠️ Auto-schema/seed verification notice:', err.message);
  }
};

/**
 * Test connection with retry and exponential backoff
 */
const testConnection = async (maxRetries = 5, delay = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log(`✅ MySQL connected successfully to ${process.env.DB_NAME || 'school_exam_system'}`);
      connection.release();

      await initializeSchemaIfEmpty();
      return;
    } catch (error) {
      console.error(`❌ MySQL connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error('💥 All MySQL connection attempts failed. Exiting process.');
        process.exit(1);
      }
    }
  }
};

const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 MySQL connection pool closed cleanly');
  } catch (err) {
    console.error('Error closing MySQL pool:', err);
  }
};

module.exports = { pool, testConnection, closePool };
