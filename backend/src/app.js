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

// Ensure database connection for serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  // Allow health check to respond immediately without waiting for DB
  if (req.path === '/health') return next();

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

// Configure CORS dynamically to support any origin with credentials
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
}));

// Enable pre-flight for all routes
app.options('*', cors());

// Helmet with relaxed cross-origin resource policy
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
}));

app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: Number(RATE_LIMIT_WINDOW_MS) || 900000,
  max: Number(RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/users', userRoutes);
app.use('/api/playlists', playlistRoutes);

app.use(errorHandler);

module.exports = app;
