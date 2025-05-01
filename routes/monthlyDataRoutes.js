const express = require('express');
const router = express.Router();
const monthlyDataController = require('../controllers/monthlyDataController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.protect);

// Get monthly data for the current user
router.get('/', monthlyDataController.getUserMonthlyData);

// Get monthly data for specific month and year
router.get('/:month/:year', monthlyDataController.getMonthlyData);

// Create or update monthly data
router.post('/', monthlyDataController.createOrUpdateMonthlyData);

// Get monthly summary data for dashboard
router.get('/summary', monthlyDataController.getMonthlySummary);

// Get year summary for charts
router.get('/year-summary/:year', monthlyDataController.getYearSummary);

module.exports = router;