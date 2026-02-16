const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const followController = require('../controllers/follow.controller');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/follow/search?q=term
 * @desc    Search users by username or name
 * @access  Private
 */
router.get('/search', followController.searchUsers);

/**
 * @route   GET /api/follow/counts
 * @desc    Get followers/following/pending counts
 * @access  Private
 */
router.get('/counts', followController.getCounts);

/**
 * @route   GET /api/follow/followers
 * @desc    Get current user's followers
 * @access  Private
 */
router.get('/followers', followController.getFollowers);

/**
 * @route   GET /api/follow/following
 * @desc    Get list of users the current user follows
 * @access  Private
 */
router.get('/following', followController.getFollowing);

/**
 * @route   GET /api/follow/requests/pending
 * @desc    Get pending incoming follow requests
 * @access  Private
 */
router.get('/requests/pending', followController.getPendingRequests);

/**
 * @route   GET /api/follow/requests/sent
 * @desc    Get outgoing follow requests still pending
 * @access  Private
 */
router.get('/requests/sent', followController.getSentRequests);

/**
 * @route   POST /api/follow/:userId
 * @desc    Send a follow request to a user
 * @access  Private
 */
router.post('/:userId', followController.followUser);

/**
 * @route   DELETE /api/follow/:userId
 * @desc    Unfollow a user or cancel a pending request
 * @access  Private
 */
router.delete('/:userId', followController.unfollowUser);

/**
 * @route   POST /api/follow/:userId/accept
 * @desc    Accept a pending follow request
 * @access  Private
 */
router.post('/:userId/accept', followController.acceptRequest);

/**
 * @route   POST /api/follow/:userId/reject
 * @desc    Reject a pending follow request
 * @access  Private
 */
router.post('/:userId/reject', followController.rejectRequest);

module.exports = router;
