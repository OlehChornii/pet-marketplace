// server/src/controllers/analyticsController.js
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

exports.overview = async (req, res) => {
  try {
    const data = await analyticsService.getOverview(req.query);
    
    if (!data) {
      return res.status(500).json({ error: 'Failed to retrieve analytics overview' });
    }
    
    res.json({
      success: true,
      data
    });
    
  } catch (error) {
    logger.error('Analytics overview error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

exports.timeseries = async (req, res) => {
  try {
    const { metric = 'requests', range = '24h' } = req.query;
    
    const validMetrics = ['requests', 'errors', 'avgDuration'];
    const validRanges = ['24h', '7d', '30d'];
    
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ 
        error: 'Invalid metric',
        validMetrics 
      });
    }
    
    if (!validRanges.includes(range)) {
      return res.status(400).json({ 
        error: 'Invalid range',
        validRanges 
      });
    }
    
    const data = await analyticsService.getTimeseries(metric, range);
    
    if (!data) {
      return res.status(500).json({ error: 'Failed to retrieve timeseries data' });
    }
    
    res.json({
      success: true,
      data
    });
    
  } catch (error) {
    logger.error('Analytics timeseries error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};

exports.topEndpoints = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    if (limit < 1 || limit > 50) {
      return res.status(400).json({ 
        error: 'Invalid limit (must be 1-50)' 
      });
    }
    
    const overview = await analyticsService.getOverview();
    
    if (!overview) {
      return res.status(500).json({ error: 'Failed to retrieve endpoints data' });
    }
    
    res.json({
      success: true,
      data: overview.topEndpoints
    });
    
  } catch (error) {
    logger.error('Analytics top endpoints error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};