const mongoose = require('mongoose');
const employees = require('../data/employees');
const Employee = require('../models/Employee');
const User = require('../models/User');

const normalize = (value) => String(value || '').trim().toLowerCase();

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const activeEmployees = () => employees.filter((employee) => !employee.isDeleted);

const mongoEmployeeLookup = (id) => {
  const identifier = String(id);
  return {
    $or: [
      { employeeId: identifier },
      ...(mongoose.Types.ObjectId.isValid(identifier) ? [{ _id: identifier }] : []),
    ],
  };
};

const normalizeMongoEmployee = (record = {}) => {
  const data = record.toObject ? record.toObject() : { ...record };
  const fallbackId = data.id ?? data.employeeId ?? (data._id ? String(data._id) : '');
  const rawId = fallbackId || (data._id ? String(data._id) : '');
  const id = rawId && Number.isInteger(Number(rawId)) ? Number(rawId) : rawId || undefined;

  return {
    ...data,
    id,
    name: data.name || data.fullName || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Unnamed Employee',
    employeeId: data.employeeId || String(rawId || ''),
    department: data.department || '',
    category: data.category || (data.department === 'IT' ? 'IT' : 'Non-IT'),
    role: data.role || data.designation || '',
    skills: Array.isArray(data.skills) ? data.skills : [],
    status: data.status || data.employmentStatus || 'ACTIVE',
    employmentStatus: data.employmentStatus || data.status || 'ACTIVE',
    salary: Number(data.salary) || 0,
  };
};

const isMongoEnabled = () => Boolean(process.env.MONGODB_URI) && mongoose.connection.readyState === 1;

const requirePersistentStorage = () => {
  if (!isMongoEnabled()) {
    const error = new Error('Employee changes require an active MongoDB connection.');
    error.code = 'PERSISTENCE_UNAVAILABLE';
    throw error;
  }
};

const matchesEmployeeQuery = (employee, { search, department, employeeType, status, skill } = {}) => {
  const searchable = [
    employee.id,
    employee.employeeId,
    employee.name,
    employee.firstName,
    employee.lastName,
    employee.email,
    employee.phone,
    employee.department,
    employee.role,
    employee.designation,
  ].filter(Boolean).join(' ').toLowerCase();

  return (!search || searchable.includes(normalize(search)))
    && (!department || normalize(employee.department) === normalize(department))
    && (!employeeType || normalize(employee.category) === normalize(employeeType) || normalize(employee.employeeType) === normalize(employeeType))
    && (!status || normalize(employee.status || 'ACTIVE') === normalize(status))
    && (!skill || (employee.skills || []).some((item) => normalize(item) === normalize(skill)));
};

