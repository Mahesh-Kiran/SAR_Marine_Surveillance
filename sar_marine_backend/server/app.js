require('dotenv').config();
const express = require('express');
const cors = require('cors');
const imageRoutes = require('./routes/imageRoutes');
const dziRoutes = require('./routes/dziRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const path = require('path');
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/sardb').then(()=>console.log('Conntected to db')).catch((e)=>console.error(e))

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve oil spill DZI tiles
app.use('/tiles/oilspill', express.static(path.join(__dirname, '../shared/tiles/oilspill')));

// Serve ship detection DZI tiles
app.use('/tiles/ship', express.static(path.join(__dirname, '../shared/tiles/ship')));
app.use('/outputs/oilspill',express.static(path.join(__dirname,'../shared/outputs/oilspill')))

// uploading images and gettiing list of images
app.use('/api/images', imageRoutes);
// DZI generation routes for uploaded images
app.use('/api/dzi', dziRoutes);
// Detection routes for ship and oil spill
app.use('/api/detect', detectionRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});