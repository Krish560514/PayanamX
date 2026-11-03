const mongoose = require('mongoose');

let mongoMemoryServer = null;

async function autoSeedIfEmpty() {
  try {
    const User = require('../models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database has no records. Seeding initial users, stations, and trains...');
      const { seedDB } = require('../../scripts/seed');
      await seedDB({ disconnect: false });
      const { main: seedSamples } = require('../../scripts/seedSampleTrains');
      await seedSamples();
      console.log('Initial database auto-seed finished successfully.');
    }
  } catch (err) {
    console.warn('Auto-seed notice:', err.message);
  }
}

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/train_booking';
  try {
    const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await autoSeedIfEmpty();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' || !process.env.MONGODB_URI) {
      console.warn(`Local MongoDB connection failed (${error.message}). Starting in-memory MongoDB server...`);
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create({ instance: { dbName: 'train_booking' } });
        const memoryUri = mongoMemoryServer.getUri();
        const conn = await mongoose.connect(memoryUri);
        console.log(`In-Memory MongoDB Connected at ${memoryUri}`);
        await autoSeedIfEmpty();
        return;
      } catch (memErr) {
        console.error(`In-Memory MongoDB failed to start: ${memErr.message}`);
      }
    }
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
