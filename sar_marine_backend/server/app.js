require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
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
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const allowedOrigins = [
  'http://localhost:5173',
  'https://sar-monitor.vercel.app'
];
if (process.env.CORS_ORIGIN && !allowedOrigins.includes(process.env.CORS_ORIGIN)) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

app.use(cors({
  origin: allowedOrigins,
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

// ── Socket.IO — Real-time Collaborative Annotation ─────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Palette of distinct colors assigned to users in a room
const USER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  '#e11d48', '#0ea5e9', '#84cc16', '#d946ef', '#6366f1'
];

// In-memory room state: Map<roomId, { users: Map<socketId, {userName, color}>, annotations: [] }>
const rooms = new Map();

const collab = io.of('/collab');

collab.on('connection', (socket) => {
  console.log(`[collab] Connected: ${socket.id}`);

  socket.on('join-room', ({ roomId, imageId, userName }) => {
    if (!roomId || !userName) return;

    socket.join(roomId);
    socket.data = { roomId, imageId, userName };

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: new Map(), annotations: [], imageId });
    }

    const room = rooms.get(roomId);
    const colorIndex = room.users.size % USER_COLORS.length;
    const color = USER_COLORS[colorIndex];
    room.users.set(socket.id, { userName, color });

    // Send existing annotations to the newly joined user
    socket.emit('sync-annotations', room.annotations);

    // Broadcast updated user list to everyone in the room
    const userList = Array.from(room.users.values());
    collab.to(roomId).emit('room-users', userList);

    console.log(`[collab] ${userName} (${color}) joined room ${roomId} (${room.users.size} users)`);
  });

  socket.on('annotation-created', (annotation) => {
    const { roomId } = socket.data || {};
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const user = room.users.get(socket.id);
    if (!user) return;

    // Attach author metadata
    const attributed = {
      ...annotation,
      drawnBy: user.userName,
      drawnAt: new Date().toISOString(),
      color: user.color,
      socketId: socket.id
    };

    room.annotations.push(attributed);

    // Broadcast to everyone EXCEPT the sender
    socket.to(roomId).emit('remote-annotation-created', attributed);
  });

  socket.on('annotation-deleted', ({ annotationId }) => {
    const { roomId } = socket.data || {};
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    room.annotations = room.annotations.filter(a => a.id !== annotationId);

    socket.to(roomId).emit('remote-annotation-deleted', { annotationId });
  });

  socket.on('disconnect', () => {
    const { roomId, userName } = socket.data || {};
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    room.users.delete(socket.id);

    if (room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`[collab] Room ${roomId} destroyed (empty)`);
    } else {
      const userList = Array.from(room.users.values());
      collab.to(roomId).emit('room-users', userList);
    }

    console.log(`[collab] ${userName || socket.id} left room ${roomId}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`[collab] WebSocket ready on ws://localhost:${PORT}/collab`);
});