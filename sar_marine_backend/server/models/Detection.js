const mongoose = require('mongoose')

const detectionSchema = new mongoose.Schema({
  imageId: { type: String, required: true },
  type: { type: String, enum: ['ship', 'oilspill'], required: true },
  detections: { type: Array, required: true } // store bounding boxes or detection data
}, { timestamps: true });

module.exports = mongoose.model('Detection', detectionSchema);

