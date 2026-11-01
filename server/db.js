// Connects Mongoose to MongoDB (local or Atlas) using MONGODB_URI from .env
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studybuddy';
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('MongoDB connected');
  return uri;
}

module.exports = connectDB;
