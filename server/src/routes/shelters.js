// server/src/routes/shelters.js
const express = require('express');
const router = express.Router();
const shelterController = require('../controllers/shelterController');
const auth = require('../middleware/auth');

router.get('/', shelterController.getAllShelters);
router.get('/:id', shelterController.getShelterById);
router.post('/', auth.verifyToken, shelterController.createShelter);
router.put('/:id', auth.verifyToken, shelterController.updateShelter);

module.exports = router;