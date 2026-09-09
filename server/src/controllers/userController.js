const { pool } = require('../config/database');
const { hashPassword } = require('../utils/password');

const getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT id, full_name, username, email, role, status, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (full_name LIKE ? OR username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Count total
    const countQuery = query.replace('SELECT id, full_name, username, email, role, status, created_at, updated_at', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, full_name, username, email, role, status, created_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { full_name, username, email, password, role, status } = req.body;

    if (!full_name || !username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const hashedPassword = await hashPassword(password);

    const [result] = await pool.query(
      'INSERT INTO users (full_name, username, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, username, email, hashedPassword, role, status || 'active']
    );

    // If creating a student or teacher, create their profile too
    if (role === 'student') {
      const studentId = `STD-${String(result.insertId).padStart(3, '0')}`;
      await pool.query(
        'INSERT INTO students (user_id, student_id, class_id) VALUES (?, ?, ?)',
        [result.insertId, studentId, req.body.class_id || null]
      );
    } else if (role === 'teacher') {
      const employeeId = `TCH-${String(result.insertId).padStart(3, '0')}`;
      await pool.query(
        'INSERT INTO teachers (user_id, employee_id, department) VALUES (?, ?, ?)',
        [result.insertId, employeeId, req.body.department || null]
      );
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { full_name, username, email, role, status, password } = req.body;
    const userId = req.params.id;

    let query = 'UPDATE users SET full_name = ?, username = ?, email = ?, role = ?, status = ?';
    const params = [full_name, username, email, role, status];

    if (password) {
      const hashedPassword = await hashPassword(password);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update related profile
    if (req.body.class_id !== undefined) {
      await pool.query('UPDATE students SET class_id = ? WHERE user_id = ?', [req.body.class_id, userId]);
    }
    if (req.body.department !== undefined) {
      await pool.query('UPDATE teachers SET department = ? WHERE user_id = ?', [req.body.department, userId]);
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    // Soft delete - deactivate instead
    const [result] = await pool.query(
      "UPDATE users SET status = 'inactive' WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
