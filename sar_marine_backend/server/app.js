require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const imageRoutes = require('./routes/imageRoutes');
const dziRoutes = require('./routes/dziRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const path = require('path');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sardb';
mongoose.connect(MONGO_URI).then(async () => {
  console.log(`Connected to db (${MONGO_URI})`);
  try {
    const db = mongoose.connection.db;
    const jobs = await db.collection('jobs').countDocuments();
    const detections = await db.collection('detections').countDocuments();
    const users = await db.collection('users').countDocuments();
    console.log(`  📊 DB Stats: ${jobs} jobs | ${detections} detections | ${users} users`);

    const recentJobs = await db.collection('jobs').find().sort({ createdAt: -1 }).limit(5).toArray();
    if (recentJobs.length > 0) {
      console.log('  📋 Recent Jobs:');
      recentJobs.forEach(j => {
        const status = j.status === 'completed' ? '✅' : j.status === 'failed' ? '❌' : '⏳';
        console.log(`     ${status} [${j.type}] ${j.imageId} → ${j.status} (${new Date(j.createdAt).toLocaleString()})`);
      });
    }
  } catch (e) {
    console.warn('  Could not fetch DB stats:', e.message);
  }
}).catch((e) => console.error(e))

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(cookieParser());
app.use('/api/auth', authRoutes);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve oil spill DZI tiles
app.use('/tiles/oilspill', express.static(path.join(__dirname, '../shared/tiles/oilspill')));

// Serve ship detection DZI tiles
app.use('/tiles/ship', express.static(path.join(__dirname, '../shared/tiles/ship')));
app.use('/outputs/oilspill',express.static(path.join(__dirname,'../shared/outputs/oilspill')))
app.use('/uploads', express.static(path.join(__dirname, '../shared/uploads')));

// uploading images and gettiing list of images
app.use('/api/images', imageRoutes);
// DZI generation routes for uploaded images
app.use('/api/dzi', dziRoutes);
// Detection routes for ship and oil spill
app.use('/api/detect', detectionRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});