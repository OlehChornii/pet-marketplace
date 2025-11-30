// server/src/routes/analytics.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { adminAuth } = require('../middleware/auth');

router.get('/overview', adminAuth, analyticsController.overview);
router.get('/timeseries', adminAuth, analyticsController.timeseries);
router.get('/top-endpoints', adminAuth, analyticsController.topEndpoints);

module.exports = router;