const queryEmployees = async ({ page = 1, limit = 20, search, department, employeeType, category, status, skill } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(10000, Math.max(1, Number(limit) || 20));

  if (isMongoEnabled()) {
    const query = { isDeleted: { $ne: true } };
    const filters = [];

    if (search) {
      filters.push({
        $or: [
          { name: { $regex: escapeRegExp(search), $options: 'i' } },
          { employeeId: { $regex: escapeRegExp(search), $options: 'i' } },
          { email: { $regex: escapeRegExp(search), $options: 'i' } },
          { department: { $regex: escapeRegExp(search), $options: 'i' } },
          { role: { $regex: escapeRegExp(search), $options: 'i' } },
          { designation: { $regex: escapeRegExp(search), $options: 'i' } },
        ],
      });
    }

    if (department) {
      filters.push({ department: { $regex: `^${escapeRegExp(department)}$`, $options: 'i' } });
    }

    if (employeeType || category) {
      filters.push({ category: { $regex: `^${escapeRegExp(employeeType || category)}$`, $options: 'i' } });
    }

    if (status) {
      filters.push({
        $or: [
          { status: { $regex: `^${escapeRegExp(status)}$`, $options: 'i' } },
          { employmentStatus: { $regex: `^${escapeRegExp(status)}$`, $options: 'i' } },
        ],
      });
    }

    if (skill) {
      filters.push({ skills: { $in: [new RegExp(`^${escapeRegExp(skill)}$`, 'i')] } });
    }

    if (filters.length > 0) {
      query.$and = filters;
    }

    const total = await Employee.countDocuments(query);
    const start = (safePage - 1) * safeLimit;
    const employeesFromDb = await Employee.find(query).sort({ createdAt: -1 }).skip(start).limit(safeLimit);

    return {
      employees: employeesFromDb.map(normalizeMongoEmployee),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  const filtered = activeEmployees().filter((employee) => matchesEmployeeQuery(employee, {
    search,
    department,
    employeeType: employeeType || category,
    status,
    skill,
  }));
  const start = (safePage - 1) * safeLimit;

  return {
    employees: filtered.slice(start, start + safeLimit),
    total: filtered.length,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(filtered.length / safeLimit)),
  };
};

const findEmployee = async (id) => {
  if (isMongoEnabled()) {
    const employee = await Employee.findOne({
      isDeleted: { $ne: true },
      ...mongoEmployeeLookup(id),
    });
    return employee ? normalizeMongoEmployee(employee) : null;
  }

  return activeEmployees().find((employee) => String(employee.id) === String(id) && !employee.isDeleted) || null;
};

const validateEmployee = (input, { partial = false } = {}) => {
  const required = ['employeeId', 'name', 'email', 'department', 'category'];
  const errors = {};
  required.forEach((field) => {
    if (!partial && !String(input[field] || '').trim()) errors[field] = `${field} is required.`;
  });
  if (!partial && !String(input.designation || input.role || '').trim()) errors.designation = 'Designation is required.';
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = 'Email is invalid.';
  return errors;
};

const hasDuplicate = async (input, id) => {
  if (isMongoEnabled()) {
    const duplicateConditions = [];
    if (input.employeeId) duplicateConditions.push({ employeeId: { $regex: `^${escapeRegExp(input.employeeId)}$`, $options: 'i' } });
    if (input.email) duplicateConditions.push({ email: { $regex: `^${escapeRegExp(input.email)}$`, $options: 'i' } });
    if (!duplicateConditions.length) return false;

    const current = id ? await Employee.findOne(mongoEmployeeLookup(id)).select('_id') : null;

    return Boolean(await Employee.exists({
      ...(current ? { _id: { $ne: current._id } } : {}),
      $or: duplicateConditions,
    }));
  }

  const active = activeEmployees();
  return active.some((employee) => (
    String(employee.id) !== String(id)
    && (normalize(employee.employeeId) === normalize(input.employeeId)
      || normalize(employee.email) === normalize(input.email))
  ));
};

const createEmployee = async (input) => {
  requirePersistentStorage();
  const employeePayload = {
    employeeId: input.employeeId || `EMP-${Date.now()}`,
    name: input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim() || 'New Employee',
    fullName: input.fullName || input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim(),
    email: input.email,
    phone: input.phone || '',
    department: input.department,
    designation: input.designation || input.role || '',
    role: input.role || input.designation || '',
    location: input.location || '',
    joiningDate: input.joiningDate || new Date(),
    employmentStatus: input.employmentStatus || input.status || 'ACTIVE',
    status: input.status || input.employmentStatus || 'ACTIVE',
    category: input.category || (input.department === 'IT' ? 'IT' : 'Non-IT'),
    skills: Array.isArray(input.skills) ? input.skills : [],
    experience: input.experience || '',
    salary: Number(input.salary) || 0,
    manager: input.manager || '',
    projects: Array.isArray(input.projects) ? input.projects : [],
    photo: input.photo || '',
    attendance: input.attendance || { presentDays: 0, absentDays: 0, overtimeHours: 0 },
    leave: input.leave || { totalLeaves: 0, usedLeaves: 0, balance: 0 },
  };

  const employee = await Employee.create(employeePayload);
  return normalizeMongoEmployee(employee);
};

const updateEmployee = async (id, input) => {
  requirePersistentStorage();
  const employee = await Employee.findOne({ ...mongoEmployeeLookup(id), isDeleted: { $ne: true } });
  if (!employee) return null;

  const editableFields = [
    'employeeId',
    'name',
    'fullName',
    'email',
    'phone',
    'department',
    'designation',
    'role',
    'location',
    'joiningDate',
    'employmentStatus',
    'status',
    'category',
    'skills',
    'experience',
    'salary',
    'manager',
    'projects',
    'photo',
  ];
  const changes = Object.fromEntries(editableFields
    .filter((field) => Object.prototype.hasOwnProperty.call(input, field))
    .map((field) => [field, input[field]]));

  Object.assign(employee, {
    ...changes,
    name: input.name || employee.name,
    fullName: input.fullName || input.name || employee.fullName || employee.name,
    status: input.status || employee.status,
    employmentStatus: input.employmentStatus || input.status || employee.employmentStatus,
    updatedAt: new Date(),
  });

  await employee.save();
  return normalizeMongoEmployee(employee);
};

const softDeleteEmployee = async (id, deletedBy) => {
  requirePersistentStorage();
  const employee = await Employee.findOne({ ...mongoEmployeeLookup(id), isDeleted: { $ne: true } });
  if (!employee) return null;
  await User.updateOne({ employeeId: employee._id }, { $set: { isActive: false } });
  employee.isDeleted = true;
  employee.status = 'DELETED';
  employee.deletedBy = deletedBy;
  await employee.save();
  return normalizeMongoEmployee(employee);
};

const getAllEmployees = async () => {
  if (isMongoEnabled()) {
    const allEmployees = await Employee.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    return allEmployees.map(normalizeMongoEmployee);
  }
  return activeEmployees();
};

const getEmployeesByCategory = async (category) => {
  const normalizedCategory = String(category || '').trim().toLowerCase();

  if (isMongoEnabled()) {
    const results = await Employee.find({
      category: { $regex: `^${escapeRegExp(normalizedCategory === 'it' ? 'IT' : 'Non-IT')}$`, $options: 'i' },
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });
    return results.map(normalizeMongoEmployee);
  }

  if (normalizedCategory === 'it') {
    return activeEmployees().filter((employee) => employee.category === 'IT');
  }

  if (normalizedCategory === 'non-it' || normalizedCategory === 'non it' || normalizedCategory === 'nonit' || normalizedCategory === 'non_it') {
    return activeEmployees().filter((employee) => employee.category === 'Non-IT');
  }

  return [];
};

const getEmployeesByDepartment = async (departmentName) => {
  const department = String(departmentName || '').trim();

  if (!department) {
    return [];
  }

  if (isMongoEnabled()) {
    const results = await Employee.find({
      department: { $regex: `^${escapeRegExp(department)}$`, $options: 'i' },
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });
    return results.map(normalizeMongoEmployee);
  }

  return activeEmployees().filter(
    (employee) => employee.department.toLowerCase() === department.toLowerCase(),
  );
};

const getEmployeeById = async (id) => {
  if (isMongoEnabled()) {
    const employee = await Employee.findOne({
      isDeleted: { $ne: true },
      ...mongoEmployeeLookup(id),
    });
    return employee ? normalizeMongoEmployee(employee) : null;
  }

  const employeeId = Number(id);
  return activeEmployees().find((employee) => String(employee.id) === String(employeeId)) || null;
};

const searchEmployeesByName = async (name) => {
  const keyword = String(name || '').trim();

  if (!keyword) {
    return [];
  }

  if (isMongoEnabled()) {
    const results = await Employee.find({
      name: { $regex: escapeRegExp(keyword), $options: 'i' },
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });
    return results.map(normalizeMongoEmployee);
  }

  return activeEmployees().filter((employee) => employee.name.toLowerCase().includes(keyword.toLowerCase()));
};

const searchEmployees = async ({ skill, location, role, department, category } = {}) => {
  if (isMongoEnabled()) {
    const query = { isDeleted: { $ne: true } };

    if (skill) {
      query.skills = { $in: [new RegExp(`^${escapeRegExp(skill)}$`, 'i')] };
    }

    if (location) {
      query.location = { $regex: `^${escapeRegExp(location)}$`, $options: 'i' };
    }

    if (role) {
      query.role = { $regex: escapeRegExp(role), $options: 'i' };
    }

    if (department) {
      query.department = { $regex: `^${escapeRegExp(department)}$`, $options: 'i' };
    }

    if (category) {
      query.category = { $regex: `^${escapeRegExp(category)}$`, $options: 'i' };
    }

    const results = await Employee.find(query).sort({ createdAt: -1 });
    return results.map(normalizeMongoEmployee);
  }

  return activeEmployees().filter((employee) => {
    const matchesSkill = !skill || employee.skills.some((item) => item.toLowerCase() === skill.toLowerCase());
    const matchesLocation = !location || employee.location.toLowerCase() === location.toLowerCase();
    const matchesRole = !role || employee.role.toLowerCase().includes(role.toLowerCase());
    const matchesDepartment = !department || employee.department.toLowerCase() === department.toLowerCase();
    const matchesCategory = !category || employee.category.toLowerCase() === category.toLowerCase();
    return matchesSkill && matchesLocation && matchesRole && matchesDepartment && matchesCategory;
  });
};

const getDepartmentSummary = async (departmentName) => {
  const departmentEmployees = await getEmployeesByDepartment(departmentName);
  const averageSalary = departmentEmployees.length
    ? Math.round(departmentEmployees.reduce((total, employee) => total + Number(employee.salary || 0), 0) / departmentEmployees.length)
    : 0;

  return {
    department: departmentName,
    employees: departmentEmployees.length,
    averageSalary,
    locations: [...new Set(departmentEmployees.map((employee) => employee.location))],
    roles: [...new Set(departmentEmployees.map((employee) => employee.role))],
  };
};

const getDepartmentStats = async () => {
  if (isMongoEnabled()) {
    const departments = await Employee.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return departments.map((department) => ({
      department: department._id,
      count: department.count,
    }));
  }

  return [...new Set(activeEmployees().map((employee) => employee.department))]
    .map((department) => ({ department, count: activeEmployees().filter((employee) => employee.department === department).length }))
    .sort((first, second) => second.count - first.count);
};

module.exports = {
  getAllEmployees,
  getEmployeesByCategory,
  getEmployeesByDepartment,
  getEmployeeById,
  searchEmployeesByName,
  searchEmployees,
  getDepartmentSummary,
  getDepartmentStats,
  queryEmployees,
  findEmployee,
  validateEmployee,
  hasDuplicate,
  isMongoEnabled,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
};
