require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || (process.env.VERCEL ? null : 'mongodb://127.0.0.1:27017/music-streaming'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 900000,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 500,
};
