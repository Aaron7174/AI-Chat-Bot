const requirePermission = (...requiredPermissions) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];
  const hasEveryPermission = requiredPermissions.every((permission) => userPermissions.includes(permission));

  if (!hasEveryPermission) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action.',
    });
  }

  return next();
};

module.exports = { requirePermission };
