// server/src/routes/breeders.js
const express = require('express');
const router = express.Router();
const breederController = require('../controllers/breederController');
const auth = require('../middleware/auth');

router.get('/', breederController.getAllBreeders);
router.get('/:id', breederController.getBreederById);
router.post('/', auth.verifyToken, breederController.createBreeder);
router.put('/:id', auth.verifyToken, breederController.updateBreeder);

module.exports = router;