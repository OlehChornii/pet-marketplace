// routes/users.js - ВИПРАВЛЕНИЙ
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { 
  validateRequest, 
  userValidationRules 
} = require('../middleware/validation');

router.post('/register', 
  userValidationRules.register,
  validateRequest,
  userController.register
);

router.post('/login', 
  userValidationRules.login,
  validateRequest,
  userController.login
);

router.post('/refresh-token', 
  userController.refreshToken
);

router.get('/profile', 
  auth.verifyToken, 
  userController.getProfile
);

router.put('/profile', 
  auth.verifyToken, 
  userValidationRules.updateProfile,
  validateRequest,
  userController.updateProfile
);

router.post('/change-password', 
  auth.verifyToken, 
  userValidationRules.changePassword,
  validateRequest,
  userController.changePassword
);

router.post('/logout', 
  auth.verifyToken, 
  auth.logout
);

module.exports = router;