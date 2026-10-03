const express = require('express');
const {
  approveCorrection,
  getAttendanceAnalytics,
  getAttendanceIntegrity,
  getAttendancePolicy,
  getAttendanceReport,
  getCorrectionQueue,
  getEmployeeAttendanceHistory,
  getOwnAttendanceHistory,
  getRegister,
  getTodayAttendance,
  postCheckIn,
  postCheckOut,
  postCorrection,
  putAttendancePolicy,
  rejectCorrection,
} = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();
router.use(authenticate);

router.get('/today', requirePermission('VIEW_OWN_ATTENDANCE'), getTodayAttendance);
router.get('/me/history', requirePermission('VIEW_OWN_ATTENDANCE'), getOwnAttendanceHistory);
router.post('/check-in', requirePermission('VIEW_OWN_ATTENDANCE'), postCheckIn);
router.post('/check-out', requirePermission('VIEW_OWN_ATTENDANCE'), postCheckOut);
router.post('/correction', requirePermission('VIEW_OWN_ATTENDANCE'), postCorrection);

router.get('/', requirePermission('VIEW_ATTENDANCE'), getRegister);
router.get('/employee/:employeeId/history', requirePermission('VIEW_ATTENDANCE'), getEmployeeAttendanceHistory);
router.get('/corrections', requirePermission('REVIEW_ATTENDANCE_CORRECTIONS'), getCorrectionQueue);
router.put('/corrections/:id/approve', requirePermission('REVIEW_ATTENDANCE_CORRECTIONS'), approveCorrection);
router.put('/corrections/:id/reject', requirePermission('REVIEW_ATTENDANCE_CORRECTIONS'), rejectCorrection);
router.get('/analytics', requirePermission('VIEW_ATTENDANCE'), getAttendanceAnalytics);
router.get('/reports.csv', requirePermission('VIEW_ATTENDANCE'), getAttendanceReport);
router.get('/integrity', requirePermission('MANAGE_ATTENDANCE'), getAttendanceIntegrity);
router.get('/policy', requirePermission('VIEW_ATTENDANCE'), getAttendancePolicy);
router.put('/policy', requirePermission('MANAGE_ATTENDANCE_POLICY'), putAttendancePolicy);

module.exports = router;
