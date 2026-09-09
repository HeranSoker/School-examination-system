const { pool } = require('../config/database');

const getResults = async (req, res, next) => {
  try {
    const { exam_id, student_id, published } = req.query;

    let query = `
      SELECT r.*, r.obtained_marks as marks_obtained,
             (CASE WHEN e.pass_marks IS NOT NULL THEN (r.obtained_marks >= e.pass_marks) ELSE (r.percentage >= 50) END) as is_passed,
             e.title as exam_title, s.name as subject_name,
             u.full_name as student_name, st.student_id as student_code
      FROM results r
      JOIN exams e ON r.exam_id = e.id
      JOIN subjects s ON e.subject_id = s.id
      JOIN students st ON r.student_id = st.id
      JOIN users u ON st.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (student.length > 0) {
        query += ' AND r.student_id = ?';
        params.push(student[0].id);
      }
    }

    if (exam_id) { query += ' AND r.exam_id = ?'; params.push(exam_id); }
    if (student_id) { query += ' AND r.student_id = ?'; params.push(student_id); }
    if (published !== undefined) { query += ' AND r.published = ?'; params.push(published === 'true'); }

    query += ' ORDER BY r.created_at DESC';

    const [results] = await pool.query(query, params);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

const getResult = async (req, res, next) => {
  try {
    const lookupId = req.params.id;
    const [results] = await pool.query(
      `SELECT r.*, r.obtained_marks as marks_obtained,
              (CASE WHEN e.pass_marks IS NOT NULL THEN (r.obtained_marks >= e.pass_marks) ELSE (r.percentage >= 50) END) as is_passed,
              e.title as exam_title, e.duration_minutes, e.instructions,
              s.name as subject_name, u.full_name as student_name, st.student_id as student_code,
              ea.started_at, ea.submitted_at, ea.status as attempt_status
       FROM results r
       JOIN exam_attempts ea ON r.attempt_id = ea.id
       JOIN exams e ON r.exam_id = e.id
       JOIN subjects s ON e.subject_id = s.id
       JOIN students st ON r.student_id = st.id
       JOIN users u ON st.user_id = u.id
       WHERE r.id = ? OR r.attempt_id = ?`,
      [lookupId, lookupId]
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    // Check access
    if (req.user.role === 'student') {
      const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (student.length === 0 || results[0].student_id !== student[0].id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Get answers with question details
    const [answers] = await pool.query(
      `SELECT a.*, q.question_text, q.question_type, q.marks as question_marks,
              qo.option_text as selected_option_text
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       LEFT JOIN question_options qo ON a.selected_option_id = qo.id
       WHERE a.attempt_id = ?
       ORDER BY q.order_number`,
      [results[0].attempt_id]
    );

    res.json({ success: true, data: { ...results[0], answers } });
  } catch (error) {
    next(error);
  }
};

const getExamResults = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const [results] = await pool.query(
      `SELECT r.*, r.obtained_marks as marks_obtained,
              (CASE WHEN e.pass_marks IS NOT NULL THEN (r.obtained_marks >= e.pass_marks) ELSE (r.percentage >= 50) END) as is_passed,
              u.full_name as student_name, st.student_id as student_code,
              c.name as class_name
       FROM results r
       JOIN exams e ON r.exam_id = e.id
       JOIN students st ON r.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN classes c ON st.class_id = c.id
       WHERE r.exam_id = ?
       ORDER BY r.percentage DESC`,
      [examId]
    );

    // Stats
    const stats = {
      total_students: results.length,
      average: results.length > 0 ? results.reduce((s, r) => s + parseFloat(r.percentage), 0) / results.length : 0,
      highest: results.length > 0 ? Math.max(...results.map(r => parseFloat(r.percentage))) : 0,
      lowest: results.length > 0 ? Math.min(...results.map(r => parseFloat(r.percentage))) : 0,
      passed: results.filter(r => parseFloat(r.percentage) >= 50).length,
      failed: results.filter(r => parseFloat(r.percentage) < 50).length,
    };

    res.json({ success: true, data: { results, stats } });
  } catch (error) {
    next(error);
  }
};

const getStudentResults = async (req, res, next) => {
  try {
    let resolvedStudentId = req.params.studentId;

    // Resolve studentId whether given user_id or students table id
    const [studentProfile] = await pool.query(
      'SELECT id FROM students WHERE id = ? OR user_id = ?',
      [resolvedStudentId, resolvedStudentId]
    );

    if (studentProfile.length > 0) {
      resolvedStudentId = studentProfile[0].id;
    }

    const query = `
      SELECT r.*, r.obtained_marks as marks_obtained,
             e.title as exam_title, e.pass_marks, s.name as subject_name,
             (CASE 
               WHEN e.pass_marks IS NOT NULL THEN (r.obtained_marks >= e.pass_marks)
               ELSE (r.percentage >= 50)
             END) as is_passed
      FROM results r
      JOIN exams e ON r.exam_id = e.id
      JOIN subjects s ON e.subject_id = s.id
      WHERE r.student_id = ?
      ORDER BY r.created_at DESC
    `;

    const [results] = await pool.query(query, [resolvedStudentId]);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

const publishResults = async (req, res, next) => {
  try {
    const { exam_id, result_ids } = req.body;

    if (exam_id) {
      await pool.query(
        "UPDATE results SET published = TRUE, status = 'published' WHERE exam_id = ?",
        [exam_id]
      );
    } else if (result_ids && result_ids.length > 0) {
      await pool.query(
        "UPDATE results SET published = TRUE, status = 'published' WHERE id IN (?)",
        [result_ids]
      );
    }

    res.json({ success: true, message: 'Results published successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getResults, getResult, getExamResults, getStudentResults, publishResults };
