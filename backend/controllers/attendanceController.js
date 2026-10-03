const {
  buildRegister,
  checkIn,
  checkOut,
  exportRegisterCsv,
  getAnalytics,
  getEmployeeHistory,
  getOwnHistory,
  getPolicy,
  getToday,
  listCorrections,
  requestCorrection,
  reviewCorrection,
  runIntegrityCheck,
  updatePolicy,
} = require('../services/attendanceService');

const sendError = (res, error, fallback) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
};

const getRegister = async (req, res) => {
  try {
    const result = await buildRegister({
      date: req.query.date,
      search: req.query.search,
      department: req.query.department,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error, 'Unable to load the attendance register.');
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    return res.json({ success: true, ...(await getToday(req.user)) });
  } catch (error) {
    return sendError(res, error, 'Unable to load today’s attendance.');
  }
};

const postCheckIn = async (req, res) => {
  try {
    const attendance = await checkIn({
      user: req.user,
      workMode: req.body?.workMode || 'ONSITE',
      ipAddress: req.ip,
    });
    return res.status(201).json({ success: true, message: 'Check-in successful.', attendance });
  } catch (error) {
    return sendError(res, error, 'Unable to record check-in.');
  }
};

const postCheckOut = async (req, res) => {
  try {
    const attendance = await checkOut({ user: req.user, ipAddress: req.ip });
    return res.json({ success: true, message: 'Check-out successful.', attendance });
  } catch (error) {
    return sendError(res, error, 'Unable to record check-out.');
  }
};

const postCorrection = async (req, res) => {
  try {
    const attendance = await requestCorrection({
      user: req.user,
      date: req.body?.date,
      requestedCheckIn: req.body?.requestedCheckIn,
      requestedCheckOut: req.body?.requestedCheckOut,
      reason: req.body?.reason,
      ipAddress: req.ip,
    });
    return res.status(201).json({ success: true, message: 'Attendance correction request submitted for HR review.', attendance });
  } catch (error) {
    return sendError(res, error, 'Unable to submit the attendance correction request.');
  }
};

const getOwnAttendanceHistory = async (req, res) => {
  try {
    const result = await getOwnHistory({
      user: req.user,
      month: req.query.month,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error, 'Unable to load your attendance history.');
  }
};

const getEmployeeAttendanceHistory = async (req, res) => {
  try {
    const result = await getEmployeeHistory({
      employeeId: req.params.employeeId,
      month: req.query.month,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error, 'Unable to load employee attendance history.');
  }
};

const getCorrectionQueue = async (req, res) => {
  try {
    const result = await listCorrections({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error, 'Unable to load attendance correction requests.');
  }
};

const approveCorrection = (decision) => async (req, res) => {
  try {
    const attendance = await reviewCorrection({
      user: req.user,
      attendanceId: req.params.id,
      decision,
      reason: req.body?.reason,
      ipAddress: req.ip,
    });
    return res.json({
      success: true,
      message: decision === 'APPROVED' ? 'Attendance correction approved.' : 'Attendance correction rejected.',
      attendance,
    });
  } catch (error) {
    return sendError(res, error, 'Unable to review the attendance correction.');
  }
};

const getAttendanceAnalytics = async (req, res) => {
  try {
    return res.json({ success: true, ...(await getAnalytics({ date: req.query.date })) });
  } catch (error) {
    return sendError(res, error, 'Unable to calculate attendance analytics.');
  }
};

const getAttendancePolicy = async (req, res) => {
  try {
    const policy = await getPolicy();
    return res.json({ success: true, policy });
  } catch (error) {
    return sendError(res, error, 'Unable to load attendance policy.');
  }
};

const putAttendancePolicy = async (req, res) => {
  try {
    const policy = await updatePolicy(req.body || {});
    return res.json({ success: true, message: 'Attendance policy updated.', policy });
  } catch (error) {
    return sendError(res, error, 'Unable to update attendance policy.');
  }
};

const getAttendanceIntegrity = async (req, res) => {
  try {
    return res.json({ success: true, ...(await runIntegrityCheck()) });
  } catch (error) {
    return sendError(res, error, 'Unable to run attendance data integrity checks.');
  }
};

const getAttendanceReport = async (req, res) => {
  try {
    const csv = await exportRegisterCsv({
      date: req.query.date,
      search: req.query.search,
      department: req.query.department,
      status: req.query.status,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-register.csv"');
    return res.send(csv);
  } catch (error) {
    return sendError(res, error, 'Unable to generate the attendance report.');
  }
};

module.exports = {
  approveCorrection: approveCorrection('APPROVED'),
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
  rejectCorrection: approveCorrection('REJECTED'),
};
