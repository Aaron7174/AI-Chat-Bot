const bcrypt = require('bcryptjs');
const { ROLE_PERMISSIONS } = require('../config/permissions');

const developmentUsers = [
  {
    id: 'user-super-admin',
    name: 'CompanyAI Super Admin',
    email: 'superadmin@companyai.local',
    password: 'SuperAdmin123!',
    role: 'SUPER_ADMIN',
    department: 'Admin',
    employeeId: null,
  },
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
    id: 'user-manager',
    name: 'CompanyAI Manager',
    email: 'manager@companyai.local',
    password: 'Manager123!',
    role: 'MANAGER',
    department: 'IT',
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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: [...user.permissions],
    department: user.department,
    employeeId: user.employeeId,
  };
};

module.exports = { findUserByLogin, findUserById, toPublicUser };
