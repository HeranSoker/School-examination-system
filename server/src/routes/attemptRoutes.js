const router = require('express').Router();
const { startExam, getAttempt, submitExam } = require('../controllers/attemptController');
const { saveAnswer, gradeAnswer } = require('../controllers/answerController');
const examService = require('../services/examService');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

// Student exam operations
router.post('/exams/:examId/start', authorize('student'), startExam);
router.get('/attempts/:attemptId', getAttempt);
router.post('/attempts/:attemptId/answers', authorize('student'), saveAnswer);
router.post('/attempts/:attemptId/submit', authorize('student'), submitExam);

// Student available exams
router.get('/student/exams', authorize('student'), async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    await examService.updateExamStatus();
    const exams = await examService.getExamsForStudent(student[0].id);
    res.json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
});

// Teacher manual grading
router.put('/answers/:id/grade', authorize('admin', 'teacher'), gradeAnswer);

module.exports = router;
