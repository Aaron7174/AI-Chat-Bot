const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByLogin, toPublicUser } = require('../data/users');
const { getJwtSecret } = require('../middleware/authMiddleware');

const login = async (req, res) => {
  const { username, password } = req.body || {};
  const user = findUserByLogin(username);
  const validPassword = user && await bcrypt.compare(password || '', user.passwordHash);

  if (!user || !validPassword || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password.',
    });
  }

  const publicUser = toPublicUser(user);
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,  
      permissions: user.permissions,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );

  return res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: publicUser,
  });
};

module.exports = { login };