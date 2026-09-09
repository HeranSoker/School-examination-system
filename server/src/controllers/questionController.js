const { pool } = require('../config/database');

const getQuestions = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const [questions] = await pool.query(
      `SELECT q.* FROM questions q WHERE q.exam_id = ? ORDER BY q.order_number`,
      [examId]
    );

    // Get options for each question
    for (const question of questions) {
      const [options] = await pool.query(
        'SELECT * FROM question_options WHERE question_id = ? ORDER BY order_number',
        [question.id]
      );
      question.options = options;
    }

    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

const getStudentQuestions = async (req, res, next) => {
  try {
    const examId = req.params.examId;

    const [questions] = await pool.query(
      `SELECT q.id, q.question_text, q.question_type, q.marks, q.order_number 
       FROM questions q WHERE q.exam_id = ? ORDER BY q.order_number`,
      [examId]
    );

    // Get options WITHOUT is_correct flag - security critical
    for (const question of questions) {
      if (question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE') {
        const [options] = await pool.query(
          'SELECT id, option_text, order_number FROM question_options WHERE question_id = ? ORDER BY order_number',
          [question.id]
        );
        question.options = options;
      } else {
        question.options = [];
      }
    }

    res.json({ success: true, data: questions });
  } catch (error) {
    next(error);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const { question_text, question_type, marks, options, explanation } = req.body;

    if (!question_text || !question_type || !marks) {
      return res.status(400).json({ success: false, message: 'Question text, type, and marks are required' });
    }

    // Check exam status
    const [exam] = await pool.query('SELECT status FROM exams WHERE id = ?', [examId]);
    if (exam.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Get next order number
    const [maxOrder] = await pool.query(
      'SELECT COALESCE(MAX(order_number), 0) + 1 as next_order FROM questions WHERE exam_id = ?',
      [examId]
    );

    const [result] = await pool.query(
      'INSERT INTO questions (exam_id, question_text, question_type, marks, order_number, explanation) VALUES (?, ?, ?, ?, ?, ?)',
      [examId, question_text, question_type, marks, maxOrder[0].next_order, explanation || null]
    );

    // Add options
    if (options && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        await pool.query(
          'INSERT INTO question_options (question_id, option_text, is_correct, order_number) VALUES (?, ?, ?, ?)',
          [result.insertId, options[i].option_text, options[i].is_correct || false, i + 1]
        );
      }
    }

    // Update exam total marks
    const [totalMarks] = await pool.query(
      'SELECT COALESCE(SUM(marks), 0) as total FROM questions WHERE exam_id = ?',
      [examId]
    );
    await pool.query('UPDATE exams SET total_marks = ? WHERE id = ?', [totalMarks[0].total, examId]);

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const questionId = req.params.id;
    const { question_text, question_type, marks, options, explanation, order_number } = req.body;

    await pool.query(
      `UPDATE questions SET question_text = ?, question_type = ?, marks = ?, 
       explanation = ?, order_number = COALESCE(?, order_number) WHERE id = ?`,
      [question_text, question_type, marks, explanation || null, order_number, questionId]
    );

    // Update options
    if (options !== undefined) {
      await pool.query('DELETE FROM question_options WHERE question_id = ?', [questionId]);
      for (let i = 0; i < options.length; i++) {
        await pool.query(
          'INSERT INTO question_options (question_id, option_text, is_correct, order_number) VALUES (?, ?, ?, ?)',
          [questionId, options[i].option_text, options[i].is_correct || false, i + 1]
        );
      }
    }

    // Update exam total marks
    const [question] = await pool.query('SELECT exam_id FROM questions WHERE id = ?', [questionId]);
    if (question.length > 0) {
      const [totalMarks] = await pool.query(
        'SELECT COALESCE(SUM(marks), 0) as total FROM questions WHERE exam_id = ?',
        [question[0].exam_id]
      );
      await pool.query('UPDATE exams SET total_marks = ? WHERE id = ?', [totalMarks[0].total, question[0].exam_id]);
    }

    res.json({ success: true, message: 'Question updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const [question] = await pool.query('SELECT exam_id FROM questions WHERE id = ?', [req.params.id]);
    
    if (question.length === 0) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    await pool.query('DELETE FROM questions WHERE id = ?', [req.params.id]);

    // Reorder remaining questions
    const [remaining] = await pool.query(
      'SELECT id FROM questions WHERE exam_id = ? ORDER BY order_number',
      [question[0].exam_id]
    );
    for (let i = 0; i < remaining.length; i++) {
      await pool.query('UPDATE questions SET order_number = ? WHERE id = ?', [i + 1, remaining[i].id]);
    }

    // Update exam total marks
    const [totalMarks] = await pool.query(
      'SELECT COALESCE(SUM(marks), 0) as total FROM questions WHERE exam_id = ?',
      [question[0].exam_id]
    );
    await pool.query('UPDATE exams SET total_marks = ? WHERE id = ?', [totalMarks[0].total, question[0].exam_id]);

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const reorderQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body; // Array of { id, order_number }

    for (const q of questions) {
      await pool.query('UPDATE questions SET order_number = ? WHERE id = ?', [q.order_number, q.id]);
    }

    res.json({ success: true, message: 'Questions reordered successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getQuestions, getStudentQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions };
