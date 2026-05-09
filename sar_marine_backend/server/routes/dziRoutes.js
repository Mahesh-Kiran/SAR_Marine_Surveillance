const express = require('express');
const router = express.Router();
const dziController = require('../controllers/dziController');

// Route: POST /dzi/generate/:type/:imageId
router.post('/generate/:type/:imageId', dziController.generateDZI);
router.get('/:type', dziController.listDZIs);
module.exports = router;
