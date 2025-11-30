// server/src/config/paymentConfig.js
module.exports = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  
  settings: {
    currency: 'UAH',
    allowedPaymentMethods: ['card'],
    webhookRetryAttempts: 3,
    sessionExpiration: 30 * 60 * 1000,
  },
  
  webhook: {
    timeout: 10000,
    maxBodySize: '1mb',
  },
};