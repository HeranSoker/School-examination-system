const { pool } = require('../config/database');

class GradingService {
  async gradeAttempt(attemptId) {
    // Get all answers for this attempt
    const [answers] = await pool.query(
      `SELECT a.*, q.question_type, q.marks as question_marks
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.attempt_id = ?`,
      [attemptId]
    );

    let totalObtained = 0;
    let totalPossible = 0;

    for (const answer of answers) {
      totalPossible += parseFloat(answer.question_marks);

      if (answer.question_type === 'MCQ' || answer.question_type === 'TRUE_FALSE') {
        if (answer.selected_option_id) {
          // Check if selected option is correct
          const [options] = await pool.query(
            'SELECT is_correct FROM question_options WHERE id = ?',
            [answer.selected_option_id]
          );

          if (options.length > 0 && options[0].is_correct) {
            totalObtained += parseFloat(answer.question_marks);
            await pool.query(
              'UPDATE answers SET is_correct = TRUE, marks_obtained = ? WHERE id = ?',
              [answer.question_marks, answer.id]
            );
          } else {
            await pool.query(
              'UPDATE answers SET is_correct = FALSE, marks_obtained = 0 WHERE id = ?',
              [answer.id]
            );
          }
        } else {
          await pool.query(
            'UPDATE answers SET is_correct = FALSE, marks_obtained = 0 WHERE id = ?',
            [answer.id]
          );
        }
      }
      // SHORT_ANSWER and ESSAY are graded manually - marks_obtained stays null until teacher grades
    }

    // Also include question marks for unanswered questions
    const [allQuestions] = await pool.query(
      `SELECT SUM(marks) as total FROM questions q 
       JOIN exam_attempts ea ON q.exam_id = ea.exam_id
       WHERE ea.id = ?`,
      [attemptId]
    );
    
    if (allQuestions[0] && allQuestions[0].total) {
      totalPossible = parseFloat(allQuestions[0].total);
    }

    return { totalObtained, totalPossible };
  }

  async gradeAnswer(answerId, marksObtained, gradedBy) {
    const [answer] = await pool.query(
      `SELECT a.*, q.marks as question_marks FROM answers a
       JOIN questions q ON a.question_id = q.id WHERE a.id = ?`,
      [answerId]
    );

    if (answer.length === 0) {
      throw { statusCode: 404, message: 'Answer not found' };
    }

    if (marksObtained > parseFloat(answer[0].question_marks)) {
      throw { statusCode: 400, message: 'Marks cannot exceed question marks' };
    }

    await pool.query(
      'UPDATE answers SET marks_obtained = ?, is_correct = ?, graded_by = ?, graded_at = NOW() WHERE id = ?',
      [marksObtained, marksObtained > 0, gradedBy, answerId]
    );

    return answer[0];
  }
}

module.exports = new GradingService();
