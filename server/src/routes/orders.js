// server/src/routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

router.get('/user', auth.verifyToken, orderController.getUserOrders);
router.get('/:id', auth.verifyToken, orderController.getOrderById);
router.post('/', auth.verifyToken, orderController.createOrder);

module.exports = router;