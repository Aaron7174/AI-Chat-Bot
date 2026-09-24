const jwt = require('jsonwebtoken');
const { findUserById, toPublicUser } = require('../data/users');

const getJwtSecret = () => process.env.JWT_SECRET || 'development-only-companyai-secret';

const authenticate = (req, res, next) => {
  const authorization = req.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = findUserById(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    req.user = toPublicUser(user);
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
};

module.exports = { authenticate, getJwtSecret };
