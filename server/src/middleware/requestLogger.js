// server/src/middleware/requestLogger.js
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

module.exports = function requestLogger(req, res, next) {
  const start = Date.now();
  
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    res.locals.responseData = data;
    return originalJson(data);
  };

  res.on('finish', async () => {
    try {
      const duration = Date.now() - start;
      
      const entry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        duration: duration,
        userId: req.user ? req.user.id : null,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || 'unknown'
      };

      if (entry.path === '/api/health' || 
          entry.path.startsWith('/static') ||
          entry.path.startsWith('/favicon')) {
        return;
      }

      await analyticsService.record(entry);

      if (duration > 1000) {
        logger.warn('Slow request detected', {
          path: entry.path,
          duration: duration,
          status: entry.status
        });
      }

      if (res.statusCode >= 400) {
        logger.security('HTTP error', {
          path: entry.path,
          status: entry.status,
          method: entry.method,
          ip: entry.ip
        });
      }

    } catch (error) {
      logger.error('Request logging error:', error);
    }
  });

  next();
};