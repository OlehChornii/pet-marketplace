// server/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const pool = require('./config/database');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || 
  ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy: Origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health'
});

// app.use('/api/', createLimiter(15 * 60 * 1000, 250, 'Too many requests'));
// app.use('/api/users/login', createLimiter(15 * 60 * 1000, 25, 'Too many login attempts'));
// app.use('/api/users/register', createLimiter(15 * 60 * 1000, 25, 'Too many registration attempts'));
// app.use('/api/admin/', createLimiter(60 * 60 * 1000, 10, 'Rate limit exceeded'));

const paymentRoutes = require('./routes/payments');
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(hpp({
  whitelist: ['price', 'category', 'sort']
}));

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  }
}));

app.use(requestLogger);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

pool.query('SELECT NOW()')
  .then(() => logger.info('Database connected'))
  .catch(err => logger.error('Database connection error:', err));

const chatRoutes = require('./routes/chat');
const petsRoutes = require('./routes/pets');
const usersRoutes = require('./routes/users');
const sheltersRoutes = require('./routes/shelters');
const breedersRoutes = require('./routes/breeders');
const ordersRoutes = require('./routes/orders');
const articlesRoutes = require('./routes/articles');
const adoptionsRoutes = require('./routes/adoptions');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/pets', petsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/shelters', sheltersRoutes);
app.use('/api/breeders', breedersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/adoptions', adoptionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    payment: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      configured: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET
    }
  });
});

app.get('/api/payments/webhook-status', (req, res) => {
  res.json({
    configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    endpoint: '/api/payments/webhook',
    ready: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
    info: `Run: stripe listen --forward-to ${process.env.REACT_APP_API_URL}/payments/webhook`
  });
});

app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(isDev && { stack: err.stack })
  });
});

module.exports = app;