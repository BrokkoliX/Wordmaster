const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const serverConfig = require('./config/serverConfig');

const app = express();

// Trust the first proxy hop (Nginx on localhost).
// Required so express-rate-limit can read the real client IP from
// X-Forwarded-For without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Only log HTTP requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- Rate Limiting ---
// Each limiter reads max and windowMs live from the serverConfig singleton
// so values can be changed via the admin UI without a server restart.

const globalLimiter = rateLimit({
  windowMs: () => serverConfig.get('rate_limit.global', { windowMs: 900000 }).windowMs,
  max:       () => serverConfig.get('rate_limit.global', { max: 100 }).max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later', code: 'RATE_LIMITED' } },
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: () => serverConfig.get('rate_limit.auth', { windowMs: 900000 }).windowMs,
  max:       () => serverConfig.get('rate_limit.auth', { max: 10 }).max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many auth attempts, please try again later', code: 'AUTH_RATE_LIMITED' } },
});

const adminLimiter = rateLimit({
  windowMs: () => serverConfig.get('rate_limit.admin', { windowMs: 900000 }).windowMs,
  max:       () => serverConfig.get('rate_limit.admin', { max: 200 }).max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many admin requests, please try again later', code: 'ADMIN_RATE_LIMITED' } },
});

const subscriptionLimiter = rateLimit({
  windowMs: () => serverConfig.get('rate_limit.subscription', { windowMs: 900000 }).windowMs,
  max:       () => serverConfig.get('rate_limit.subscription', { max: 60 }).max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many subscription requests, please try again later', code: 'SUBSCRIPTION_RATE_LIMITED' } },
});

const heartsLimiter = rateLimit({
  windowMs: () => serverConfig.get('rate_limit.hearts', { windowMs: 900000 }).windowMs,
  max:       () => serverConfig.get('rate_limit.hearts', { max: 60 }).max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many hearts requests, please try again later', code: 'HEARTS_RATE_LIMITED' } },
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/progress', require('./routes/progress.routes'));
app.use('/api/words', require('./routes/words.routes'));
app.use('/api/sentences', require('./routes/sentences.routes'));
app.use('/api/follow', require('./routes/follow.routes'));
app.use('/api/leaderboard', require('./routes/leaderboard.routes'));
app.use('/api/admin', adminLimiter, require('./routes/admin.routes'));
app.use('/api/subscriptions', subscriptionLimiter, require('./routes/subscription.routes'));
app.use('/api/hearts', heartsLimiter, require('./routes/hearts.routes'));
// Public config endpoint (no auth) – consumed by mobile app on startup
app.use('/api/config', require('./routes/config.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.path,
    },
  });
});

const PORT = process.env.PORT || 3000;

async function start() {
  // Load system settings into the in-memory cache before accepting traffic.
  // Non-fatal: hardcoded defaults remain in effect if the DB is unreachable.
  await serverConfig.load();

  // Seed achievement definitions (idempotent — uses ON CONFLICT).
  try {
    const fs = require('fs');
    const path = require('path');
    const { query: dbQuery } = require('./config/database');
    const seedSql = fs.readFileSync(
      path.join(__dirname, 'scripts', 'migrations', 'seed_achievement_definitions.sql'),
      'utf8'
    );
    await dbQuery(seedSql);
    console.log('✅ Achievement definitions seeded');
  } catch (err) {
    console.warn('⚠️  Achievement seed skipped:', err.message);
  }

  // Run hearts system migration (idempotent — IF NOT EXISTS / ON CONFLICT).
  // Seeds tables, subscription plan features, server_config rows for hearts
  // tuning, hearts rate limiter, and JWT token expiry settings.
  try {
    const fs = require('fs');
    const path = require('path');
    const { query: dbQuery } = require('./config/database');
    const heartsSql = fs.readFileSync(
      path.join(__dirname, 'scripts', 'migrations', 'add_hearts_system.sql'),
      'utf8'
    );
    await dbQuery(heartsSql);
    console.log('✅ Hearts system migration applied');

    // Reload serverConfig so new server_config rows are available immediately.
    await serverConfig.reload();
  } catch (err) {
    console.warn('⚠️  Hearts migration skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

start();

module.exports = app;
