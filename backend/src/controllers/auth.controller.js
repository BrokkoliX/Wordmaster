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
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
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
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
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
 * Logout user (optional - can just delete tokens on client)
 */
exports.logout = async (req, res) => {
  try {
    // In a more complex setup, you would invalidate the refresh token here
    // For now, client-side token deletion is sufficient

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
