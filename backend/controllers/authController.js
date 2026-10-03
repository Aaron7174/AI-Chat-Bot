const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByLogin } = require('../services/userService');
const { toPublicUser } = require('../data/users');
const { getJwtSecret } = require('../middleware/authMiddleware');

const login = async (req, res, next) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password.',
    });
  }

  try {
    const user = await findUserByLogin(username);
    const validPassword = user && await bcrypt.compare(password, user.passwordHash);

    if (!user || !validPassword || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const publicUser = toPublicUser(user);
    const token = jwt.sign(
      { userId: publicUser.id },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: publicUser,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { login };