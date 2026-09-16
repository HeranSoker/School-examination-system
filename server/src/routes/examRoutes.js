const router = require('express').Router();
const { getExams, getExam, createExam, updateExam, deleteExam, publishExam, unpublishExam } = require('../controllers/examController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize, authorizeExamOwner } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), getExams);
router.post('/', authorize('admin', 'teacher'), createExam);
router.get('/:id', authorize('admin', 'teacher', 'student'), getExam);
router.put('/:id', authorize('admin', 'teacher'), authorizeExamOwner, updateExam);
router.delete('/:id', authorize('admin', 'teacher'), authorizeExamOwner, deleteExam);
router.post('/:id/publish', authorize('admin', 'teacher'), authorizeExamOwner, publishExam);
router.post('/:id/unpublish', authorize('admin', 'teacher'), authorizeExamOwner, unpublishExam);

module.exports = router;
