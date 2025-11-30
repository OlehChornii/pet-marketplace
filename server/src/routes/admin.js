// server/src/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

router.get('/pets/pending', adminAuth, adminController.getPendingPets);
router.put('/pets/:id/approve', adminAuth, adminController.approvePet);
router.put('/pets/:id/reject', adminAuth, adminController.rejectPet);
router.get('/adoptions', adminAuth, adminController.getAdoptionApplications);
router.put('/adoptions/:id', adminAuth, adminController.updateAdoptionStatus);
router.put('/breeders/:id/verify', adminAuth, adminController.verifyBreeder);

module.exports = router;