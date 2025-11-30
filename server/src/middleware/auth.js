// server/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const tokenBlacklist = new Set();

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  logger.info('Token added to blacklist');
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

const getDecodedFromHeader = (req) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    const err = new Error('No authorization header provided');
    err.status = 401;
    throw err;
  }

  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Invalid authorization format. Use: Bearer <token>');
    err.status = 401;
    throw err;
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token || token.length === 0) {
    const err = new Error('Authentication token required');
    err.status = 401;
    throw err;
  }

  if (isTokenBlacklisted(token)) {
    const err = new Error('Token has been revoked');
    err.status = 401;
    throw err;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token has expired');
      err.status = 401;
      throw err;
    }
    if (error.name === 'JsonWebTokenError') {
      const err = new Error('Invalid token');
      err.status = 401;
      throw err;
    }
    throw error;
  }
};

const verifyToken = (req, res, next) => {
  try {
    const decoded = getDecodedFromHeader(req);
    req.user = decoded;
    req.token = req.header('Authorization').replace('Bearer ', '');
    
    logger.info(`User authenticated: ${decoded.email}`, {
      userId: decoded.id,
      role: decoded.role
    });
    
    next();
  } catch (error) {
    logger.warn('Authentication failed:', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    
    res.status(error.status || 401).json({ 
      error: error.message || 'Invalid token' 
    });
  }
};

const adminAuth = (req, res, next) => {
  try {
    const decoded = getDecodedFromHeader(req);
    
    if (decoded.role !== 'admin') {
      logger.warn('Unauthorized admin access attempt', {
        userId: decoded.id,
        email: decoded.email,
        ip: req.ip
      });
      
      return res.status(403).json({ 
        error: 'Admin access required' 
      });
    }
    
    req.user = decoded;
    req.token = req.header('Authorization').replace('Bearer ', '');
    
    logger.info(`Admin authenticated: ${decoded.email}`);
    
    next();
  } catch (error) {
    logger.warn('Admin authentication failed:', {
      error: error.message,
      ip: req.ip
    });
    
    res.status(error.status || 401).json({ 
      error: error.message || 'Invalid token' 
    });
  }
};

const ownerAuth = (resourceIdParam = 'id') => {
  return (req, res, next) => {
    try {
      const decoded = getDecodedFromHeader(req);
      req.user = decoded;
      
      const resourceId = parseInt(req.params[resourceIdParam]);
      const userId = decoded.id;
      
      if (decoded.role === 'admin') {
        return next();
      }
      
      if (resourceId !== userId) {
        logger.warn('Unauthorized resource access attempt', {
          userId: userId,
          attemptedResourceId: resourceId,
          ip: req.ip
        });
        
        return res.status(403).json({ 
          error: 'You can only modify your own resources' 
        });
      }
      
      next();
    } catch (error) {
      res.status(error.status || 401).json({ 
        error: error.message || 'Invalid token' 
      });
    }
  };
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = getDecodedFromHeader(req);
      req.user = decoded;
    }
    next();
  } catch (error) {
    next();
  }
};

const logout = (req, res) => {
  try {
    const token = req.token;
    if (token) {
      blacklistToken(token);
      logger.info('User logged out', { userId: req.user.id });
      res.json({ message: 'Logged out successfully' });
    } else {
      res.status(400).json({ error: 'No token provided' });
    }
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};

module.exports = {
  verifyToken,
  adminAuth,
  ownerAuth,
  optionalAuth,
  logout,
  blacklistToken,
  isTokenBlacklisted
};