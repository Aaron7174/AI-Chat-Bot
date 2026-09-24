const employees = require('../data/employees');

const normalize = (value) => String(value || '').trim().toLowerCase();

const activeEmployees = () => employees.filter((employee) => !employee.isDeleted);

const matchesEmployeeQuery = (employee, { search, department, employeeType, status } = {}) => {
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
    && (!status || normalize(employee.status || 'ACTIVE') === normalize(status));
};

const queryEmployees = ({ page = 1, limit = 20, search, department, employeeType, category, status } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(10000, Math.max(1, Number(limit) || 20));
  const filtered = activeEmployees().filter((employee) => matchesEmployeeQuery(employee, {
    search,
    department,
    employeeType: employeeType || category,
    status,
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

const findEmployee = (id) => employees.find((employee) => String(employee.id) === String(id) && !employee.isDeleted);

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

const hasDuplicate = (input, id) => activeEmployees().some((employee) => (
  String(employee.id) !== String(id)
  && (normalize(employee.employeeId) === normalize(input.employeeId)
    || normalize(employee.email) === normalize(input.email))
));

const createEmployee = (input) => {
  const nextId = Math.max(...employees.map((employee) => Number(employee.id) || 0), 0) + 1;
  const employee = {
    ...input,
    id: nextId,
    name: input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim(),
    skills: Array.isArray(input.skills) ? input.skills : [],
    status: input.status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  employees.push(employee);
  return employee;
};

const updateEmployee = (id, input) => {
  const employee = findEmployee(id);
  if (!employee) return null;
  Object.assign(employee, input, { updatedAt: new Date().toISOString() });
  if (!employee.name && (employee.firstName || employee.lastName)) employee.name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  return employee;
};

const softDeleteEmployee = (id, deletedBy) => {
  const employee = findEmployee(id);
  if (!employee) return null;
  Object.assign(employee, { isDeleted: true, status: 'DELETED', deletedAt: new Date().toISOString(), deletedBy });
  return employee;
};

const getAllEmployees = () => activeEmployees();

const getEmployeesByCategory = (category) => {
  const normalizedCategory = String(category || '').trim().toLowerCase();

  if (normalizedCategory === 'it') {
    return activeEmployees().filter((employee) => employee.category === 'IT');
  }

  if (normalizedCategory === 'non-it' || normalizedCategory === 'non it' || normalizedCategory === 'nonit' || normalizedCategory === 'non_it') {
    return activeEmployees().filter((employee) => employee.category === 'Non-IT');
  }

  return [];
};

const getEmployeesByDepartment = (departmentName) => {
  const department = String(departmentName || '').trim();

  if (!department) {
    return [];
  }

  return activeEmployees().filter(
    (employee) => employee.department.toLowerCase() === department.toLowerCase(),
  );
};

const getEmployeeById = (id) => {
  const employeeId = Number(id);
  return findEmployee(employeeId);
};

const searchEmployeesByName = (name) => {
  const keyword = String(name || '').trim();

  if (!keyword) {
    return [];
  }

  return activeEmployees().filter((employee) => {
    return employee.name.toLowerCase().includes(keyword.toLowerCase());
  });
};

const searchEmployees = ({ skill, location, role, department, category } = {}) => {
  return activeEmployees().filter((employee) => {
    const matchesSkill = !skill || employee.skills.some((item) => item.toLowerCase() === skill.toLowerCase());
    const matchesLocation = !location || employee.location.toLowerCase() === location.toLowerCase();
    const matchesRole = !role || employee.role.toLowerCase().includes(role.toLowerCase());
    const matchesDepartment = !department || employee.department.toLowerCase() === department.toLowerCase();
    const matchesCategory = !category || employee.category.toLowerCase() === category.toLowerCase();
    return matchesSkill && matchesLocation && matchesRole && matchesDepartment && matchesCategory;
  });
};

const getDepartmentSummary = (departmentName) => {
  const departmentEmployees = getEmployeesByDepartment(departmentName);
  const averageSalary = departmentEmployees.length
    ? Math.round(departmentEmployees.reduce((total, employee) => total + employee.salary, 0) / departmentEmployees.length)
    : 0;

  return {
    department: departmentName,
    employees: departmentEmployees.length,
    averageSalary,
    locations: [...new Set(departmentEmployees.map((employee) => employee.location))],
    roles: [...new Set(departmentEmployees.map((employee) => employee.role))],
  };
};

const getDepartmentStats = () => {
  return [...new Set(activeEmployees().map((employee) => employee.department))]
    .map((department) => ({ department, count: getEmployeesByDepartment(department).length }))
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
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
};
