const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const AttendancePolicy = require('../models/AttendancePolicy');
const Employee = require('../models/Employee');
const {
  calculateCheckIn,
  calculateCheckOut,
  dateKeyWeekday,
  formatDateKey,
  isValidDateKey,
  scheduleForDate,
  zonedDateTimeToUtc,
} = require('./attendanceCalculator');
const { calculateAttendancePercentage, getEligibleWorkingDates } = require('./attendanceStatistics');

const DEFAULT_POLICY = Object.freeze({
  key: 'company',
  timezone: 'Asia/Kolkata',
  workingDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
  breakDurationMinutes: 60,
  lateThresholdMinutes: 10,
  halfDayThresholdMinutes: 240,
  overtimeThresholdMinutes: 0,
  allowSelfServiceWfh: false,
  holidays: [],
});

const createError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const isDatabaseReady = () => mongoose.connection.readyState === 1;
const ensureDatabase = () => {
  if (!isDatabaseReady()) {
    throw createError(503, 'Attendance requires an active MongoDB connection. No attendance was recorded.');
  }
};

const getPolicy = async () => {
  ensureDatabase();
  const saved = await AttendancePolicy.findOne({ key: 'company' }).lean();
  return saved ? { ...DEFAULT_POLICY, ...saved } : { ...DEFAULT_POLICY };
};

const validatePolicyUpdate = (input) => {
  const errors = [];
  const timezone = String(input.timezone || DEFAULT_POLICY.timezone);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    errors.push('Timezone must be a valid IANA timezone.');
  }

  const startTime = input.startTime || DEFAULT_POLICY.startTime;
  const endTime = input.endTime || DEFAULT_POLICY.endTime;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    errors.push('Working start and end times must use HH:mm.');
  } else if (startTime >= endTime) {
    errors.push('Working end time must be later than the start time on the same day.');
  }

  if (input.workingDays !== undefined
    && (!Array.isArray(input.workingDays)
      || input.workingDays.length === 0
      || input.workingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
      || new Set(input.workingDays).size !== input.workingDays.length)) {
    errors.push('Working days must be a non-empty list of unique weekdays from 0 to 6.');
  }
  if (input.allowSelfServiceWfh !== undefined && typeof input.allowSelfServiceWfh !== 'boolean') {
    errors.push('allowSelfServiceWfh must be true or false.');
  }

  for (const field of ['breakDurationMinutes', 'lateThresholdMinutes', 'halfDayThresholdMinutes', 'overtimeThresholdMinutes']) {
    if (input[field] !== undefined && (!Number.isInteger(input[field]) || input[field] < 0 || input[field] > 1440)) {
      errors.push(`${field} must be a whole number from 0 to 1440.`);
    }
  }

  if (input.holidays !== undefined
    && (!Array.isArray(input.holidays)
      || input.holidays.length > 200
      || input.holidays.some((holiday) => !holiday || !isValidDateKey(holiday.date)
        || typeof holiday.name !== 'string' || !holiday.name.trim())
      || new Set(input.holidays.map((holiday) => holiday.date)).size !== input.holidays.length)) {
    errors.push('Each holiday must include a valid YYYY-MM-DD date and a name.');
  }

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) && /^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
    const startMinutes = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3));
    const endMinutes = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3));
    if (Number.isInteger(input.breakDurationMinutes) && input.breakDurationMinutes >= endMinutes - startMinutes) {
      errors.push('Break duration must be shorter than the scheduled work span.');
    }
  }

  return errors;
};

