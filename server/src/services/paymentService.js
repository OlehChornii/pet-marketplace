// server/src/services/paymentService.js
const logger = require('../utils/logger');

let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn('STRIPE_SECRET_KEY not configured. Payment functionality will be disabled.');
  } else {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    logger.info('Stripe initialized successfully');
  }
} catch (error) {
  logger.error('Failed to initialize Stripe:', error);
}

class PaymentService {

  isConfigured() {
    return !!stripe;
  }

  async createCheckoutSession(orderData, userId) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    try {
      logger.info('Creating checkout session', { orderId: orderData.order_id, userId });
      const { items, shipping_address, order_id } = orderData;

      const totalAmount = items.reduce((sum, item) => 
        sum + parseFloat(item.price), 0
      );

      const lineItems = items.map(item => ({
        price_data: {
          currency: 'uah',
          product_data: {
            name: item.name || `Тварина #${item.pet_id}`,
            description: item.description || 'Тварина з PetMatch',
          },
          unit_amount: Math.round(parseFloat(item.price) * 100),
        },
        quantity: 1,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
        customer_email: orderData.email,
        metadata: {
          order_id: order_id.toString(),
          user_id: userId.toString(),
          shipping_address: shipping_address,
        },
        locale: 'auto',
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      logger.error('Stripe session creation error:', error);
      throw new Error(`Failed to create payment session: ${error.message}`);
    }
  }

  verifyWebhookSignature(payload, signature) {
    if (!this.isConfigured()) {
      throw new Error('Stripe is not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  async getSessionDetails(sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      throw new Error('Failed to retrieve payment session');
    }
  }

  async createRefund(paymentIntentId, amount = null) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });
      return refund;
    } catch (error) {
      console.error('Refund creation error:', error);
      throw new Error('Failed to create refund');
    }
  }

  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      console.error('Failed to retrieve payment intent:', error);
      throw new Error('Failed to retrieve payment details');
    }
  }
}

module.exports = new PaymentService();