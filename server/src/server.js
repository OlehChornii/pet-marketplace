// server/src/server.js
console.log('Loading server.js');
const app = require('./app');
console.log('App loaded');
const logger = require('./utils/logger');
const pool = require('./config/database');

const PORT = process.env.PORT || 5000;

console.log('Starting server on port', PORT);

const server = app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════╗
║   🐾 Pet Marketplace Server Running 🐾     ║
╠════════════════════════════════════════════╣
║  Port:    ${PORT}                             ║
║  Env:     ${process.env.NODE_ENV || 'development'}                      ║
║  Status:  ✅ Ready                         ║
║  Payment: ${process.env.STRIPE_SECRET_KEY ? '✅ Stripe' : '⚠️  Not configured'}                        ║
║  Analytics: ✅ Enabled                     ║
╚════════════════════════════════════════════╝
  `);
});

const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    pool.end(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  gracefulShutdown();
});