// server/src/controllers/userController.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { normalizeEmail } = require('../utils/emailNormalizer');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'pet-marketplace',
      audience: 'pet-marketplace-users'
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: '30d'
    }
  );
};

exports.register = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { email, password, first_name, last_name, phone } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      logger.warn('Registration attempt with existing email', { 
        email: normalizedEmail,
        ip: req.ip 
      });
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, phone, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, email, first_name, last_name, role, created_at`,
      [normalizedEmail, hashedPassword, first_name, last_name, phone || null]
    );

    const user = result.rows[0];

    await client.query('COMMIT');

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info('New user registered', { 
      userId: user.id, 
      email: user.email,
      ip: req.ip 
    });

    res.status(201).json({ 
      user, 
      token,
      refreshToken,
      message: 'Registration successful'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error registering user:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to register user' });
  } finally {
    client.release();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      logger.warn('Failed login attempt - user not found', { 
        email: normalizedEmail,
        ip: req.ip 
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.warn('Failed login attempt - wrong password', { 
        userId: user.id,
        email: normalizedEmail,
        ip: req.ip 
      });

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    delete user.password;

    logger.info('User logged in successfully', { 
      userId: user.id,
      email: user.email,
      ip: req.ip 
    });

    res.json({ 
      user, 
      token,
      refreshToken,
      message: 'Login successful'
    });

  } catch (error) {
    logger.error('Error logging in:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });
    res.status(500).json({ error: 'Failed to login' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    logger.info('Token refreshed', { userId: user.id });

    res.json({ 
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, role, created_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone)
       WHERE id = $4 
       RETURNING id, email, first_name, last_name, phone, role`,
      [first_name || null, last_name || null, phone || null, req.user.id]
    );

    logger.info('Profile updated', { userId: req.user.id });

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current and new passwords are required' 
      });
    }

    const result = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      logger.warn('Failed password change - wrong current password', { 
        userId: req.user.id 
      });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    logger.info('Password changed successfully', { userId: req.user.id });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = exports;