const { pool } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

class AuthService {
  async login(username, password) {
    const [users] = await pool.query(
      'SELECT id, full_name, username, email, password, role, status FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const user = users[0];

    if (user.status !== 'active') {
      throw { statusCode: 403, message: 'Account is deactivated. Please contact administrator.' };
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
    });

    // Get additional profile info
    let profile = {};
    if (user.role === 'student') {
      const [students] = await pool.query(
        `SELECT s.id as student_profile_id, s.student_id, s.class_id, c.name as class_name 
         FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?`,
        [user.id]
      );
      if (students.length > 0) profile = students[0];
    } else if (user.role === 'teacher') {
      const [teachers] = await pool.query(
        'SELECT id as teacher_profile_id, employee_id, department FROM teachers WHERE user_id = ?',
        [user.id]
      );
      if (teachers.length > 0) profile = teachers[0];
    }

    return {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        ...profile,
      },
    };
  }

  async getCurrentUser(userId) {
    const [users] = await pool.query(
      'SELECT id, full_name, username, email, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const user = users[0];
    let profile = {};

    if (user.role === 'student') {
      const [students] = await pool.query(
        `SELECT s.id as student_profile_id, s.student_id, s.class_id, c.name as class_name
         FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.user_id = ?`,
        [userId]
      );
      if (students.length > 0) profile = students[0];
    } else if (user.role === 'teacher') {
      const [teachers] = await pool.query(
        'SELECT id as teacher_profile_id, employee_id, department FROM teachers WHERE user_id = ?',
        [userId]
      );
      if (teachers.length > 0) profile = teachers[0];
    }

    return { ...user, ...profile };
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw { statusCode: 400, message: 'New password must be at least 6 characters long' };
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const isMatch = await comparePassword(currentPassword, users[0].password);
    if (!isMatch) {
      throw { statusCode: 400, message: 'Current password is incorrect' };
    }

    const hashed = await hashPassword(newPassword);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    return { success: true, message: 'Password updated successfully' };
  }

  async updateProfile(userId, data) {
    const { full_name, email } = data;
    const updates = [];
    const params = [];

    if (full_name) {
      updates.push('full_name = ?');
      params.push(full_name.trim());
    }

    if (email) {
      // Check email uniqueness
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.trim(), userId]);
      if (existing.length > 0) {
        throw { statusCode: 409, message: 'Email is already in use by another account' };
      }
      updates.push('email = ?');
      params.push(email.trim());
    }

    if (updates.length > 0) {
      params.push(userId);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return this.getCurrentUser(userId);
  }
}

module.exports = new AuthService();
