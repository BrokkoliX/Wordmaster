const { query } = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

class UserModel {
  /**
   * Create a new user
   */
  static async create({ email, password, username, firstName, lastName }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO users (email, password_hash, username, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, first_name, last_name, created_at`,
      [email, passwordHash, username, firstName, lastName]
    );

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query(
      `SELECT id, email, username, first_name, last_name, avatar_url, 
              email_verified, created_at, last_login_at
       FROM users WHERE id = $1`,
      [id]
    );

    return result.rows[0];
  }

  /**
   * Find user by ID including password hash (for password verification flows)
   */
  static async findByIdWithPassword(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0];
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    return result.rows[0];
  }

  /**
   * Update user
   */
  static async update(id, updates) {
    const allowedFields = ['username', 'first_name', 'last_name', 'avatar_url'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE users 
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, email, username, first_name, last_name, avatar_url, updated_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update password
   */
  static async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );
  }

  /**
   * Verify password
   */
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(id) {
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Delete user
   */
  static async delete(id) {
    await query('DELETE FROM users WHERE id = $1', [id]);
  }

  /**
   * Check if email exists
   */
  static async emailExists(email) {
    const result = await query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );

    return result.rows.length > 0;
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username) {
    const result = await query(
      'SELECT 1 FROM users WHERE username = $1',
      [username]
    );

    return result.rows.length > 0;
  }
}

module.exports = UserModel;
