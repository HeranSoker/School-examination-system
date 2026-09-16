const { pool } = require('../config/database');

const getAdminAnalytics = async (req, res, next) => {
  try {
    const [studentCount] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'active'");
    const [teacherCount] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'teacher' AND status = 'active'");
    const [classCount] = await pool.query("SELECT COUNT(*) as count FROM classes WHERE status = 'active'");
    const [subjectCount] = await pool.query("SELECT COUNT(*) as count FROM subjects WHERE status = 'active'");
    const [examCounts] = await pool.query(
      `SELECT status, COUNT(*) as count FROM exams GROUP BY status`
    );
    const [avgPerformance] = await pool.query(
      'SELECT AVG(percentage) as avg_score FROM results WHERE published = TRUE'
    );
    const [passRate] = await pool.query(
      `SELECT 
        COUNT(CASE WHEN percentage >= 50 THEN 1 END) as passed,
        COUNT(*) as total
       FROM results WHERE published = TRUE`
    );
    const [recentExams] = await pool.query(
      `SELECT e.id, e.title, e.status, s.name as subject_name, u.full_name as teacher_name, e.created_at
       FROM exams e JOIN subjects s ON e.subject_id = s.id
       JOIN teachers t ON e.teacher_id = t.id JOIN users u ON t.user_id = u.id
       ORDER BY e.created_at DESC LIMIT 5`
    );
    const [subjectPerformance] = await pool.query(
      `SELECT s.name, AVG(r.percentage) as avg_score, COUNT(r.id) as exam_count
       FROM results r JOIN exams e ON r.exam_id = e.id JOIN subjects s ON e.subject_id = s.id
       WHERE r.published = TRUE GROUP BY s.id, s.name ORDER BY avg_score DESC`
    );

    const examStatusMap = {};
    examCounts.forEach(e => { examStatusMap[e.status] = e.count; });

    res.json({
      success: true,
      data: {
        totalStudents: studentCount[0].count,
        totalTeachers: teacherCount[0].count,
        totalClasses: classCount[0].count,
        totalSubjects: subjectCount[0].count,
        totalExams: Object.values(examStatusMap).reduce((a, b) => a + b, 0),
        activeExams: examStatusMap.active || 0,
        completedExams: examStatusMap.completed || 0,
        draftExams: examStatusMap.draft || 0,
        averageScore: Math.round((avgPerformance[0].avg_score || 0) * 100) / 100,
        passRate: passRate[0].total > 0 ? Math.round((passRate[0].passed / passRate[0].total) * 10000) / 100 : 0,
        recentExams,
        subjectPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTeacherAnalytics = async (req, res, next) => {
  try {
    const [teacher] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
    if (teacher.length === 0) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    const teacherId = teacher[0].id;

    const [examCounts] = await pool.query(
      'SELECT status, COUNT(*) as count FROM exams WHERE teacher_id = ? GROUP BY status',
      [teacherId]
    );
    const [studentCount] = await pool.query(
      `SELECT COUNT(DISTINCT st.id) as count FROM students st
       JOIN exam_classes ec ON st.class_id = ec.class_id
       JOIN exams e ON ec.exam_id = e.id WHERE e.teacher_id = ?`,
      [teacherId]
    );
    const [avgScore] = await pool.query(
      `SELECT AVG(r.percentage) as avg FROM results r
       JOIN exams e ON r.exam_id = e.id WHERE e.teacher_id = ?`,
      [teacherId]
    );
    const [myExams] = await pool.query(
      `SELECT e.*, s.name as subject_name,
              (SELECT COUNT(*) FROM exam_attempts WHERE exam_id = e.id) as attempt_count,
              (SELECT COUNT(*) FROM exam_attempts WHERE exam_id = e.id AND status IN ('submitted', 'auto_submitted', 'graded')) as submission_count,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
       FROM exams e JOIN subjects s ON e.subject_id = s.id
       WHERE e.teacher_id = ? ORDER BY e.created_at DESC`,
      [teacherId]
    );

    const [submissionCount] = await pool.query(
      `SELECT COUNT(*) as count FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       WHERE e.teacher_id = ? AND ea.status IN ('submitted', 'auto_submitted', 'graded')`,
      [teacherId]
    );

    const [examPerformance] = await pool.query(
      `SELECT e.title, AVG(r.percentage) as avg_score, COUNT(r.id) as student_count
       FROM results r JOIN exams e ON r.exam_id = e.id
       WHERE e.teacher_id = ? GROUP BY e.id, e.title, e.created_at ORDER BY e.created_at DESC LIMIT 10`,
      [teacherId]
    );

    const statusMap = {};
    examCounts.forEach(e => { statusMap[e.status] = e.count; });

    res.json({
      success: true,
      data: {
        totalExams: Object.values(statusMap).reduce((a, b) => a + b, 0),
        activeExams: statusMap.active || 0,
        completedExams: statusMap.completed || 0,
        totalSubmissions: submissionCount[0].count,
        totalStudents: studentCount[0].count,
        avgClassScore: Math.round((avgScore[0].avg || 0) * 100) / 100,
        averageScore: Math.round((avgScore[0].avg || 0) * 100) / 100,
        myExams,
        recentExams: myExams.slice(0, 5),
        examPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getStudentAnalytics = async (req, res, next) => {
  try {
    const [student] = await pool.query('SELECT id, class_id FROM students WHERE user_id = ?', [req.user.id]);
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const studentId = student[0].id;

    const [results] = await pool.query(
      `SELECT r.*, r.obtained_marks as marks_obtained,
              (CASE WHEN e.pass_marks IS NOT NULL THEN (r.obtained_marks >= e.pass_marks) ELSE (r.percentage >= 50) END) as is_passed,
              e.title as exam_title, s.name as subject_name
       FROM results r JOIN exams e ON r.exam_id = e.id JOIN subjects s ON e.subject_id = s.id
       WHERE r.student_id = ? ORDER BY r.created_at DESC`,
      [studentId]
    );

    const [avgScore] = await pool.query(
      'SELECT AVG(percentage) as avg FROM results WHERE student_id = ?',
      [studentId]
    );

    const [subjectPerformance] = await pool.query(
      `SELECT s.name, AVG(r.percentage) as avg_score, COUNT(r.id) as exam_count
       FROM results r JOIN exams e ON r.exam_id = e.id JOIN subjects s ON e.subject_id = s.id
       WHERE r.student_id = ? GROUP BY s.id, s.name`,
      [studentId]
    );

    const classId = student[0].class_id || null;

    const [upcomingExams] = await pool.query(
      `SELECT DISTINCT e.id, e.title, e.start_time, e.end_time, e.duration_minutes,
              s.name as subject_name, e.status
       FROM exams e JOIN subjects s ON e.subject_id = s.id
       LEFT JOIN exam_classes ec ON e.id = ec.exam_id
       WHERE (ec.class_id = ? OR ec.class_id IS NULL OR ? IS NULL) AND e.status IN ('active', 'scheduled')
       AND NOT EXISTS (
         SELECT 1 FROM exam_attempts ea 
         WHERE ea.exam_id = e.id AND ea.student_id = ? 
         AND ea.status IN ('submitted', 'auto_submitted', 'graded')
       )
       ORDER BY e.start_time`,
      [classId, classId, studentId]
    );

    const [completedExams] = await pool.query(
      `SELECT COUNT(*) as count FROM exam_attempts 
       WHERE student_id = ? AND status IN ('submitted', 'auto_submitted', 'graded')`,
      [studentId]
    );

    res.json({
      success: true,
      data: {
        averageScore: Math.round((avgScore[0].avg || 0) * 100) / 100,
        totalExamsTaken: completedExams[0].count,
        availableExamsCount: upcomingExams.length,
        completedExamsCount: completedExams[0].count,
        recentResults: results.slice(0, 5),
        subjectPerformance,
        upcomingExams,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAdminAnalytics, getTeacherAnalytics, getStudentAnalytics };
