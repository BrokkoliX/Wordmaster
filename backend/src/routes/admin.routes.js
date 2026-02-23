const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/isAdmin.middleware');
const adminController = require('../controllers/admin.controller');

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(isAdmin);

// ========== USER MANAGEMENT ==========
// GET /api/admin/users - List all users with pagination & filters
router.get('/users', adminController.getAllUsers);

// GET /api/admin/users/:id - Get specific user details
router.get('/users/:id', adminController.getUserDetails);

// PUT /api/admin/users/:id - Update user (role, status, etc.)
router.put('/users/:id', adminController.updateUser);

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', adminController.deleteUser);

// GET /api/admin/users/:id/progress - Get user's learning progress
router.get('/users/:id/progress', adminController.getUserProgress);

// ========== LANGUAGE & VOCABULARY MANAGEMENT ==========
// GET /api/admin/languages - Get all available languages with stats
router.get('/languages', adminController.getLanguages);

// POST /api/admin/languages - Add new language pair
router.post('/languages', adminController.addLanguage);

// GET /api/admin/words/stats - Get word database statistics
router.get('/words/stats', adminController.getWordStats);

// POST /api/admin/words/import - Bulk import words from CSV/JSON
router.post('/words/import', adminController.importWords);

// DELETE /api/admin/words/:id - Delete a word
router.delete('/words/:id', adminController.deleteWord);

// PUT /api/admin/words/:id - Update a word
router.put('/words/:id', adminController.updateWord);

// ========== SENTENCE TEMPLATES ==========
// GET /api/admin/sentences - Get all sentence templates
router.get('/sentences', adminController.getSentences);

// POST /api/admin/sentences - Add new sentence template
router.post('/sentences', adminController.addSentence);

// PUT /api/admin/sentences/:id - Update sentence
router.put('/sentences/:id', adminController.updateSentence);

// DELETE /api/admin/sentences/:id - Delete sentence
router.delete('/sentences/:id', adminController.deleteSentence);

// ========== ANALYTICS & STATISTICS ==========
// GET /api/admin/stats - Overall platform statistics
router.get('/stats', adminController.getPlatformStats);

// GET /api/admin/stats/users - User statistics (growth, activity)
router.get('/stats/users', adminController.getUserStats);

// GET /api/admin/stats/learning - Learning statistics (popular languages, etc.)
router.get('/stats/learning', adminController.getLearningStats);

// ========== DATABASE OPERATIONS ==========
// POST /api/admin/database/backup - Create database backup
router.post('/database/backup', adminController.createBackup);

// GET /api/admin/database/health - Check database health
router.get('/database/health', adminController.checkDatabaseHealth);

// POST /api/admin/database/query - Execute a read-only SQL query
router.post('/database/query', adminController.executeQuery);

// GET /api/admin/database/schema - Get database schema metadata
router.get('/database/schema', adminController.getSchema);

module.exports = router;