const updatePolicy = async (input) => {
  ensureDatabase();
  const currentPolicy = await getPolicy();
  const errors = validatePolicyUpdate({ ...currentPolicy, ...input });
  if (errors.length) throw createError(400, errors.join(' '));
  const allowedFields = [
    'timezone',
    'workingDays',
    'startTime',
    'endTime',
    'breakDurationMinutes',
    'lateThresholdMinutes',
    'halfDayThresholdMinutes',
    'overtimeThresholdMinutes',
    'allowSelfServiceWfh',
    'holidays',
  ];
  const update = {};
  allowedFields.forEach((field) => {
    if (input[field] !== undefined) update[field] = input[field];
  });
  const policy = await AttendancePolicy.findOneAndUpdate(
    { key: 'company' },
    { $set: update, $setOnInsert: { key: 'company' } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  return { ...DEFAULT_POLICY, ...policy };
};

const findActiveEmployee = async (employeeId) => {
  ensureDatabase();
  if (!mongoose.isValidObjectId(employeeId)) return null;
  const employee = await Employee.findOne({
    _id: employeeId,
    isDeleted: { $ne: true },
    $and: [
      { $or: [{ status: 'ACTIVE' }, { status: null }] },
      { $or: [{ employmentStatus: 'ACTIVE' }, { employmentStatus: null }] },
    ],
  }).lean();
  return employee || null;
};

const findOwnEmployee = async (user) => {
  if (!user.employeeRecordId) {
    throw createError(403, 'Your account is not linked to an employee record. Contact HR to link your account.');
  }
  const employee = await findActiveEmployee(user.employeeRecordId);
  if (!employee) {
    throw createError(403, 'Attendance actions are unavailable because this employee is inactive or unlinked.');
  }
  return employee;
};

const isWorkingDate = (date, policy) => policy.workingDays.includes(dateKeyWeekday(date));
const holidayForDate = (date, policy) => policy.holidays.find((holiday) => holiday.date === date);

const formatEmployee = (employee) => ({
  id: String(employee._id),
  employeeId: employee.employeeId || String(employee._id),
  name: employee.name || employee.fullName || 'Unnamed employee',
  department: employee.department || '',
  designation: employee.designation || employee.role || '',
  email: employee.email || '',
  status: employee.status || employee.employmentStatus || 'ACTIVE',
});

const decorateAttendance = (record, employee) => ({
  ...(record ? record.toObject ? record.toObject() : record : {}),
  employee: formatEmployee(employee),
});

const getToday = async (user) => {
  const policy = await getPolicy();
  const employee = await findOwnEmployee(user);
  const date = formatDateKey(new Date(), policy.timezone);
  const attendanceRecord = await Attendance.findOne({ employeeId: employee._id, date }).lean();
  const now = new Date();
  const scheduledEnd = scheduleForDate(date, policy).end;
  let attendance = attendanceRecord;
  if (attendanceRecord && attendanceRecord.correctionStatus !== 'PENDING' && !attendanceRecord.checkOut && attendanceRecord.checkIn) {
    const liveCalculations = calculateCheckOut(attendanceRecord.checkIn, now, policy);
    attendance = {
      ...attendanceRecord,
      ...(now < scheduledEnd ? { workingMinutes: liveCalculations.workingMinutes } : {}),
      ...(now > scheduledEnd
        ? { status: 'MISSED_CHECKOUT', overtimeMinutes: liveCalculations.overtimeMinutes }
        : {}),
    };
  }
  return {
    date,
    policy: {
      timezone: policy.timezone,
      startTime: policy.startTime,
      endTime: policy.endTime,
      allowSelfServiceWfh: policy.allowSelfServiceWfh,
    },
    employee: formatEmployee(employee),
    attendance,
  };
};

const checkIn = async ({ user, source = 'WEB', ipAddress, workMode = 'ONSITE' }) => {
  ensureDatabase();
  const [policy, employee] = await Promise.all([getPolicy(), findOwnEmployee(user)]);
  const timestamp = new Date();
  const date = formatDateKey(timestamp, policy.timezone);
  if (!isWorkingDate(date, policy) || holidayForDate(date, policy)) {
    throw createError(409, 'Attendance check-in is unavailable on a non-working day or company holiday.');
  }
  if (workMode === 'WFH' && !policy.allowSelfServiceWfh) {
    throw createError(403, 'Work from home attendance requires company approval.');
  }
  if (!['ONSITE', 'WFH'].includes(workMode)) throw createError(400, 'Work mode must be ONSITE or WFH.');

  const calculations = calculateCheckIn(timestamp, date, policy);
  if (workMode === 'WFH' && !calculations.isLate) calculations.status = 'WORK_FROM_HOME';
  const record = new Attendance({
    employeeId: employee._id,
    userId: user.id,
    date,
    ...calculations,
    checkIn: timestamp,
    checkInSource: source,
    workMode,
    auditEvents: [{
      action: 'CHECK_IN',
      actorId: user.id,
      actorName: user.name,
      timestamp,
      newValue: { checkIn: timestamp, status: calculations.status, workMode },
      source,
      ipAddress,
    }],
  });
  try {
    await record.save();
  } catch (error) {
    if (error.code === 11000) throw createError(409, 'Attendance has already been recorded for today.');
    throw error;
  }
  return decorateAttendance(record, employee);
};

const checkOut = async ({ user, source = 'WEB', ipAddress }) => {
  ensureDatabase();
  const [policy, employee] = await Promise.all([getPolicy(), findOwnEmployee(user)]);
  const timestamp = new Date();
  const date = formatDateKey(timestamp, policy.timezone);
  const existing = await Attendance.findOne({ employeeId: employee._id, date });
  if (!existing || !existing.checkIn) {
    throw createError(409, 'Check-in record not found. Please contact HR if you believe this is incorrect.');
  }
  if (existing.checkOut) throw createError(409, 'You have already checked out today.');
  const calculations = calculateCheckOut(existing.checkIn, timestamp, policy);
  const updated = await Attendance.findOneAndUpdate(
    { _id: existing._id, checkOut: { $exists: false }, correctionStatus: { $ne: 'PENDING' } },
    {
      $set: {
        checkOut: timestamp,
        checkOutSource: source,
        ...calculations,
        status: calculations.status || existing.status,
      },
      $push: {
        auditEvents: {
          action: 'CHECK_OUT',
          actorId: user.id,
          actorName: user.name,
          timestamp,
          oldValue: { checkOut: existing.checkOut || null },
          newValue: { checkOut: timestamp, ...calculations },
          source,
          ipAddress,
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw createError(409, 'You have already checked out today or have a pending correction.');
  return decorateAttendance(updated, employee);
};

const parseCorrectionDateTime = (value, date, timeZone) => {
  if (typeof value !== 'string' || !value) return undefined;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match || match[1] !== date) throw createError(400, 'Correction times must be on the requested attendance date and use local YYYY-MM-DDTHH:mm format.');
  return zonedDateTimeToUtc(date, `${match[2]}:${match[3]}`, timeZone);
};

const requestCorrection = async ({ user, date, requestedCheckIn, requestedCheckOut, reason, ipAddress }) => {
  ensureDatabase();
  const policy = await getPolicy();
  const employee = await findOwnEmployee(user);
  if (!isValidDateKey(date)) throw createError(400, 'A valid attendance date is required.');
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) {
    throw createError(400, 'Please provide a correction reason between 5 and 500 characters.');
  }
  const requestedIn = parseCorrectionDateTime(requestedCheckIn, date, policy.timezone);
  const requestedOut = parseCorrectionDateTime(requestedCheckOut, date, policy.timezone);
  if (!requestedIn && !requestedOut) throw createError(400, 'Provide a requested check-in or check-out time.');
  if ((requestedIn && requestedIn > new Date()) || (requestedOut && requestedOut > new Date())) {
    throw createError(400, 'Correction times cannot be in the future.');
  }
  if (requestedIn && requestedOut && requestedOut <= requestedIn) {
    throw createError(400, 'Requested checkout must be later than requested check-in.');
  }

  const existing = await Attendance.findOne({ employeeId: employee._id, date });
  if (existing?.correctionStatus === 'PENDING') throw createError(409, 'A correction request is already pending for this date.');
  const auditEvent = {
    action: 'CORRECTION_REQUEST',
    actorId: user.id,
    actorName: user.name,
    timestamp: new Date(),
    oldValue: existing ? { checkIn: existing.checkIn, checkOut: existing.checkOut } : null,
    newValue: { requestedCheckIn: requestedIn, requestedCheckOut: requestedOut },
    reason: reason.trim(),
    source: 'WEB',
    ipAddress,
  };

  if (!existing) {
    const record = new Attendance({
      employeeId: employee._id,
      userId: user.id,
      date,
      status: 'CORRECTION_PENDING',
      scheduledStartTime: policy.startTime,
      scheduledEndTime: policy.endTime,
      correctionRequested: true,
      correctionStatus: 'PENDING',
      correctionReason: reason.trim(),
      correctionPreviousStatus: existing.status,
      requestedCheckIn: requestedIn,
      requestedCheckOut: requestedOut,
      correctionRequestedBy: user.id,
      auditEvents: [auditEvent],
    });
    try {
      await record.save();
    } catch (error) {
      if (error.code === 11000) throw createError(409, 'Attendance was updated while you submitted the correction. Refresh and try again.');
      throw error;
    }
    return decorateAttendance(record, employee);
  }

  const updated = await Attendance.findOneAndUpdate(
    { _id: existing._id, correctionStatus: { $ne: 'PENDING' } },
    {
      $set: {
        status: 'CORRECTION_PENDING',
        correctionRequested: true,
        correctionStatus: 'PENDING',
        correctionReason: reason.trim(),
        correctionPreviousStatus: existing.status,
        requestedCheckIn: requestedIn,
        requestedCheckOut: requestedOut,
        correctionRequestedBy: user.id,
      },
      $push: { auditEvents: auditEvent },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw createError(409, 'A correction request was submitted at the same time. Refresh the page.');
  return decorateAttendance(updated, employee);
};

const listCorrections = async ({ status = 'PENDING', page = 1, limit = 20 } = {}) => {
  ensureDatabase();
  if (!['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(status)) {
    throw createError(400, 'Correction status must be PENDING, APPROVED, REJECTED, or ALL.');
  }
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const query = status === 'ALL' ? { correctionRequested: true } : { correctionStatus: status };
  const [records, total] = await Promise.all([
    Attendance.find(query)
      .sort({ date: -1, updatedAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .populate('employeeId', 'employeeId name fullName department designation email')
      .lean(),
    Attendance.countDocuments(query),
  ]);
  return {
    records: records.map((record) => ({ ...record, employee: record.employeeId ? formatEmployee(record.employeeId) : null })),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

const reviewCorrection = async ({ user, attendanceId, decision, reason, ipAddress }) => {
  ensureDatabase();
  if (!mongoose.isValidObjectId(attendanceId)) throw createError(400, 'Invalid attendance record ID.');
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw createError(400, 'Correction decision must be APPROVED or REJECTED.');
  if (decision === 'REJECTED' && (!reason || String(reason).trim().length < 5)) {
    throw createError(400, 'Please provide a reason of at least 5 characters when rejecting a correction.');
  }
  const current = await Attendance.findOne({ _id: attendanceId, correctionStatus: 'PENDING' });
  if (!current) throw createError(404, 'Pending attendance correction was not found.');
  const employee = await Employee.findById(current.employeeId).lean();
  if (!employee) throw createError(409, 'The linked employee record is no longer available.');
  const policy = await getPolicy();
  const reviewedAt = new Date();
  let setValues = {
    correctionStatus: decision,
    correctionRequested: false,
    status: decision === 'APPROVED'
      ? 'CORRECTION_APPROVED'
      : current.checkIn
        ? current.correctionPreviousStatus || current.status
        : 'CORRECTION_REJECTED',
    reviewedBy: user.id,
    reviewedAt,
    ...(decision === 'APPROVED' ? { approvedBy: user.id, approvedAt: reviewedAt } : {}),
  };

  if (decision === 'APPROVED') {
    const checkInValue = current.requestedCheckIn || current.checkIn;
    const checkOutValue = current.requestedCheckOut || current.checkOut;
    if (!checkInValue) throw createError(400, 'A correction must include a check-in time before it can be approved.');
    const checkInCalculations = calculateCheckIn(checkInValue, current.date, policy);
    const checkoutCalculations = checkOutValue
      ? calculateCheckOut(checkInValue, checkOutValue, policy)
      : {};
    setValues = {
      ...setValues,
      checkIn: checkInValue,
      checkOut: checkOutValue,
      ...checkInCalculations,
      ...checkoutCalculations,
      status: checkoutCalculations.status || checkInCalculations.status,
      checkInSource: 'HR',
      ...(checkOutValue ? { checkOutSource: 'HR' } : {}),
    };
  }

  const updated = await Attendance.findOneAndUpdate(
    { _id: current._id, correctionStatus: 'PENDING' },
    {
      $set: setValues,
      $unset: { requestedCheckIn: 1, requestedCheckOut: 1, correctionPreviousStatus: 1 },
      $push: {
        auditEvents: {
          action: decision === 'APPROVED' ? 'CORRECTION_APPROVED' : 'CORRECTION_REJECTED',
          actorId: user.id,
          actorName: user.name,
          timestamp: reviewedAt,
          oldValue: { checkIn: current.checkIn, checkOut: current.checkOut, status: current.status },
          newValue: decision === 'APPROVED'
            ? { checkIn: setValues.checkIn, checkOut: setValues.checkOut, status: setValues.status }
            : { correctionStatus: decision },
          reason: decision === 'REJECTED' ? String(reason).trim() : current.correctionReason,
          source: user.role === 'ADMIN' ? 'ADMIN' : 'HR',
          ipAddress,
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw createError(409, 'This correction was reviewed by someone else. Refresh the list.');
  return decorateAttendance(updated, employee);
};

const buildRegister = async ({ date, search, department, status, page = 1, limit = 20, maximumLimit = 100 }) => {
  ensureDatabase();
  const policy = await getPolicy();
  const selectedDate = date || formatDateKey(new Date(), policy.timezone);
  if (!isValidDateKey(selectedDate)) throw createError(400, 'Date must use YYYY-MM-DD format.');
  if (search !== undefined && String(search).length > 100) throw createError(400, 'Employee search is limited to 100 characters.');
  if (department !== undefined && String(department).length > 100) throw createError(400, 'Department filter is limited to 100 characters.');
  const validStatuses = new Set([
    'PRESENT',
    'ABSENT',
    'LATE',
    'HALF_DAY',
    'ON_LEAVE',
    'HOLIDAY',
    'WEEK_OFF',
    'WORK_FROM_HOME',
    'COMP_OFF',
    'MISSED_CHECKOUT',
    'CORRECTION_PENDING',
    'CORRECTION_APPROVED',
    'CORRECTION_REJECTED',
    'MISSING_ATTENDANCE',
  ]);
  if (status && !validStatuses.has(status)) throw createError(400, 'Invalid attendance status filter.');
  const employeeFilters = [
    { isDeleted: { $ne: true } },
    { $or: [{ status: 'ACTIVE' }, { status: null }] },
    { $or: [{ employmentStatus: 'ACTIVE' }, { employmentStatus: null }] },
  ];
  if (department) employeeFilters.push({ department: { $regex: `^${String(department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
  if (search) {
    const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    employeeFilters.push({ $or: [
      { name: { $regex: safeSearch, $options: 'i' } },
      { employeeId: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ] });
  }
  const employeeQuery = { $and: employeeFilters };
  const [employees, attendanceRecords] = await Promise.all([
    Employee.find(employeeQuery).sort({ name: 1 }).lean(),
    Attendance.find({ date: selectedDate }).lean(),
  ]);
  const recordByEmployee = new Map(attendanceRecords.map((record) => [String(record.employeeId), record]));
  const holiday = holidayForDate(selectedDate, policy);
  const selectedDateEnd = scheduleForDate(selectedDate, policy).end;
  const hasMissedCheckout = new Date() > selectedDateEnd;
  const defaultStatus = holiday ? 'HOLIDAY' : !isWorkingDate(selectedDate, policy) ? 'WEEK_OFF' : 'MISSING_ATTENDANCE';
  let records = employees.map((employee) => {
    const storedAttendance = recordByEmployee.get(String(employee._id));
    const attendance = storedAttendance && storedAttendance.correctionStatus !== 'PENDING'
      && storedAttendance.checkIn && !storedAttendance.checkOut
      && hasMissedCheckout
      ? { ...storedAttendance, status: 'MISSED_CHECKOUT' }
      : storedAttendance;
    return {
      ...(attendance || {
        date: selectedDate,
        status: defaultStatus,
        workingMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        earlyCheckoutMinutes: 0,
        checkIn: null,
        checkOut: null,
      }),
      employee: formatEmployee(employee),
      derived: !attendance,
      holidayName: holiday?.name || null,
    };
  });
  const counts = records.reduce((total, record) => {
    total[record.status] = (total[record.status] || 0) + 1;
    return total;
  }, { totalEmployees: records.length });
  if (status) records = records.filter((record) => record.status === status);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(maximumLimit, Math.max(1, Number(limit) || 20));
  const total = records.length;
  records = records.slice((safePage - 1) * safeLimit, safePage * safeLimit);
  return {
    date: selectedDate,
    policy: { timezone: policy.timezone, startTime: policy.startTime, endTime: policy.endTime },
    counts,
    records,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

const getEmployeeHistory = async ({ employeeId, month, page = 1, limit = 30 }) => {
  ensureDatabase();
  const policy = await getPolicy();
  if (!mongoose.isValidObjectId(employeeId)) throw createError(400, 'Invalid employee ID.');
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) throw createError(404, 'Employee was not found.');
  const safeMonth = month || formatDateKey(new Date(), policy.timezone).slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(safeMonth)) throw createError(400, 'Month must use YYYY-MM format.');
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
  const startDate = `${safeMonth}-01`;
  const nextMonth = new Date(Date.UTC(Number(safeMonth.slice(0, 4)), Number(safeMonth.slice(5, 7)), 1));
  const endDate = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const query = { employeeId: employee._id, date: { $gte: startDate, $lt: endDate } };
  const [records, total, monthRecords] = await Promise.all([
    Attendance.find(query).sort({ date: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Attendance.countDocuments(query),
    Attendance.find(query).select('date status checkIn').lean(),
  ]);
  const eligibleWorkingDates = getEligibleWorkingDates({ month: safeMonth, policy, employee });
  const statistics = calculateAttendancePercentage({ records: monthRecords, eligibleWorkingDates });
  return {
    employee: formatEmployee(employee),
    month: safeMonth,
    ...statistics,
    records,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
};

const getOwnHistory = async (options) => {
  const employee = await findOwnEmployee(options.user);
  return getEmployeeHistory({ ...options, employeeId: String(employee._id) });
};

const getCompanyMonth = async (monthOffset = 0) => {
  const policy = await getPolicy();
  const currentMonth = formatDateKey(new Date(), policy.timezone).slice(0, 7);
  const date = new Date(Date.UTC(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)) - 1 + monthOffset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const getAnalytics = async ({ date }) => {
  const register = await buildRegister({ date, page: 1, limit: 100 });
  return { date: register.date, counts: register.counts, totalEmployees: register.counts.totalEmployees };
};

const exportRegisterCsv = async (filters) => {
  const register = await buildRegister({ ...filters, page: 1, limit: 5000, maximumLimit: 5000 });
  const allRecords = register.records;
  if (register.total > allRecords.length) {
    throw createError(413, 'This report exceeds 5,000 rows. Apply a department or employee filter and export again.');
  }
  const formatReportTime = (timestamp) => timestamp
    ? new Intl.DateTimeFormat('en-CA', {
      timeZone: register.policy.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(timestamp))
    : '';
  const columns = [
    ['Employee ID', (row) => row.employee.employeeId],
    ['Employee', (row) => row.employee.name],
    ['Department', (row) => row.employee.department],
    ['Date', (row) => row.date],
    ['Check In', (row) => formatReportTime(row.checkIn)],
    ['Check Out', (row) => formatReportTime(row.checkOut)],
    ['Working Minutes', (row) => row.status === 'MISSED_CHECKOUT' ? '' : row.workingMinutes],
    ['Late Minutes', (row) => row.lateMinutes],
    ['Overtime Minutes', (row) => row.overtimeMinutes],
    ['Status', (row) => row.status],
  ];
  const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    columns.map(([heading]) => escapeCsv(heading)).join(','),
    ...allRecords.map((record) => columns.map(([, value]) => escapeCsv(value(record))).join(',')),
  ].join('\r\n');
};

const runIntegrityCheck = async () => {
  ensureDatabase();
  const policy = await getPolicy();
  const total = await Attendance.countDocuments();
  const findings = [];
  const validStatuses = new Set([
    'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF',
    'WORK_FROM_HOME', 'COMP_OFF', 'MISSED_CHECKOUT', 'CORRECTION_PENDING',
    'CORRECTION_APPROVED', 'CORRECTION_REJECTED',
  ]);
  const addFinding = (recordId, issue) => {
    if (findings.length < 100) findings.push({ recordId: String(recordId), issue });
  };
  const cursor = Attendance.find()
    .select('_id employeeId userId date checkIn checkOut workingMinutes overtimeMinutes status')
    .populate('employeeId', '_id userId')
    .lean()
    .cursor();
  let checked = 0;
  for await (const record of cursor) {
    checked += 1;
    if (!record.employeeId) addFinding(record._id, 'ORPHANED_EMPLOYEE');
    if (!validStatuses.has(record.status)) addFinding(record._id, 'INVALID_STATUS');
    if (!isValidDateKey(record.date)) addFinding(record._id, 'INVALID_DATE');
    if (record.employeeId?.userId && record.userId && String(record.employeeId.userId) !== String(record.userId)) {
      addFinding(record._id, 'EMPLOYEE_USER_MISMATCH');
    }
    if (record.checkIn && record.checkOut && record.checkOut < record.checkIn) addFinding(record._id, 'CHECKOUT_BEFORE_CHECKIN');
    if (record.workingMinutes < 0 || record.overtimeMinutes < 0) addFinding(record._id, 'NEGATIVE_TIME');
    if (record.overtimeMinutes > record.workingMinutes) addFinding(record._id, 'IMPOSSIBLE_OVERTIME');
    if (policy.holidays.some((holiday) => holiday.date === record.date) && !['HOLIDAY', 'WEEK_OFF'].includes(record.status)) {
      addFinding(record._id, 'HOLIDAY_ATTENDANCE_CONFLICT');
    }
  }
  const duplicates = await Attendance.aggregate([
    { $group: { _id: { employeeId: '$employeeId', date: '$date' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 100 },
  ]);
  duplicates.forEach((group) => group.ids.forEach((id) => findings.push({ recordId: String(id), issue: 'DUPLICATE_EMPLOYEE_DATE' })));
  return { status: findings.length ? 'ISSUES_FOUND' : 'HEALTHY', recordsChecked: checked, totalRecords: total, issues: findings.slice(0, 100) };
};

module.exports = {
  DEFAULT_POLICY,
  buildRegister,
  checkIn,
  checkOut,
  exportRegisterCsv,
  getAnalytics,
  getEmployeeHistory,
  getOwnHistory,
  getCompanyMonth,
  getPolicy,
  getToday,
  listCorrections,
  requestCorrection,
  reviewCorrection,
  runIntegrityCheck,
  updatePolicy,
};
