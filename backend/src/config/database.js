const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    logger.error('MONGODB_URI is not set in .env!');
    logger.error('Please set MONGODB_URI=mongodb://localhost:27017/medcds in backend/.env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', err => {
      logger.error(`MongoDB error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Retrying...');
    });

  } catch (error) {
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('❌ MongoDB connection FAILED');
    logger.error(`   URI: ${uri}`);
    logger.error(`   Error: ${error.message}`);
    logger.error('');
    logger.error('Fix options:');
    logger.error('  1. Local MongoDB: sudo systemctl start mongod');
    logger.error('  2. OR use MongoDB Atlas free tier: https://www.mongodb.com/cloud/atlas');
    logger.error('     Then set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/medcds');
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(1);
  }
};

module.exports = connectDB;
