const router = require('express').Router();
const { getAdminAnalytics, getTeacherAnalytics, getStudentAnalytics } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/admin', authorize('admin'), getAdminAnalytics);
router.get('/teacher', authorize('teacher'), getTeacherAnalytics);
router.get('/student', authorize('student'), getStudentAnalytics);

module.exports = router;
