const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload destination
const uploadPath = path.join(__dirname, '../../shared/uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const allowedTypes = ['ship', 'oilspill'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { type } = req.params;
    if (!allowedTypes.includes(type)) {
      return cb(new Error('Invalid upload type'), null);
    }

    const targetPath = path.join(uploadPath, type);
    fs.mkdirSync(targetPath, { recursive: true });
    cb(null, targetPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/tiff', 'image/tif', 'image/x-tiff'];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only TIFF files are allowed!'));
  }
});

// Middleware for upload with type
const uploadHandler = (req, res, next) => {
  const uploadMiddleware = upload.single('image');
  uploadMiddleware(req, res, err => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Upload image to a specific type (ship or oilspill)
router.post('/upload/:type', uploadHandler, imageController.uploadImage);

// List uploaded images by type (ship or oilspill)
router.get('/uploads/:type', imageController.listUploadsByType);
// List oilspill output images
router.get('/outputs/oilspill',imageController.listOilspillOutputsDzi)
module.exports = router;
