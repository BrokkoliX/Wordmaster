/**
 * Middleware to check if authenticated user has admin privileges
 * 
 * This should be used AFTER the authenticate middleware
 * Usage: router.use(authenticate, isAdmin)
 */

const { query } = require('../config/database');

const isAdmin = async (req, res, next) => {
  try {
    // Check if user is authenticated (should be set by authenticate middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
        },
      });
    }

    // Check if user has admin role
    // You'll need to add a 'role' column to users table or create a separate admins table
    const result = await query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions. Admin access required.',
        },
      });
    }

    // User is admin, proceed
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      error: {
        message: 'Error checking admin privileges',
      },
    });
  }
};

module.exports = { isAdmin };
