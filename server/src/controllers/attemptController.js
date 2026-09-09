const { pool } = require('../config/database');
const examService = require('../services/examService');
const gradingService = require('../services/gradingService');
const resultService = require('../services/resultService');

const startExam = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (student.length === 0) {
      return res.status(403).json({ success: false, message: 'Student profile not found' });
    }

    const studentId = student[0].id;
    const eligibility = await examService.canStudentTakeExam(examId, studentId);

    if (!eligibility.canTake) {
      return res.status(400).json({ success: false, message: eligibility.reason });
    }

    if (eligibility.existingAttemptId) {
      const [attempt] = await pool.query(
        'SELECT * FROM exam_attempts WHERE id = ?',
        [eligibility.existingAttemptId]
      );

      if (new Date() >= new Date(attempt[0].expires_at)) {
        await pool.query(
          "UPDATE exam_attempts SET status = 'auto_submitted', submitted_at = NOW() WHERE id = ?",
          [eligibility.existingAttemptId]
        );
        await gradingService.gradeAttempt(eligibility.existingAttemptId);
        await resultService.createOrUpdateResult(eligibility.existingAttemptId);

        return res.status(400).json({
          success: false,
          message: 'Your exam time has expired. The exam was auto-submitted.',
        });
      }

      return res.json({
        success: true,
        message: 'Resuming existing attempt',
        data: {
          attempt_id: attempt[0].id,
          started_at: attempt[0].started_at,
          expires_at: attempt[0].expires_at,
        },
      });
    }

    const exam = eligibility.exam;
    const expiresAt = new Date(Date.now() + exam.duration_minutes * 60 * 1000);

    if (exam.end_time && new Date(exam.end_time) < expiresAt) {
      expiresAt.setTime(new Date(exam.end_time).getTime());
    }

    const [result] = await pool.query(
      `INSERT INTO exam_attempts (exam_id, student_id, expires_at, ip_address)
       VALUES (?, ?, ?, ?)`,
      [examId, studentId, expiresAt, req.ip]
    );

    res.status(201).json({
      success: true,
      message: 'Exam started successfully',
      data: {
        attempt_id: result.insertId,
        started_at: new Date(),
        expires_at: expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAttempt = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;

    const [attempts] = await pool.query(
      `SELECT ea.*, e.title as exam_title, e.duration_minutes,
              s.name as subject_name
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       JOIN subjects s ON e.subject_id = s.id
       WHERE ea.id = ?`,
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (req.user.role === 'student') {
      const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (student.length === 0 || attempts[0].student_id !== student[0].id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const [answers] = await pool.query(
      'SELECT question_id, selected_option_id, answer_text FROM answers WHERE attempt_id = ?',
      [attemptId]
    );

    res.json({
      success: true,
      data: {
        ...attempts[0],
        answers,
      },
    });
  } catch (error) {
    next(error);
  }
};

const submitExam = async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId;

    const [attempts] = await pool.query(
      'SELECT * FROM exam_attempts WHERE id = ?',
      [attemptId]
    );

    if (attempts.length === 0) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const attempt = attempts[0];

    if (req.user.role === 'student') {
      const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (student.length === 0 || attempt.student_id !== student[0].id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'This exam has already been submitted.' });
    }

    const now = new Date();
    const isAutoSubmit = now >= new Date(attempt.expires_at);
    const status = isAutoSubmit ? 'auto_submitted' : 'submitted';

    await pool.query(
      'UPDATE exam_attempts SET status = ?, submitted_at = NOW() WHERE id = ?',
      [status, attemptId]
    );

    await gradingService.gradeAttempt(attemptId);
    const result = await resultService.createOrUpdateResult(attemptId);

    res.json({
      success: true,
      message: isAutoSubmit ? 'Exam auto-submitted (time expired)' : 'Exam submitted successfully',
      data: {
        id: result.id,
        attempt_id: Number(attemptId),
        score: result.obtained,
        total_marks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { startExam, getAttempt, submitExam };
