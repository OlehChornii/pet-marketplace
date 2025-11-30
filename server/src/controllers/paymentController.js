// server/src/controllers/paymentController.js
const pool = require('../config/database');
const paymentService = require('../services/paymentService');
const logger = require('../utils/logger');

exports.createPaymentSession = async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!paymentService.isConfigured()) {
      return res.status(503).json({ 
        error: 'Payment service is not configured. Please contact administrator.' 
      });
    }

    await client.query('BEGIN');
    
    const { items, shipping_address } = req.body;
    const userId = req.user.id;

    logger.info('Creating payment session', { userId, itemsCount: items.length });

    const userResult = await client.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const total_price = items.reduce((sum, item) => 
      sum + parseFloat(item.price), 0
    );

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_price, shipping_address, status, payment_status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, total_price, shipping_address, 'pending', 'pending']
    );
    
    const order = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, pet_id, price) VALUES ($1, $2, $3)',
        [order.id, item.pet_id, item.price]
      );
      
      await client.query(
        'UPDATE pets SET status = $1 WHERE id = $2',
        ['pending', item.pet_id]
      );
    }

    const session = await paymentService.createCheckoutSession({
      items,
      shipping_address,
      order_id: order.id,
      email: userResult.rows[0].email,
    }, userId);

    await client.query(
      'UPDATE orders SET stripe_session_id = $1 WHERE id = $2',
      [session.sessionId, order.id]
    );

    await client.query('COMMIT');

    logger.info('Payment session created successfully', { orderId: order.id, sessionId: session.sessionId });

    res.status(200).json({
      sessionId: session.sessionId,
      url: session.url,
      orderId: order.id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating payment session:', error);
    res.status(500).json({ 
      error: 'Failed to create payment session',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

exports.handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const payload = req.body;

  logger.info('Webhook received', { hasSignature: !!signature });

  let event;
  try {
    event = paymentService.verifyWebhookSignature(payload, signature);
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await processWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

async function processWebhookEvent(event) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    try {
      await client.query(
        `INSERT INTO webhook_logs (event_id, event_type, payload, processed_at) 
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (event_id) DO NOTHING`,
        [event.id, event.type, JSON.stringify(event)]
      );
    } catch (logError) {
      logger.warn('Could not log webhook event (table may not exist):', logError.message);
    }

    logger.info('Processing webhook event', { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(client, event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(client, event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(client, event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(client, event.data.object);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error processing webhook event:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function handleCheckoutCompleted(client, session) {
  const orderId = session?.metadata?.order_id;

  logger.info('Processing checkout completion', { orderId });

  if (!orderId) {
    logger.warn('checkout.session.completed received without order_id in metadata', { sessionId: session.id });
    return;
  }

  const orderRes = await client.query(
    'SELECT id, user_id FROM orders WHERE id = $1',
    [orderId]
  );

  if (orderRes.rows.length === 0) {
    logger.warn('Order not found for checkout completion', { orderId });
    return;
  }

  const buyerId = orderRes.rows[0].user_id;

  await client.query(
    `UPDATE orders 
     SET status = $1, payment_status = $2, payment_intent_id = $3, paid_at = NOW() 
     WHERE id = $4`,
    ['confirmed', 'paid', session.payment_intent, orderId]
  );

  await client.query(
    `UPDATE pets
     SET status = 'sold', owner_id = $1
     WHERE id IN (
       SELECT pet_id FROM order_items WHERE order_id = $2
     )`,
    [buyerId, orderId]
  );

  logger.info(`Order ${orderId} marked as paid and pets assigned to user ${buyerId}`);
}

async function handlePaymentSucceeded(client, paymentIntent) {
  console.log(`Payment ${paymentIntent.id} succeeded`);
}

async function handleRefund(client, charge) {
  const paymentIntentId = charge.payment_intent;

  const result = await client.query(
    'SELECT id FROM orders WHERE payment_intent_id = $1',
    [paymentIntentId]
  );

  if (result.rows.length === 0) {
    logger.warn('Refund received but no order found for payment_intent', { paymentIntentId });
    return;
  }

  const orderId = result.rows[0].id;

  await client.query(
    `UPDATE orders 
     SET status = $1, payment_status = $2, refunded_at = NOW() 
     WHERE id = $3`,
    ['refunded', 'refunded', orderId]
  );

  await client.query(
    `UPDATE pets
     SET status = 'available', owner_id = NULL
     WHERE id IN (
       SELECT pet_id FROM order_items WHERE order_id = $1
     )`,
    [orderId]
  );

  logger.info(`Order ${orderId} refunded; pets released and owner cleared`);
}

async function handlePaymentFailed(client, paymentIntent) {
  const result = await client.query(
    'SELECT id FROM orders WHERE payment_intent_id = $1',
    [paymentIntent.id]
  );

  if (result.rows.length > 0) {
    const orderId = result.rows[0].id;

    await client.query(
      `UPDATE orders 
       SET status = $1, payment_status = $2 
       WHERE id = $3`,
      ['cancelled', 'failed', orderId]
    );

    await client.query(
      `UPDATE pets 
       SET status = 'available', owner_id = NULL
       WHERE id IN (
         SELECT pet_id FROM order_items WHERE order_id = $1
       )`,
      [orderId]
    );

    logger.info(`Order ${orderId} payment failed, pets released`);
  } else {
    logger.warn('Payment failed event but no order found for payment_intent', { paymentIntentId: paymentIntent.id });
  }
}

exports.verifyPaymentSession = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    logger.info('Verifying payment session', { sessionId: session_id });

    const session = await paymentService.getSessionDetails(session_id);
    const orderId = session.metadata.order_id;

    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      order: result.rows[0],
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getReceiptForOrder = async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) {
      return res.status(400).json({ error: 'order_id required' });
    }

    const orderRes = await pool.query(
      'SELECT id, user_id, payment_intent_id, stripe_session_id FROM orders WHERE id = $1',
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];
    const paymentIntentId = order.payment_intent_id;

    let receiptQuery;
    let params;
    if (paymentIntentId) {
      receiptQuery = `
        SELECT payload->'data'->'object'->>'receipt_url' AS receipt_url,
               event_type, created_at
        FROM webhook_logs
        WHERE (payload->'data'->'object'->>'payment_intent') = $1
          AND (payload->'data'->'object'->>'receipt_url') IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params = [paymentIntentId];
    } else {
      receiptQuery = `
        SELECT payload->'data'->'object'->>'receipt_url' AS receipt_url,
               event_type, created_at
        FROM webhook_logs
        WHERE (payload->'data'->'object'->>'checkout_session') = $1
          OR (payload->'data'->'object'->>'session') = $1
          OR (payload->'data'->'object'->>'id') = $1
        AND (payload->'data'->'object'->>'receipt_url') IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;
      params = [order.stripe_session_id];
    }

    const r = await pool.query(receiptQuery, params);

    if (r.rows.length === 0 || !r.rows[0].receipt_url) {
      return res.json({ receipt_url: null, message: 'Receipt not yet available' });
    }

    return res.json({
      receipt_url: r.rows[0].receipt_url,
      event_type: r.rows[0].event_type,
      found_at: r.rows[0].created_at,
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt', details: error.message });
  }
};