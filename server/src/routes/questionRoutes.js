const router = require('express').Router();
const { getQuestions, getStudentQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions } = require('../controllers/questionController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize, authorizeExamOwner } = require('../middleware/roleMiddleware');

router.use(authenticate);

// Teacher/Admin question management
router.get('/exams/:examId/questions', authorize('admin', 'teacher'), authorizeExamOwner, getQuestions);
router.post('/exams/:examId/questions', authorize('admin', 'teacher'), authorizeExamOwner, createQuestion);
router.post('/exams/:examId/questions/reorder', authorize('admin', 'teacher'), authorizeExamOwner, reorderQuestions);

// Student-safe questions (no correct answers)
router.get('/student/exams/:examId/questions', authorize('student'), getStudentQuestions);

// Individual question operations
router.put('/questions/:id', authorize('admin', 'teacher'), updateQuestion);
router.delete('/questions/:id', authorize('admin', 'teacher'), deleteQuestion);

module.exports = router;
