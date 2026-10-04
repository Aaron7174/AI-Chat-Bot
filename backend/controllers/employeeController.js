const {
  getAllEmployees,
  getEmployeesByCategory,
  getEmployeesByDepartment,
  getDepartmentStats,
  queryEmployees,
  findEmployee,
  validateEmployee,
  hasDuplicate,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
} = require('../services/employeeService');
const { recordAudit } = require('../data/auditLogs');
const { createEmployeePdf } = require('../services/pdfService');

const handleEmployeeMutationError = (res, error, action) => {
  if (error.code === 'PERSISTENCE_UNAVAILABLE') {
    return res.status(503).json({
      success: false,
      message: 'Employee changes cannot be saved because the database is unavailable. Reconnect MongoDB and try again.',
    });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'Employee ID or email already exists.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Employee data is invalid.',
      errors: Object.fromEntries(Object.entries(error.errors || {}).map(([field, detail]) => [field, detail.message])),
    });
  }

  console.error(`Employee ${action} failed.`, error);
  return res.status(500).json({ success: false, message: `Server error while ${action} the employee.` });
};

const filterEmployeeData = (employee, role) => {
  if (!employee || role === 'ADMIN') return employee;
  const { salary, ...permittedEmployeeData } = employee;
  return permittedEmployeeData;
};

const filterEmployeesData = (employees, role) => employees.map((employee) => filterEmployeeData(employee, role));

const normalizeDepartment = (department) => {
  if (!department) return '';
  return department.trim();
};

const getAllEmployeesController = async (req, res) => {
  try {
    const result = await queryEmployees(req.query);

    return res.json({
      success: true,
      count: result.total,
      ...result,
      employees: filterEmployeesData(result.employees, req.user.role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving employees.',
    });
  }
};

const createEmployeeController = async (req, res) => {
  try {
    const errors = validateEmployee(req.body || {});
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    if (await hasDuplicate(req.body)) return res.status(409).json({ success: false, message: 'Employee ID or email already exists.' });

    const employee = await createEmployee(req.body);
    recordAudit({ req, action: 'EMPLOYEE_CREATED', employee, description: 'Employee created' });
    return res.status(201).json({ success: true, employee, message: 'Employee created successfully.' });
  } catch (error) {
    return handleEmployeeMutationError(res, error, 'creating');
  }
};

const updateEmployeeController = async (req, res) => {
  try {
    const current = await findEmployee(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Employee not found.' });
    const errors = validateEmployee({ ...current, ...req.body }, { partial: true });
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    if (await hasDuplicate({ ...current, ...req.body }, req.params.id)) return res.status(409).json({ success: false, message: 'Employee ID or email already exists.' });

    const employee = await updateEmployee(req.params.id, req.body);
    recordAudit({ req, action: 'EMPLOYEE_UPDATED', employee, description: 'Employee updated' });
    return res.json({ success: true, employee, message: 'Employee updated successfully.' });
  } catch (error) {
    return handleEmployeeMutationError(res, error, 'updating');
  }
};

const deleteEmployeeController = async (req, res) => {
  try {
    const current = await findEmployee(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Employee not found.' });
    const employee = await softDeleteEmployee(req.params.id, req.user.id);
    recordAudit({ req, action: 'EMPLOYEE_DELETED', employee, description: 'Employee soft-deleted' });
    return res.json({ success: true, employee, message: 'Employee deleted successfully.' });
  } catch (error) {
    return handleEmployeeMutationError(res, error, 'deleting');
  }
};

const exportEmployeesPdfController = async (req, res) => {
  try {
    const result = await queryEmployees({ ...req.query, page: 1, limit: 100000 });
    recordAudit({ req, action: 'EMPLOYEE_PDF_EXPORTED', description: 'Employee PDF exported' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="company-ai-employees.pdf"');
    return createEmployeePdf({ employees: result.employees, generatedBy: req.user.name, department: req.query.department }).pipe(res);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error while exporting employee records.' });
  }
};

const getITEmployees = async (req, res) => {
  try {
    const itEmployees = await getEmployeesByCategory('it');

    res.json({
      success: true,
      count: itEmployees.length,
      employees: filterEmployeesData(itEmployees, req.user.role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving IT employees.',
    });
  }
};

const getNonITEmployees = async (req, res) => {
  try {
    const nonITEmployees = await getEmployeesByCategory('non-it');

    res.json({
      success: true,
      count: nonITEmployees.length,
      employees: filterEmployeesData(nonITEmployees, req.user.role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving non-IT employees.',
    });
  }
};

const getEmployeeByIdController = async (req, res) => {
  try {
    const employeeId = String(req.params.id || '').trim();
    if (!employeeId || employeeId.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID.',
      });
    }

    const employee = await findEmployee(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    return res.json({
      success: true,
      employee: filterEmployeeData(employee, req.user.role),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving employee details.',
    });
  }
};

const getEmployeesByDepartmentController = async (req, res) => {
  try {
    const department = normalizeDepartment(req.params.department);

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    const departmentEmployees = await getEmployeesByDepartment(department);

    if (departmentEmployees.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No employees found in the ${department} department.`,
      });
    }

    return res.json({
      success: true,
      department,
      count: departmentEmployees.length,
      employees: filterEmployeesData(departmentEmployees, req.user.role),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving department employees.',
    });
  }
};

const getDepartmentStatsController = async (req, res) => {
  try {
    const departments = (await getDepartmentStats())
      .filter((item) => item.department)
      .map((item) => ({ name: item.department, employeeCount: item.count }));

    return res.json({ success: true, departments });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving department summaries.',
    });
  }
};

module.exports = {
  getAllEmployees: getAllEmployeesController,
  getITEmployees,
  getNonITEmployees,
  getEmployeeById: getEmployeeByIdController,
  getEmployeesByDepartment: getEmployeesByDepartmentController,
  getDepartmentStats: getDepartmentStatsController,
  createEmployee: createEmployeeController,
  updateEmployee: updateEmployeeController,
  deleteEmployee: deleteEmployeeController,
  exportEmployeesPdf: exportEmployeesPdfController,
};
