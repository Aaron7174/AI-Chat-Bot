const {
  getAllEmployees,
  getEmployeesByCategory,
  getEmployeesByDepartment,
  getEmployeeById,
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

const normalizeDepartment = (department) => {
  if (!department) return '';
  return department.trim();
};

const getAllEmployeesController = (req, res) => {
  try {
    const result = queryEmployees(req.query);

    return res.json({
      success: true,
      count: result.total,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving employees.',
    });
  }
};

const createEmployeeController = (req, res) => {
  const errors = validateEmployee(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Validation failed.', errors });
  if (hasDuplicate(req.body)) return res.status(409).json({ success: false, message: 'Employee ID or email already exists.' });

  const employee = createEmployee(req.body);
  recordAudit({ req, action: 'EMPLOYEE_CREATED', employee, description: 'Employee created' });
  return res.status(201).json({ success: true, employee, message: 'Employee created successfully.' });
};

const updateEmployeeController = (req, res) => {
  const current = findEmployee(req.params.id);
  if (!current) return res.status(404).json({ success: false, message: 'Employee not found.' });
  const errors = validateEmployee({ ...current, ...req.body }, { partial: true });
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Validation failed.', errors });
  if (hasDuplicate({ ...current, ...req.body }, req.params.id)) return res.status(409).json({ success: false, message: 'Employee ID or email already exists.' });

  const employee = updateEmployee(req.params.id, req.body);
  recordAudit({ req, action: 'EMPLOYEE_UPDATED', employee, description: 'Employee updated' });
  return res.json({ success: true, employee, message: 'Employee updated successfully.' });
};

const deleteEmployeeController = (req, res) => {
  const current = findEmployee(req.params.id);
  if (!current) return res.status(404).json({ success: false, message: 'Employee not found.' });
  const employee = softDeleteEmployee(req.params.id, req.user.id);
  recordAudit({ req, action: 'EMPLOYEE_DELETED', employee, description: 'Employee soft-deleted' });
  return res.json({ success: true, employee, message: 'Employee deleted successfully.' });
};

const exportEmployeesPdfController = (req, res) => {
  const result = queryEmployees({ ...req.query, page: 1, limit: 100000 });
  recordAudit({ req, action: 'EMPLOYEE_PDF_EXPORTED', description: 'Employee PDF exported' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="company-ai-employees.pdf"');
  return createEmployeePdf({ employees: result.employees, generatedBy: req.user.name, department: req.query.department }).pipe(res);
};

const getITEmployees = (req, res) => {
  try {
    const itEmployees = getEmployeesByCategory('it');

    res.json({
      success: true,
      count: itEmployees.length,
      employees: itEmployees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving IT employees.',
    });
  }
};

const getNonITEmployees = (req, res) => {
  try {
    const nonITEmployees = getEmployeesByCategory('non-it');

    res.json({
      success: true,
      count: nonITEmployees.length,
      employees: nonITEmployees,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving non-IT employees.',
    });
  }
};

const getEmployeeByIdController = (req, res) => {
  try {
    const employeeId = Number(req.params.id);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID. Please provide a valid positive number.',
      });
    }

    const employee = getEmployeeById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    return res.json({
      success: true,
      employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving employee details.',
    });
  }
};

const getEmployeesByDepartmentController = (req, res) => {
  try {
    const department = normalizeDepartment(req.params.department);

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    const departmentEmployees = getEmployeesByDepartment(department);

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
      employees: departmentEmployees,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving department employees.',
    });
  }
};

module.exports = {
  getAllEmployees: getAllEmployeesController,
  getITEmployees,
  getNonITEmployees,
  getEmployeeById: getEmployeeByIdController,
  getEmployeesByDepartment: getEmployeesByDepartmentController,
  createEmployee: createEmployeeController,
  updateEmployee: updateEmployeeController,
  deleteEmployee: deleteEmployeeController,
  exportEmployeesPdf: exportEmployeesPdfController,
};
