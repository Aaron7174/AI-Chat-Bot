export const hasPermission = (user, permission) => Boolean(user?.permissions?.includes(permission));

export const hasRole = (user, ...roles) => Boolean(user?.role && roles.includes(user.role));
