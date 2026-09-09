const { pool } = require('../config/database');
const examService = require('../services/examService');

const getExams = async (req, res, next) => {
  try {
    const { status, subject_id, teacher_id, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Update exam statuses first
    await examService.updateExamStatus();

    let query = `
      SELECT e.*, s.name as subject_name, s.code as subject_code,
             u.full_name as teacher_name,
             (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count,
             (SELECT COUNT(*) FROM exam_attempts WHERE exam_id = e.id) as attempt_count
      FROM exams e
      JOIN subjects s ON e.subject_id = s.id
      JOIN teachers t ON e.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Teacher can only see their own exams unless admin
    if (req.user.role === 'teacher') {
      const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher.length > 0) {
        query += ' AND e.teacher_id = ?';
        params.push(teacher[0].id);
      }
    }

    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (subject_id) {
      query += ' AND e.subject_id = ?';
      params.push(subject_id);
    }
    if (search) {
      query += ' AND (e.title LIKE ? OR s.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace(/SELECT[\s\S]*?FROM exams/, 'SELECT COUNT(*) as total FROM exams');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [exams] = await pool.query(query, params);

    // Get classes for each exam
    for (const exam of exams) {
      const [classes] = await pool.query(
        `SELECT c.id, c.name, c.grade, c.section 
         FROM classes c JOIN exam_classes ec ON c.id = ec.class_id 
         WHERE ec.exam_id = ?`,
        [exam.id]
      );
      exam.classes = classes;
    }

    res.json({
      success: true,
      data: {
        exams,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getExam = async (req, res, next) => {
  try {
    const exam = await examService.getExamWithDetails(req.params.id);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // If teacher, only allow their own exams unless admin
    if (req.user.role === 'teacher') {
      const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher.length > 0 && exam.teacher_id !== teacher[0].id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

const createExam = async (req, res, next) => {
  try {
    const { title, description, subject_id, duration_minutes, total_marks, pass_marks,
            start_time, end_time, instructions, class_ids, shuffle_questions, max_attempts } = req.body;

    if (!title || !subject_id || !duration_minutes) {
      return res.status(400).json({ success: false, message: 'Title, subject, and duration are required' });
    }

    // Get teacher id
    const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (teacher.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Teacher profile not found' });
    }

    const teacherId = req.user.role === 'admin' ? (req.body.teacher_id || teacher[0]?.id) : teacher[0].id;

    const [result] = await pool.query(
      `INSERT INTO exams (title, description, subject_id, teacher_id, duration_minutes, 
       total_marks, pass_marks, start_time, end_time, instructions, shuffle_questions, max_attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, subject_id, teacherId, duration_minutes, 
       total_marks || 0, pass_marks || null, start_time || null, end_time || null,
       instructions || null, shuffle_questions || false, max_attempts || 1]
    );

    // Assign classes
    if (class_ids && class_ids.length > 0) {
      for (const classId of class_ids) {
        await pool.query(
          'INSERT INTO exam_classes (exam_id, class_id) VALUES (?, ?)',
          [result.insertId, classId]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

const updateExam = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const { title, description, subject_id, duration_minutes, total_marks, pass_marks,
            start_time, end_time, instructions, class_ids, shuffle_questions, 
            show_results, allow_review, max_attempts } = req.body;

    // Check if exam has active attempts - restrict updates
    const [activeAttempts] = await pool.query(
      "SELECT COUNT(*) as count FROM exam_attempts WHERE exam_id = ? AND status = 'in_progress'",
      [examId]
    );

    if (activeAttempts[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify exam while students are taking it.',
      });
    }

    await pool.query(
      `UPDATE exams SET title = ?, description = ?, subject_id = ?, duration_minutes = ?,
       total_marks = ?, pass_marks = ?, start_time = ?, end_time = ?, instructions = ?,
       shuffle_questions = ?, show_results = ?, allow_review = ?, max_attempts = ?
       WHERE id = ?`,
      [title, description, subject_id, duration_minutes, total_marks || 0, pass_marks || null,
       start_time || null, end_time || null, instructions || null,
       shuffle_questions || false, show_results || false, allow_review || false,
       max_attempts || 1, examId]
    );

    // Update classes
    if (class_ids !== undefined) {
      await pool.query('DELETE FROM exam_classes WHERE exam_id = ?', [examId]);
      if (class_ids.length > 0) {
        for (const classId of class_ids) {
          await pool.query(
            'INSERT INTO exam_classes (exam_id, class_id) VALUES (?, ?)',
            [examId, classId]
          );
        }
      }
    }

    // Recalculate total marks
    const [marks] = await pool.query(
      'SELECT COALESCE(SUM(marks), 0) as total FROM questions WHERE exam_id = ?',
      [examId]
    );
    await pool.query('UPDATE exams SET total_marks = ? WHERE id = ?', [marks[0].total, examId]);

    res.json({ success: true, message: 'Exam updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteExam = async (req, res, next) => {
  try {
    const [exam] = await pool.query('SELECT status FROM exams WHERE id = ?', [req.params.id]);
    
    if (exam.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (exam[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft exams can be deleted.',
      });
    }

    await pool.query('DELETE FROM exams WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const publishExam = async (req, res, next) => {
  try {
    const examId = req.params.id;

    // Check questions exist
    const [questions] = await pool.query(
      'SELECT COUNT(*) as count FROM questions WHERE exam_id = ?',
      [examId]
    );

    if (questions[0].count === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish exam without questions.',
      });
    }

    // Check classes assigned
    const [classes] = await pool.query(
      'SELECT COUNT(*) as count FROM exam_classes WHERE exam_id = ?',
      [examId]
    );

    if (classes[0].count === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish exam without assigned classes.',
      });
    }

    const [exam] = await pool.query('SELECT start_time, end_time FROM exams WHERE id = ?', [examId]);
    
    let newStatus = 'active';
    if (exam[0].start_time && new Date(exam[0].start_time) > new Date()) {
      newStatus = 'scheduled';
    }

    // Recalculate total marks
    const [marks] = await pool.query(
      'SELECT COALESCE(SUM(marks), 0) as total FROM questions WHERE exam_id = ?',
      [examId]
    );

    await pool.query(
      'UPDATE exams SET status = ?, total_marks = ? WHERE id = ?',
      [newStatus, marks[0].total, examId]
    );

    res.json({ success: true, message: `Exam ${newStatus === 'scheduled' ? 'scheduled' : 'published'} successfully` });
  } catch (error) {
    next(error);
  }
};

const unpublishExam = async (req, res, next) => {
  try {
    const [activeAttempts] = await pool.query(
      "SELECT COUNT(*) as count FROM exam_attempts WHERE exam_id = ? AND status = 'in_progress'",
      [req.params.id]
    );

    if (activeAttempts[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unpublish exam while students are taking it.',
      });
    }

    await pool.query(
      "UPDATE exams SET status = 'draft' WHERE id = ?",
      [req.params.id]
    );

    res.json({ success: true, message: 'Exam unpublished successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getExams, getExam, createExam, updateExam, deleteExam, publishExam, unpublishExam };
