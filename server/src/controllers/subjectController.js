const { pool } = require('../config/database');

const getSubjects = async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT s.*,
             (SELECT COUNT(*) FROM exams WHERE subject_id = s.id) as exam_count
      FROM subjects s WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (s.name LIKE ? OR s.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY s.name';

    const [subjects] = await pool.query(query, params);

    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
};

const getSubject = async (req, res, next) => {
  try {
    const [subjects] = await pool.query(
      `SELECT s.*, (SELECT COUNT(*) FROM exams WHERE subject_id = s.id) as exam_count
       FROM subjects s WHERE s.id = ?`,
      [req.params.id]
    );

    if (subjects.length === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, data: subjects[0] });
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO subjects (name, code, description) VALUES (?, ?, ?)',
      [name, code, description || null]
    );

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

const updateSubject = async (req, res, next) => {
  try {
    const { name, code, description, status } = req.body;

    const [result] = await pool.query(
      'UPDATE subjects SET name = ?, code = ?, description = ?, status = ? WHERE id = ?',
      [name, code, description, status || 'active', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, message: 'Subject updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteSubject = async (req, res, next) => {
  try {
    const [exams] = await pool.query(
      'SELECT COUNT(*) as count FROM exams WHERE subject_id = ?',
      [req.params.id]
    );

    if (exams[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subject with associated exams.',
      });
    }

    const [result] = await pool.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSubjects, getSubject, createSubject, updateSubject, deleteSubject };
