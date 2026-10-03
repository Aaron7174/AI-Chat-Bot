const mongoose = require('mongoose');

const connectToDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.warn('MONGODB_URI is not set. Falling back to the in-memory employee dataset.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    console.log('Connected to MongoDB successfully.');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed. Falling back to the in-memory employee dataset.', error.message);
    return false;
  }
};

module.exports = {
  connectToDatabase,
};
