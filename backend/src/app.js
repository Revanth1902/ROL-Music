const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { CORS_ORIGIN, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const songRoutes = require('./routes/songRoutes');
const userRoutes = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const errorHandler = require('./middleware/errorHandler');
const { connectDB } = require('./config/db');

dotenv.config();

const app = express();

// ── 1. GLOBAL BULLETPROOF CORS (FIRST MIDDLEWARE) ──────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

  // Immediately respond to preflight OPTIONS requests without waiting for DB or routes
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Standard cors package configuration
app.use(cors({
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200,
}));

// Preflight handler for all routes
app.options('*', (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  return res.status(200).end();
});

// Relax helmet to prevent conflicts with CORS
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(express.json());
app.use(morgan('dev'));

// Rate limiting (skip OPTIONS and health check)
const limiter = rateLimit({
  windowMs: Number(RATE_LIMIT_WINDOW_MS) || 900000,
  max: Number(RATE_LIMIT_MAX) || 500,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ── 2. DATABASE CONNECTION MIDDLEWARE (AFTER CORS) ─────────────────
// Ensures database is connected before handling API requests
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS' || req.path === '/health') return next();

  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[Database Connection Error]:', err.message);
    return res.status(503).json({
      success: false,
      error: `Database connection failed: ${err.message}. Ensure MONGO_URI is set on Vercel and MongoDB Atlas has whitelisted IP 0.0.0.0/0.`,
    });
  }
});

// ── 3. ROUTES ──────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/users', userRoutes);
app.use('/api/playlists', playlistRoutes);

app.use(errorHandler);

module.exports = app;
