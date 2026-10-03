const express = require('express');
const {
  getAllEmployees,
  getITEmployees,
  getNonITEmployees,
  getEmployeeById,
  getEmployeesByDepartment,
  getDepartmentStats,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  exportEmployeesPdf,
} = require('../controllers/employeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate, requirePermission('VIEW_EMPLOYEES'));

router.get('/', getAllEmployees);
router.get('/export/pdf', requirePermission('ADMIN_EMPLOYEE_EXPORT_PDF'), exportEmployeesPdf);
router.post('/', requirePermission('ADMIN_EMPLOYEE_CREATE'), createEmployee);
router.put('/:id', requirePermission('ADMIN_EMPLOYEE_EDIT'), updateEmployee);
router.delete('/:id', requirePermission('ADMIN_EMPLOYEE_DELETE'), deleteEmployee);
router.get('/it', getITEmployees);
router.get('/non-it', getNonITEmployees);
router.get('/departments', getDepartmentStats);
router.get('/departments/:department', getEmployeesByDepartment);
router.get('/:id', getEmployeeById);

module.exports = router;
