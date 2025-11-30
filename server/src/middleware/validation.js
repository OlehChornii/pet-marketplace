// server/src/middleware/validation.js
const { validationResult, body, param, query } = require('express-validator');
const { normalizeEmail } = require('../utils/emailNormalizer');
const logger = require('../utils/logger');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', { 
      errors: errors.array(), 
      path: req.path,
      ip: req.ip 
    });
    
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

const customValidators = {
  isStrongPassword: (value) => {
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },
  
  isPetCategory: (value) => {
    const validCategories = ['dog', 'cat', 'bird', 'fish', 'other'];
    return validCategories.includes(value);
  },
  
  isUkrainianPhone: (value) => {
    return /^(\+380|0)\d{9}$/.test(value);
  }
};

const petValidationRules = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
      .escape(),
    
    body('category')
      .notEmpty().withMessage('Category is required')
      .custom(customValidators.isPetCategory).withMessage('Invalid category'),
    
    body('price')
      .optional({ nullable: true })
      .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be between 0 and 1,000,000')
      .toFloat(),
    
    body('age')
      .optional({ nullable: true })
      .isInt({ min: 0, max: 50 }).withMessage('Age must be between 0 and 50')
      .toInt(),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters')
      .escape(),
    
    body('breed')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Breed must be less than 100 characters')
      .escape()
  ],
  
  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
      .escape(),
    
    body('category')
      .optional()
      .custom(customValidators.isPetCategory).withMessage('Invalid category'),
    
    body('price')
      .optional({ nullable: true })
      .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be between 0 and 1,000,000')
      .toFloat(),
    
    body('age')
      .optional({ nullable: true })
      .isInt({ min: 0, max: 50 }).withMessage('Age must be between 0 and 50')
      .toInt(),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters')
      .escape()
  ]
};

const userValidationRules = {
  register: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Valid email is required')
      .customSanitizer(normalizeEmail)
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    
    body('first_name')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
      .matches(/^[a-zA-Zа-яА-ЯіІїЇєЄ\s'-]+$/).withMessage('First name contains invalid characters')
      .escape(),
    
    body('last_name')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
      .matches(/^[a-zA-Zа-яА-ЯіІїЇєЄ\s'-]+$/).withMessage('Last name contains invalid characters')
      .escape(),
    
    body('phone')
      .optional({ nullable: true })
      .trim()
      .custom(customValidators.isUkrainianPhone)
      .withMessage('Invalid Ukrainian phone number format (+380XXXXXXXXX or 0XXXXXXXXX)')
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Valid email is required')
      .customSanitizer(normalizeEmail)
      .normalizeEmail(),
    
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  
  updateProfile: [
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters')
      .matches(/^[a-zA-Zа-яА-ЯіІїЇєЄ\s'-]+$/).withMessage('First name contains invalid characters')
      .escape(),
    
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters')
      .matches(/^[a-zA-Zа-яА-ЯіІїЇєЄ\s'-]+$/).withMessage('Last name contains invalid characters')
      .escape(),
    
    body('phone')
      .optional({ nullable: true })
      .trim()
      .custom(customValidators.isUkrainianPhone)
      .withMessage('Invalid Ukrainian phone number format')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must contain uppercase, lowercase, number and special character')
  ]
};

const paramValidation = {
  id: [
    param('id')
      .isInt({ min: 1 }).withMessage('ID must be a positive integer')
      .toInt()
  ],
  
  petId: [
    param('petId')
      .isInt({ min: 1 }).withMessage('Pet ID must be a positive integer')
      .toInt()
  ],
  
  orderId: [
    param('orderId')
      .isInt({ min: 1 }).withMessage('Order ID must be a positive integer')
      .toInt()
  ]
};

const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer')
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt()
  ],
  
  petFilters: [
    query('category')
      .optional()
      .custom(customValidators.isPetCategory).withMessage('Invalid category'),
    
    query('minPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Min price must be positive')
      .toFloat(),
    
    query('maxPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Max price must be positive')
      .toFloat(),
    
    query('sortBy')
      .optional()
      .isIn(['price', 'age', 'created_at', 'name']).withMessage('Invalid sort field'),
    
    query('order')
      .optional()
      .isIn(['asc', 'desc']).withMessage('Order must be "asc" or "desc"')
      .toLowerCase()
  ],
  
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Search query must be 2-100 characters')
      .escape()
  ]
};

module.exports = {
  validateRequest,
  
  petValidationRules,
  userValidationRules,
  paramValidation,
  queryValidation,
  
  customValidators
};