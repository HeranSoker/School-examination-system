const { pool } = require('../config/database');
const { hashPassword } = require('../utils/password');

const getTeachers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.id, t.employee_id, t.department, t.user_id,
             u.full_name, u.username, u.email, u.status, u.created_at,
             (SELECT COUNT(*) FROM exams WHERE teacher_id = t.id) as exam_count
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (u.full_name LIKE ? OR t.employee_id LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace(/SELECT[\s\S]*?FROM teachers/, 'SELECT COUNT(*) as total FROM teachers');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [teachers] = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        teachers,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTeacher = async (req, res, next) => {
  try {
    const [teachers] = await pool.query(
      `SELECT t.*, u.full_name, u.username, u.email, u.status
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (teachers.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.json({ success: true, data: teachers[0] });
  } catch (error) {
    next(error);
  }
};

const createTeacher = async (req, res, next) => {
  try {
    const { full_name, username, email, password, department } = req.body;

    if (!full_name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const hashedPassword = await hashPassword(password);

    const [userResult] = await pool.query(
      "INSERT INTO users (full_name, username, email, password, role, status) VALUES (?, ?, ?, ?, 'teacher', 'active')",
      [full_name, username, email, hashedPassword]
    );

    const employeeId = `TCH-${String(userResult.insertId).padStart(3, '0')}`;

    const [teacherResult] = await pool.query(
      'INSERT INTO teachers (user_id, employee_id, department) VALUES (?, ?, ?)',
      [userResult.insertId, employeeId, department || null]
    );

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: { id: teacherResult.insertId, employee_id: employeeId },
    });
  } catch (error) {
    next(error);
  }
};

const updateTeacher = async (req, res, next) => {
  try {
    const { full_name, username, email, department, status, password } = req.body;
    const teacherId = req.params.id;

    const [teacher] = await pool.query('SELECT user_id FROM teachers WHERE id = ?', [teacherId]);
    if (teacher.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    let userQuery = 'UPDATE users SET full_name = ?, username = ?, email = ?, status = ?';
    const userParams = [full_name, username, email, status || 'active'];

    if (password) {
      const hashed = await hashPassword(password);
      userQuery += ', password = ?';
      userParams.push(hashed);
    }

    userQuery += ' WHERE id = ?';
    userParams.push(teacher[0].user_id);

    await pool.query(userQuery, userParams);
    await pool.query('UPDATE teachers SET department = ? WHERE id = ?', [department || null, teacherId]);

    res.json({ success: true, message: 'Teacher updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteTeacher = async (req, res, next) => {
  try {
    const [teacher] = await pool.query('SELECT user_id FROM teachers WHERE id = ?', [req.params.id]);
    if (teacher.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    await pool.query("UPDATE users SET status = 'inactive' WHERE id = ?", [teacher[0].user_id]);

    res.json({ success: true, message: 'Teacher deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTeachers, getTeacher, createTeacher, updateTeacher, deleteTeacher };
