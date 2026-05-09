const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Detection = require('../models/Detection');
const Job = require('../models/Job');

const PYTHON_API_BASE = process.env.PYTHON_API_BASE || 'http://localhost:8000';
const NODE_BASE = process.env.NODE_BASE || `http://localhost:${process.env.PORT || 3000}`;

const allowedTypes = ['ship', 'oilspill'];

exports.runDetection = async (req, res) => {
  const { type, imageId } = req.params;

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Use "ship" or "oilspill".' });
  }
  if (!imageId) {
    return res.status(400).json({ error: 'Image ID required' });
  }

  const jobId = uuidv4();

  const job = new Job({
    jobId,
    type,
    imageId,
    status: 'queued',
  });
  await job.save();

  res.status(202).json({
    accepted: true,
    jobId,
    message: `${type} detection queued`,
  });

  const callbackUrl = `${NODE_BASE}/api/detect/webhook`;

  axios.post(`${PYTHON_API_BASE}/start_detection`, {
      type,
      image_id: imageId,
      job_id: jobId,
      callback_url: callbackUrl,
    })
    .then(async () => {
      await Job.findOneAndUpdate({ jobId }, { status: 'running' });
      console.log(`Started ${type} detection job ${jobId}`);
    })
    .catch(async (err) => {
      console.error(`Failed to start detection job ${jobId}:`, err.message || err);
      await Job.findOneAndUpdate(
        { jobId },
        { status: 'failed', error: 'Failed to start detection process' }
      );
    });
};

exports.receiveWebhook = async (req, res) => {
  try {
    const { job_id, type, image_id, detections, error } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Missing job_id' });
    }

    const job = await Job.findOne({ jobId: job_id });
    if (!job) {
      console.warn(`Webhook for unknown job ${job_id}`);
      return res.status(404).json({ error: 'Unknown job ID' });
    }

    // If Python reported an error
    if (error) {
      await Job.findOneAndUpdate(
        { jobId: job_id },
        { status: 'failed', error }
      );
      console.log(`Job ${job_id} failed: ${error}`);
      return res.status(200).json({ received: true });
    }

    // ✅ Ship detections → save to Detection collection
    if (type === 'ship' && Array.isArray(detections)) {
      const doc = new Detection({
        imageId: image_id,
        type: 'ship',
        detections,
      });
      await doc.save();

      await Job.findOneAndUpdate(
        { jobId: job_id },
        { status: 'completed', detectionsCount: detections.length }
      );
      console.log(`Job ${job_id} (ship) completed — ${detections.length} detections saved.`);
    }

    // ✅ Oilspill jobs → mark completed (no detections stored)
    if (type === 'oilspill') {
      await Job.findOneAndUpdate(
        { jobId: job_id },
        { status: 'completed', detectionsCount: null }
      );
      console.log(`Job ${job_id} (oilspill) completed — mask generated.`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error handling webhook:', err);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
};

exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ jobId });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job.jobId,
      type: job.type,
      imageId: job.imageId,
      status: job.status,
      detectionsCount: job.detectionsCount,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  } catch (err) {
    console.error('Error fetching job status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getShipDetections = async (req, res) => {
  try {
    const { imageId } = req.params;
    const detectionDoc = await Detection.findOne({ imageId, type: 'ship' });
    if (!detectionDoc) {
      return res.status(404).json({ error: 'No ship detections found for this image' });
    }
    res.json({
      imageId: detectionDoc.imageId,
      detections: detectionDoc.detections,
      createdAt: detectionDoc.createdAt,
    });
  } catch (err) {
    console.error('Error fetching ship detections:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};