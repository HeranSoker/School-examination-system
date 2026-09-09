const { pool } = require('../config/database');

const getGradeSettings = async () => {
  const [rows] = await pool.query('SELECT * FROM grade_settings ORDER BY min_percentage DESC');
  return rows;
};

const calculateGrade = async (percentage) => {
  const grades = await getGradeSettings();
  for (const g of grades) {
    if (percentage >= parseFloat(g.min_percentage) && percentage <= parseFloat(g.max_percentage)) {
      return g.grade;
    }
  }
  return 'F';
};

const calculatePercentage = (obtained, total) => {
  if (total === 0) return 0;
  return Math.round((obtained / total) * 10000) / 100;
};

module.exports = { getGradeSettings, calculateGrade, calculatePercentage };
