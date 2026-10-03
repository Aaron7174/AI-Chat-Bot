require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { connectToDatabase } = require('../config/database');

const createInitialAdmin = async () => {
  const name = String(process.env.BOOTSTRAP_ADMIN_NAME || '').trim();
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw new Error('Set BOOTSTRAP_ADMIN_NAME, a valid BOOTSTRAP_ADMIN_EMAIL, and a password of at least 12 characters.');
  }

  if (!await connectToDatabase()) {
    throw new Error('MongoDB connection is required to create the initial administrator.');
  }

  if (await User.exists({ role: 'ADMIN' })) {
    throw new Error('An ADMIN account already exists; use the authenticated user-management API to add accounts.');
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'ADMIN',
  });

  console.log(`Initial administrator created: ${user.email}`);
};

createInitialAdmin()
  .catch((error) => {
    console.error(`Unable to create initial administrator: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
