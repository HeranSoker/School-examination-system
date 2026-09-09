const router = require('express').Router();
const { exportExamResultsCSV, exportStudentsCSV } = require('../controllers/exportController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

// Export exam results (Admin and Teachers)
router.get('/exams/:examId/results/csv', authorize('admin', 'teacher'), exportExamResultsCSV);

// Export student lists (Admin and Teachers)
router.get('/classes/:classId/students/csv', authorize('admin', 'teacher'), exportStudentsCSV);
router.get('/students/csv', authorize('admin'), exportStudentsCSV);

module.exports = router;
