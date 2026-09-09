const { pool } = require('../config/database');

class ExamService {
  async getExamWithDetails(examId) {
    const [exams] = await pool.query(
      `SELECT e.*, s.name as subject_name, s.code as subject_code,
              u.full_name as teacher_name,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       JOIN teachers t ON e.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE e.id = ?`,
      [examId]
    );

    if (exams.length === 0) return null;

    const exam = exams[0];

    // Get assigned classes
    const [classes] = await pool.query(
      `SELECT c.* FROM classes c
       JOIN exam_classes ec ON c.id = ec.class_id
       WHERE ec.exam_id = ?`,
      [examId]
    );
    exam.classes = classes;

    return exam;
  }

  async getExamsForStudent(studentId) {
    // Get the student's class
    const [students] = await pool.query(
      'SELECT class_id FROM students WHERE id = ?',
      [studentId]
    );

    const classId = students[0]?.class_id || null;

    const [exams] = await pool.query(
      `SELECT DISTINCT e.id, e.title, e.description, e.duration_minutes, e.total_marks, e.pass_marks,
              e.start_time, e.end_time, e.status, e.instructions,
              s.name as subject_name, s.code as subject_code,
              u.full_name as teacher_name,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count,
              (SELECT ea.id FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.student_id = ? AND ea.status = 'in_progress' LIMIT 1) as active_attempt_id,
              (SELECT ea.status FROM exam_attempts ea WHERE ea.exam_id = e.id AND ea.student_id = ? ORDER BY ea.created_at DESC LIMIT 1) as attempt_status
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       JOIN teachers t ON e.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       LEFT JOIN exam_classes ec ON e.id = ec.exam_id
       WHERE (ec.class_id = ? OR ec.class_id IS NULL OR ? IS NULL) AND e.status IN ('active', 'scheduled', 'completed')
       ORDER BY e.start_time DESC, e.created_at DESC`,
      [studentId, studentId, classId, classId]
    );

    return exams;
  }

  async canStudentTakeExam(examId, studentId) {
    // Check exam exists and is active
    const [exams] = await pool.query(
      'SELECT * FROM exams WHERE id = ? AND status = ?',
      [examId, 'active']
    );

    if (exams.length === 0) {
      return { canTake: false, reason: 'Exam is not available.' };
    }

    const exam = exams[0];
    const now = new Date();

    if (exam.start_time && now < new Date(exam.start_time)) {
      return { canTake: false, reason: 'Exam has not started yet.' };
    }

    if (exam.end_time && now > new Date(exam.end_time)) {
      return { canTake: false, reason: 'Exam has ended.' };
    }

    // Check student's class is assigned if exam has specific classes
    const [totalAssignedClasses] = await pool.query(
      'SELECT COUNT(*) as count FROM exam_classes WHERE exam_id = ?',
      [examId]
    );

    if (totalAssignedClasses[0].count > 0) {
      const [student] = await pool.query(
        'SELECT class_id FROM students WHERE id = ?',
        [studentId]
      );

      if (student.length === 0 || !student[0].class_id) {
        return { canTake: false, reason: 'Student not assigned to a class.' };
      }

      const [classAssignment] = await pool.query(
        'SELECT id FROM exam_classes WHERE exam_id = ? AND class_id = ?',
        [examId, student[0].class_id]
      );

      if (classAssignment.length === 0) {
        return { canTake: false, reason: 'This exam is not assigned to your class.' };
      }
    }

    // Check existing attempts
    const [existingAttempts] = await pool.query(
      'SELECT id, status FROM exam_attempts WHERE exam_id = ? AND student_id = ?',
      [examId, studentId]
    );

    const activeAttempt = existingAttempts.find(a => a.status === 'in_progress');
    if (activeAttempt) {
      return { canTake: true, existingAttemptId: activeAttempt.id, reason: 'Resuming existing attempt.' };
    }

    const completedAttempts = existingAttempts.filter(a => 
      ['submitted', 'auto_submitted', 'graded'].includes(a.status)
    );

    if (completedAttempts.length >= (exam.max_attempts || 1)) {
      return { canTake: false, reason: 'Maximum attempts reached.' };
    }

    return { canTake: true, exam };
  }

  async updateExamStatus() {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Activate scheduled exams
    await pool.query(
      "UPDATE exams SET status = 'active' WHERE status = 'scheduled' AND start_time <= ? AND end_time > ?",
      [now, now]
    );

    // Complete expired active exams
    await pool.query(
      "UPDATE exams SET status = 'completed' WHERE status = 'active' AND end_time <= ?",
      [now]
    );
  }
}

module.exports = new ExamService();
