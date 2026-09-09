const { pool } = require('../config/database');

const getClasses = async (req, res, next) => {
  try {
    const { academic_year, search } = req.query;

    let query = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
      FROM classes c WHERE 1=1
    `;
    const params = [];

    if (academic_year) {
      query += ' AND c.academic_year = ?';
      params.push(academic_year);
    }
    if (search) {
      query += ' AND (c.name LIKE ? OR c.grade LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY c.grade, c.section';

    const [classes] = await pool.query(query, params);

    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
};

const getClass = async (req, res, next) => {
  try {
    const [classes] = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
       FROM classes c WHERE c.id = ?`,
      [req.params.id]
    );

    if (classes.length === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Get students in class
    const [students] = await pool.query(
      `SELECT s.id, s.student_id, u.full_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ? AND u.status = 'active'
       ORDER BY u.full_name`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...classes[0], students } });
  } catch (error) {
    next(error);
  }
};

const createClass = async (req, res, next) => {
  try {
    const { name, grade, section, academic_year } = req.body;

    if (!name || !grade || !section || !academic_year) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO classes (name, grade, section, academic_year) VALUES (?, ?, ?, ?)',
      [name, grade, section, academic_year]
    );

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    const { name, grade, section, academic_year, status } = req.body;

    const [result] = await pool.query(
      'UPDATE classes SET name = ?, grade = ?, section = ?, academic_year = ?, status = ? WHERE id = ?',
      [name, grade, section, academic_year, status || 'active', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true, message: 'Class updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    // Check if class has students
    const [students] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [req.params.id]
    );

    if (students[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete class with enrolled students. Please reassign students first.',
      });
    }

    const [result] = await pool.query('DELETE FROM classes WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClasses, getClass, createClass, updateClass, deleteClass };
