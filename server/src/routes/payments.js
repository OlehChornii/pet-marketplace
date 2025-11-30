// server/src/routes/payments.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/webhook', paymentController.handleWebhook);
router.post('/create-session', auth.verifyToken, paymentController.createPaymentSession);
router.get('/verify', auth.verifyToken, paymentController.verifyPaymentSession);
router.get('/receipt', auth.verifyToken, paymentController.getReceiptForOrder);

module.exports = router;