const { pool } = require('../config/database');

const saveAnswer = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;
    const { question_id, selected_option_id, answer_text } = req.body;

    // Verify attempt is in progress and belongs to student
    const [attempts] = await pool.query(
      'SELECT * FROM exam_attempts WHERE id = ? AND status = ?',
      [attemptId, 'in_progress']
    );

    if (attempts.length === 0) {
      return res.status(400).json({ success: false, message: 'Attempt not found or already submitted' });
    }

    // Check ownership
    if (req.user.role === 'student') {
      const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (student.length === 0 || attempts[0].student_id !== student[0].id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Check if time expired - server authority
    if (new Date() >= new Date(attempts[0].expires_at)) {
      return res.status(400).json({ success: false, message: 'Exam time has expired' });
    }

    // Upsert answer
    const [existing] = await pool.query(
      'SELECT id FROM answers WHERE attempt_id = ? AND question_id = ?',
      [attemptId, question_id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE answers SET selected_option_id = ?, answer_text = ?, updated_at = NOW() WHERE id = ?',
        [selected_option_id || null, answer_text || null, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO answers (attempt_id, question_id, selected_option_id, answer_text) VALUES (?, ?, ?, ?)',
        [attemptId, question_id, selected_option_id || null, answer_text || null]
      );
    }

    res.json({ success: true, message: 'Answer saved' });
  } catch (error) {
    next(error);
  }
};

const gradeAnswer = async (req, res, next) => {
  try {
    const { marks_obtained } = req.body;
    const answerId = req.params.id;

    const [answer] = await pool.query(
      `SELECT a.*, q.marks as question_marks, ea.id as attempt_id 
       FROM answers a 
       JOIN questions q ON a.question_id = q.id 
       JOIN exam_attempts ea ON a.attempt_id = ea.id 
       WHERE a.id = ?`,
      [answerId]
    );

    if (answer.length === 0) {
      return res.status(404).json({ success: false, message: 'Answer not found' });
    }

    if (marks_obtained > parseFloat(answer[0].question_marks)) {
      return res.status(400).json({ success: false, message: 'Marks cannot exceed question marks' });
    }

    await pool.query(
      'UPDATE answers SET marks_obtained = ?, is_correct = ?, graded_by = ?, graded_at = NOW() WHERE id = ?',
      [marks_obtained, marks_obtained > 0, req.user.id, answerId]
    );

    // Recalculate result
    const resultService = require('../services/resultService');
    await resultService.createOrUpdateResult(answer[0].attempt_id);

    res.json({ success: true, message: 'Answer graded successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { saveAnswer, gradeAnswer };
