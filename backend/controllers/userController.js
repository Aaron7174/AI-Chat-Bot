const { toPublicUser } = require('../data/users');
const { createPersistedUser } = require('../services/userService');

const createUser = async (req, res, next) => {
  const { name, email, password, role, employeeId } = req.body || {};
  const normalizedRole = String(role || '').trim().toUpperCase();

  if (!['ADMIN', 'HR', 'EMPLOYEE'].includes(normalizedRole)) {
    return res.status(400).json({
      success: false,
      message: 'Role must be ADMIN, HR, or EMPLOYEE.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  if (typeof password !== 'string' || password.length < 12) {
    return res.status(400).json({ success: false, message: 'Password must be at least 12 characters long.' });
  }

  if (normalizedRole === 'EMPLOYEE' && !String(employeeId || '').trim()) {
    return res.status(400).json({ success: false, message: 'An employee record must be linked to an EMPLOYEE account.' });
  }

  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ success: false, message: 'Name is required and must be between 2 and 100 characters.' });
  }

  try {
    const user = await createPersistedUser({
      name,
      email,
      password,
      role: normalizedRole,
      employeeId,
    });

    return res.status(201).json({
      success: true,
      message: 'User account created successfully.',
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email or employee link already exists.' });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

module.exports = { createUser };
