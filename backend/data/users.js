const bcrypt = require('bcryptjs');
const { ROLE_PERMISSIONS } = require('../config/permissions');

// Development-only identities; replace with persisted users before production deployment.
const developmentUsers = [
  {
    id: 'user-admin',
    name: 'CompanyAI Admin',
    email: 'admin@companyai.local',
    password: 'Admin123!',
    role: 'ADMIN',
    department: 'Admin',
    employeeId: null,
  },
  {
    id: 'user-hr',
    name: 'CompanyAI HR',
    email: 'hr@companyai.local',
    password: 'Hr123!',
    role: 'HR',
    department: 'HR',
    employeeId: null,
  },
  {
    id: 'user-employee',
    name: 'CompanyAI Employee',
    email: 'employee@companyai.local',
    password: 'Employee123!',
    role: 'EMPLOYEE',
    department: 'IT',
    employeeId: null,
  },
].map((user) => ({
  ...user,
  passwordHash: bcrypt.hashSync(user.password, 10),
  permissions: [...ROLE_PERMISSIONS[user.role]],
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const findUserByLogin = (login) => {
  const normalizedLogin = String(login || '').trim().toLowerCase();
  return developmentUsers.find(
    (user) => user.email.toLowerCase() === normalizedLogin || user.email.split('@')[0] === normalizedLogin,
  );
};

const findUserById = (id) => developmentUsers.find((user) => user.id === id);

const toPublicUser = (user) => {
  if (!user) return null;
  const employee = user.employeeId && typeof user.employeeId === 'object' ? user.employeeId : null;
  const id = user._id ? String(user._id) : user.id;

  return {
    id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: [...(ROLE_PERMISSIONS[user.role] || [])],
    department: employee?.department || user.department || null,
    employeeId: employee?.employeeId || (user.employeeId && !employee ? String(user.employeeId) : null),
    employeeRecordId: employee?._id ? String(employee._id) : null,
  };
};

module.exports = { findUserByLogin, findUserById, toPublicUser };
