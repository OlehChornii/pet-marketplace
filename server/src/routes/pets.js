// server/src/routes/pets.js
console.log('Loading pets routes');
const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const auth = require('../middleware/auth');

router.get('/', petController.getAllPets);
router.get('/category/:category', petController.getPetsByCategory);
router.get('/breeds/:category', petController.getBreeds);
router.get('/:id', petController.getPetById);

router.post('/', auth.verifyToken, petController.createPet);
router.put('/:id', auth.verifyToken, petController.updatePet);
router.delete('/:id', auth.verifyToken, petController.deletePet);

module.exports = router;