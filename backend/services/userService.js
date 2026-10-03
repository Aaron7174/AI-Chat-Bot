const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { findUserById: findDevelopmentUserById, findUserByLogin: findDevelopmentUserByLogin } = require('../data/users');

const isMongoEnabled = () => mongoose.connection.readyState === 1;

const findUserByLogin = async (login) => {
  if (!isMongoEnabled()) {
    return findDevelopmentUserByLogin(login);
  }

  const email = String(login || '').trim().toLowerCase();
  if (!email) return null;

  return User.findOne({ email })
    .select('+passwordHash')
    .populate('employeeId', 'employeeId department name email');
};

const findUserById = async (id) => {
  if (!isMongoEnabled()) {
    return findDevelopmentUserById(id);
  }

  if (!mongoose.isValidObjectId(id)) return null;

  return User.findById(id).populate('employeeId', 'employeeId department name email');
};

const findEmployeeForLink = async (employeeId) => {
  const value = String(employeeId || '').trim();
  if (!value) return null;

  const alternatives = [{ employeeId: value }];
  if (mongoose.isValidObjectId(value)) {
    alternatives.push({ _id: new mongoose.Types.ObjectId(value) });
  }

  return Employee.findOne({
    isDeleted: { $ne: true },
    $or: alternatives,
  });
};

const createPersistedUser = async ({ name, email, password, role, employeeId }) => {
  if (!isMongoEnabled()) {
    const error = new Error('MongoDB must be connected to create persistent user accounts.');
    error.statusCode = 503;
    throw error;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const employee = employeeId ? await findEmployeeForLink(employeeId) : null;

  if (employeeId && !employee) {
    const error = new Error('The employee record could not be found.');
    error.statusCode = 404;
    throw error;
  }

  if (employee && String(employee.email || '').toLowerCase() !== normalizedEmail) {
    const error = new Error('The account email must match the linked employee record.');
    error.statusCode = 400;
    throw error;
  }

  if (employee?.userId) {
    const error = new Error('This employee record is already linked to a user account.');
    error.statusCode = 409;
    throw error;
  }

  const user = new User({
    name: String(name || employee?.name || '').trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    employeeId: employee?._id,
  });

  await user.save();

  if (employee) {
    try {
      const result = await Employee.updateOne(
        {
          _id: employee._id,
          isDeleted: { $ne: true },
          $or: [{ userId: { $exists: false } }, { userId: null }],
        },
        { $set: { userId: user._id } },
      );

      if (result.modifiedCount !== 1) {
        const error = new Error('This employee record was linked to another account.');
        error.statusCode = 409;
        throw error;
      }
    } catch (error) {
      await User.deleteOne({ _id: user._id });
      throw error;
    }
  }

  return user.populate('employeeId', 'employeeId department name email');
};

module.exports = {
  createPersistedUser,
  findUserById,
  findUserByLogin,
  isMongoEnabled,
};
