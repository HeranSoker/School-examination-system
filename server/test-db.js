const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'school_exam_system'
    });
    console.log("Connected as root!");
    await conn.end();
  } catch (e) {
    console.error("Root failed:", e.message);
  }
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'exam_user',
      password: 'ExamSystem@123',
      database: 'school_exam_system'
    });
    console.log("Connected as exam_user!");
    await conn.end();
  } catch (e) {
    console.error("exam_user failed:", e.message);
  }
})();
