// server/src/controllers/orderController.js
const pool = require('../config/database');

exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { items, shipping_address } = req.body;
    const total_price = items.reduce((sum, item) => sum + parseFloat(item.price), 0);
    
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_price, shipping_address, status, payment_status) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, total_price, shipping_address, 'pending', 'pending']
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
    
    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.*,
        json_agg(
          json_build_object(
            'pet_id', oi.pet_id,
            'price', oi.price,
            'pet_name', p.name,
            'pet_image', p.image_url
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN pets p ON oi.pet_id = p.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.*,
        u.email as user_email,
        json_agg(
          json_build_object(
            'pet_id', oi.pet_id,
            'price', oi.price,
            'pet_name', p.name,
            'pet_category', p.category,
            'pet_breed', p.breed,
            'pet_image', p.image_url
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN pets p ON oi.pet_id = p.id
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = $1 AND o.user_id = $2
       GROUP BY o.id, u.email`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.*,
        u.email as user_email,
        u.full_name as user_name,
        json_agg(
          json_build_object(
            'pet_id', oi.pet_id,
            'price', oi.price,
            'pet_name', p.name
          )
        ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN pets p ON oi.pet_id = p.id
       LEFT JOIN users u ON o.user_id = u.id
       GROUP BY o.id, u.email, u.full_name
       ORDER BY o.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};