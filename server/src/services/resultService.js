const { pool } = require('../config/database');
const { calculateGrade, calculatePercentage } = require('../utils/gradeCalculator');

class ResultService {
  async createOrUpdateResult(attemptId) {
    // Get attempt details
    const [attempts] = await pool.query(
      'SELECT * FROM exam_attempts WHERE id = ?',
      [attemptId]
    );

    if (attempts.length === 0) {
      throw { statusCode: 404, message: 'Attempt not found' };
    }

    const attempt = attempts[0];

    // Get total marks for the exam
    const [examMarks] = await pool.query(
      'SELECT SUM(marks) as total_marks FROM questions WHERE exam_id = ?',
      [attempt.exam_id]
    );
    const totalMarks = parseFloat(examMarks[0].total_marks) || 0;

    // Get obtained marks
    const [obtainedMarks] = await pool.query(
      'SELECT COALESCE(SUM(marks_obtained), 0) as obtained FROM answers WHERE attempt_id = ?',
      [attemptId]
    );
    const obtained = parseFloat(obtainedMarks[0].obtained) || 0;

    // Check if all questions are graded
    const [ungradedCount] = await pool.query(
      `SELECT COUNT(*) as count FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.attempt_id = ? AND a.marks_obtained IS NULL
       AND q.question_type IN ('SHORT_ANSWER', 'ESSAY')`,
      [attemptId]
    );
    
    const allGraded = ungradedCount[0].count === 0;
    const percentage = calculatePercentage(obtained, totalMarks);
    const grade = await calculateGrade(percentage);

    // Check if result exists
    const [existing] = await pool.query(
      'SELECT id FROM results WHERE attempt_id = ?',
      [attemptId]
    );

    const resultStatus = allGraded ? 'graded' : 'pending';

    if (existing.length > 0) {
      await pool.query(
        `UPDATE results SET total_marks = ?, obtained_marks = ?, percentage = ?, 
         grade = ?, status = ?, updated_at = NOW() WHERE attempt_id = ?`,
        [totalMarks, obtained, percentage, grade, resultStatus, attemptId]
      );
    } else {
      await pool.query(
        `INSERT INTO results (attempt_id, student_id, exam_id, total_marks, obtained_marks, percentage, grade, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [attemptId, attempt.student_id, attempt.exam_id, totalMarks, obtained, percentage, grade, resultStatus]
      );
    }

    // Update attempt score
    await pool.query(
      'UPDATE exam_attempts SET score = ?, total_marks = ?, percentage = ? WHERE id = ?',
      [obtained, totalMarks, percentage, attemptId]
    );

    return { totalMarks, obtained, percentage, grade, status: resultStatus };
  }
}

module.exports = new ResultService();
