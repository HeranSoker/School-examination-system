const { verifyToken } = require('../utils/jwt');
const { pool } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyToken(token);
      
      // Verify user still exists and is active
      const [users] = await pool.query(
        'SELECT id, full_name, username, email, role, status FROM users WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found.',
        });
      }

      if (users[0].status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated.',
        });
      }

      const user = users[0];

      // Attach profile info based on role
      if (user.role === 'student') {
        const [students] = await pool.query(
          'SELECT id as student_id, student_id as student_code, class_id FROM students WHERE user_id = ?',
          [user.id]
        );
        if (students.length > 0) {
          user.student_id = students[0].student_id;
          user.student_code = students[0].student_code;
          user.class_id = students[0].class_id;
        }
      } else if (user.role === 'teacher') {
        const [teachers] = await pool.query(
          'SELECT id as teacher_id, employee_id, department FROM teachers WHERE user_id = ?',
          [user.id]
        );
        if (teachers.length > 0) {
          user.teacher_id = teachers[0].teacher_id;
          user.employee_id = teachers[0].employee_id;
          user.department = teachers[0].department;
        }
      }

      req.user = user;
      next();
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

module.exports = { authenticate };
