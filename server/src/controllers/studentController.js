const { pool } = require('../config/database');
const { hashPassword } = require('../utils/password');

const getStudents = async (req, res, next) => {
  try {
    const { class_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.id, s.student_id, s.class_id, s.user_id,
             u.full_name, u.username, u.email, u.status, u.created_at,
             c.name as class_name, c.grade, c.section
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (class_id) {
      query += ' AND s.class_id = ?';
      params.push(class_id);
    }
    if (search) {
      query += ' AND (u.full_name LIKE ? OR s.student_id LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [students] = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        students,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStudent = async (req, res, next) => {
  try {
    const [students] = await pool.query(
      `SELECT s.*, u.full_name, u.username, u.email, u.status,
              c.name as class_name, c.grade, c.section
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: students[0] });
  } catch (error) {
    next(error);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const { full_name, username, email, password, class_id } = req.body;

    if (!full_name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const hashedPassword = await hashPassword(password);

    const [userResult] = await pool.query(
      "INSERT INTO users (full_name, username, email, password, role, status) VALUES (?, ?, ?, ?, 'student', 'active')",
      [full_name, username, email, hashedPassword]
    );

    const studentId = `STD-${String(userResult.insertId).padStart(3, '0')}`;

    const [studentResult] = await pool.query(
      'INSERT INTO students (user_id, student_id, class_id) VALUES (?, ?, ?)',
      [userResult.insertId, studentId, class_id || null]
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: { id: studentResult.insertId, student_id: studentId },
    });
  } catch (error) {
    next(error);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const { full_name, username, email, class_id, status, password } = req.body;
    const studentId = req.params.id;

    // Get user_id from students table
    const [student] = await pool.query('SELECT user_id FROM students WHERE id = ?', [studentId]);
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    let userQuery = 'UPDATE users SET full_name = ?, username = ?, email = ?, status = ?';
    const userParams = [full_name, username, email, status || 'active'];

    if (password) {
      const hashed = await hashPassword(password);
      userQuery += ', password = ?';
      userParams.push(hashed);
    }

    userQuery += ' WHERE id = ?';
    userParams.push(student[0].user_id);

    await pool.query(userQuery, userParams);
    await pool.query('UPDATE students SET class_id = ? WHERE id = ?', [class_id || null, studentId]);

    res.json({ success: true, message: 'Student updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT user_id FROM students WHERE id = ?', [req.params.id]);
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await pool.query("UPDATE users SET status = 'inactive' WHERE id = ?", [student[0].user_id]);

    res.json({ success: true, message: 'Student deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent };
