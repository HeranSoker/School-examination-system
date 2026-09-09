const router = require('express').Router();
const { getResults, getResult, getExamResults, getStudentResults, publishResults } = require('../controllers/resultController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', getResults);
router.get('/:id', getResult);
router.get('/exam/:examId', authorize('admin', 'teacher'), getExamResults);
router.get('/student/:studentId', getStudentResults);
router.post('/publish', authorize('admin', 'teacher'), publishResults);

module.exports = router;
