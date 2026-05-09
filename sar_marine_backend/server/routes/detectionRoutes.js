const express = require('express');
const router = express.Router();
const detectionController = require('../controllers/detectionController');

router.get('/status/:jobId', detectionController.getJobStatus);

// Trigger detection (returns immediately and job is processed in background)
router.post('/:type/:imageId', detectionController.runDetection);

// Webhook endpoint for Python to POST back detection results
router.post('/webhook', detectionController.receiveWebhook);
router.get('/ship/:imageId', detectionController.getShipDetections);

module.exports = router;
