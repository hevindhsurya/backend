const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://hevindhsurya:hevindhsurya@auth-system.wgzahet.mongodb.net/Project?retryWrites=true&w=majority&appName=Auth-System");
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
