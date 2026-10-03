const jwt = require('jsonwebtoken');
const { findUserById } = require('../services/userService');
const { toPublicUser } = require('../data/users');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured before starting the API.');
  }

  return process.env.JWT_SECRET;
};

const authenticate = async (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  try {
    const user = await findUserById(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    req.user = toPublicUser(user);
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { authenticate, getJwtSecret };
