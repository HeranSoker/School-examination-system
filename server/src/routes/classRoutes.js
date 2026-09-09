const router = require('express').Router();
const { getClasses, getClass, createClass, updateClass, deleteClass } = require('../controllers/classController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', authorize('admin', 'teacher'), getClasses);
router.post('/', authorize('admin'), createClass);
router.get('/:id', authorize('admin', 'teacher'), getClass);
router.put('/:id', authorize('admin'), updateClass);
router.delete('/:id', authorize('admin'), deleteClass);

module.exports = router;
