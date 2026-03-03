const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/user.model');

/**
 * Generate JWT tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    const { email, password, username, firstName, lastName } = req.body;

    // Check if user already exists
    if (await UserModel.emailExists(email)) {
      return res.status(409).json({
        error: {
          message: 'Email already registered',
          code: 'EMAIL_EXISTS',
        },
      });
    }

    if (username && await UserModel.usernameExists(username)) {
      return res.status(409).json({
        error: {
          message: 'Username already taken',
          code: 'USERNAME_EXISTS',
        },
      });
    }

    // Create user
    const user = await UserModel.create({
      email,
      password,
      username,
      firstName,
      lastName,
    });

    // Generate tokens
    const tokens = generateTokens(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: {
        message: 'Registration failed',
        code: 'REGISTRATION_FAILED',
      },
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Generate tokens
    const tokens = generateTokens(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Login failed',
        code: 'LOGIN_FAILED',
      },
    });
  }
};

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: {
          message: 'Refresh token required',
          code: 'NO_REFRESH_TOKEN',
        },
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Get user
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        },
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({
      accessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      error: {
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      },
    });
  }
};

/**
 * Logout user — invalidate refresh tokens server-side.
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        // Invalidate all refresh tokens for this user so stolen tokens
        // cannot be reused after the user explicitly logs out.
        const { query: dbQuery } = require('../config/database');
        await dbQuery(
          `DELETE FROM refresh_tokens WHERE user_id = $1`,
          [decoded.userId]
        );
      } catch {
        // Token may already be expired/invalid — that's fine during logout.
      }
    }

    res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: {
        message: 'Logout failed',
        code: 'LOGOUT_FAILED',
      },
    });
  }
};

/**
 * Request password reset
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: { message: 'Email is required', code: 'EMAIL_REQUIRED' },
      });
    }

    const user = await UserModel.findByEmail(email);

    // Always return success to avoid leaking whether an email exists
    if (!user) {
      return res.json({ message: 'If that email exists, a reset token has been generated.' });
    }

    // Invalidate any previous unused tokens for this user
    const { query: dbQuery } = require('../config/database');
    await dbQuery(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [user.id]
    );

    // Generate a secure random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await dbQuery(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // Only log the token in development — never expose it in production logs.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PASSWORD RESET][DEV ONLY] Token for ${email}: ${token}`);
    }

    // TODO: Send the token via email (SES, SendGrid, etc.) instead of
    // returning it in the response.  Never expose resetToken over HTTP.
    res.json({
      message: 'If that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      error: { message: 'Failed to process reset request', code: 'RESET_REQUEST_FAILED' },
    });
  }
};

/**
 * Reset password using token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: { message: 'Token and new password are required', code: 'MISSING_FIELDS' },
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: { message: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' },
      });
    }

    const { query: dbQuery } = require('../config/database');

    const result = await dbQuery(
      `SELECT prt.*, u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: { message: 'Invalid reset token', code: 'INVALID_TOKEN' },
      });
    }

    const resetRecord = result.rows[0];

    if (resetRecord.used) {
      return res.status(400).json({
        error: { message: 'This reset token has already been used', code: 'TOKEN_USED' },
      });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({
        error: { message: 'Reset token has expired', code: 'TOKEN_EXPIRED' },
      });
    }

    // Update password
    await UserModel.updatePassword(resetRecord.user_id, newPassword);

    // Mark token as used
    await dbQuery(
      "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
      [resetRecord.id]
    );

    console.log(`[PASSWORD RESET] Password updated for ${resetRecord.email}`);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: { message: 'Failed to reset password', code: 'RESET_FAILED' },
    });
  }
};
