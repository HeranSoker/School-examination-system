const { pool } = require('../config/database');

/**
 * Helper to escape CSV cell values
 */
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

/**
 * Export exam results as CSV
 */
const exportExamResultsCSV = async (req, res, next) => {
  try {
    const { examId } = req.params;

    // Fetch exam info
    const [exams] = await pool.query(
      `SELECT e.id, e.title, e.total_marks, s.name as subject_name 
       FROM exams e 
       JOIN subjects s ON e.subject_id = s.id 
       WHERE e.id = ?`,
      [examId]
    );

    if (exams.length === 0) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const exam = exams[0];

    // Fetch results
    const [results] = await pool.query(
      `SELECT r.id, r.obtained_marks as marks_obtained, r.total_marks, r.percentage, r.grade,
              (CASE WHEN e.pass_marks IS NOT NULL THEN (r.obtained_marks >= e.pass_marks) ELSE (r.percentage >= 50) END) as is_passed,
              r.created_at, u.full_name as student_name, st.student_id as student_code,
              c.name as class_name, ea.status as attempt_status, ea.submitted_at
       FROM results r
       JOIN exams e ON r.exam_id = e.id
       JOIN students st ON r.student_id = st.id
       JOIN users u ON st.user_id = u.id
       LEFT JOIN classes c ON st.class_id = c.id
       JOIN exam_attempts ea ON r.attempt_id = ea.id
       WHERE r.exam_id = ?
       ORDER BY r.obtained_marks DESC`,
      [examId]
    );

    const headers = [
      'Rank',
      'Student Code',
      'Student Name',
      'Class',
      'Marks Obtained',
      'Total Marks',
      'Percentage (%)',
      'Grade',
      'Result',
      'Submission Status',
      'Submitted Date'
    ];

    const rows = results.map((r, index) => [
      index + 1,
      r.student_code || 'N/A',
      r.student_name,
      r.class_name || 'N/A',
      r.marks_obtained,
      r.total_marks,
      `${r.percentage}%`,
      r.grade,
      r.is_passed ? 'PASSED' : 'FAILED',
      r.attempt_status,
      r.submitted_at ? new Date(r.submitted_at).toLocaleString() : new Date(r.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${sanitizedTitle}_Results_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Export students roster as CSV
 */
const exportStudentsCSV = async (req, res, next) => {
  try {
    const { classId } = req.params;
    let query = `
      SELECT st.id, st.student_id as student_code, u.full_name, u.email, u.status,
             c.name as class_name, st.created_at
      FROM students st
      JOIN users u ON st.user_id = u.id
      LEFT JOIN classes c ON st.class_id = c.id
    `;
    const params = [];

    if (classId) {
      query += ' WHERE st.class_id = ?';
      params.push(classId);
    }

    query += ' ORDER BY u.full_name ASC';

    const [students] = await pool.query(query, params);

    const headers = ['Student ID', 'Full Name', 'Email', 'Class', 'Status', 'Registered At'];
    const rows = students.map((s) => [
      s.student_code || s.id,
      s.full_name,
      s.email,
      s.class_name || 'Unassigned',
      s.status,
      new Date(s.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => row.map(escapeCsv).join(','))
    ].join('\r\n');

    const filename = `Students_Roster_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportExamResultsCSV,
  exportStudentsCSV,
};
