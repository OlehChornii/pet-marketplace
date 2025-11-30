// server/src/routes/adoptions.js
const express = require('express');
const router = express.Router();
const adoptionsController = require('../controllers/adoptionsController');
const auth = require('../middleware/auth');

router.post('/', auth.verifyToken, adoptionsController.createApplication);
router.get('/user', auth.verifyToken, adoptionsController.getUserApplications);
router.get('/check/:petId', auth.verifyToken, adoptionsController.checkExistingApplication);
router.get('/:id', auth.verifyToken, adoptionsController.getApplicationById);
router.put('/:id/cancel', auth.verifyToken, adoptionsController.cancelApplication);

module.exports = router;