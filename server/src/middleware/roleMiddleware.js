const { pool } = require('../config/database');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

const authorizeExamOwner = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Admins have full access
    if (req.user.role === 'admin') {
      return next();
    }

    const examId = req.params.examId || req.params.id || req.body.exam_id;
    if (!examId) {
      return next();
    }

    const [exams] = await pool.query('SELECT teacher_id FROM exams WHERE id = ?', [examId]);
    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    if (req.user.role === 'teacher' && exams[0].teacher_id !== req.user.teacher_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only manage exams that you created.',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authorize, authorizeExamOwner };

