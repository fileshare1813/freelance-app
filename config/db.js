// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log('MongoDB Connected Successfully');
//   } catch (err) {
//     console.error('MongoDB connection error:', err.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These are the recommended options for production with Mongoose 9+
      serverSelectionTimeoutMS: 10000,  // Timeout after 10s instead of 30s
      socketTimeoutMS: 45000,           // Close sockets after 45s of inactivity
      maxPoolSize: 10,                  // Maintain up to 10 socket connections
      minPoolSize: 2,                   // Maintain minimum 2 connections
      connectTimeoutMS: 10000,          // Give up initial connection after 10s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected.');
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // Exit process with failure — Render will auto-restart
    process.exit(1);
  }
};

module.exports = connectDB;