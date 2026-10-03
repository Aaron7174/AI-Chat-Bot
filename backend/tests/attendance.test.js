const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateCheckIn,
  calculateCheckOut,
  dateKeyWeekday,
  formatDateKey,
  formatMinutes,
  zonedDateTimeToUtc,
} = require('../services/attendanceCalculator');
const { getEligibleWorkingDates, calculateAttendancePercentage } = require('../services/attendanceStatistics');
const { DEFAULT_POLICY } = require('../services/attendanceService');
const { parseChatIntent } = require('../services/chatIntentService');
const { ROLE_PERMISSIONS, PERMISSIONS } = require('../config/permissions');
const Attendance = require('../models/Attendance');

const indiaPolicy = { ...DEFAULT_POLICY };

test('formats local dates correctly around India midnight boundaries', () => {
  assert.equal(formatDateKey(new Date('2026-10-03T18:00:00.000Z'), 'Asia/Kolkata'), '2026-10-03');
  assert.equal(formatDateKey(new Date('2026-10-03T18:45:00.000Z'), 'Asia/Kolkata'), '2026-10-04');
  assert.equal(zonedDateTimeToUtc('2026-10-03', '00:15', 'Asia/Kolkata').toISOString(), '2026-10-02T18:45:00.000Z');
});

test('calculates lateness relative to the configured schedule and threshold', () => {
  const result = calculateCheckIn(new Date('2026-10-03T03:42:00.000Z'), '2026-10-03', indiaPolicy);
  assert.equal(result.lateMinutes, 12);
  assert.equal(result.isLate, true);
  assert.equal(result.status, 'LATE');
});

test('calculates working time, overtime, early departure, and half days consistently', () => {
  const checkIn = new Date('2026-10-03T03:32:00.000Z');
  const fullDay = calculateCheckOut(checkIn, new Date('2026-10-03T12:45:00.000Z'), indiaPolicy);
  assert.equal(fullDay.workingMinutes, 493);
  assert.equal(fullDay.overtimeMinutes, 13);
  assert.equal(fullDay.isOvertime, true);

  const early = calculateCheckOut(
    new Date('2026-10-03T03:30:00.000Z'),
    new Date('2026-10-03T11:15:00.000Z'),
    indiaPolicy,
  );
  assert.equal(early.earlyCheckoutMinutes, 75);
  assert.equal(early.isEarlyCheckout, true);

  const halfDay = calculateCheckOut(
    new Date('2026-10-03T03:30:00.000Z'),
    new Date('2026-10-03T07:30:00.000Z'),
    indiaPolicy,
  );
  assert.equal(halfDay.workingMinutes, 180);
  assert.equal(halfDay.status, 'HALF_DAY');
  assert.equal(formatMinutes(493), '8h 13m');
});

test('uses configurable weekdays, holidays, and a transparent present-equivalent formula', () => {
  const monthPolicy = {
    ...indiaPolicy,
    workingDays: [1, 2, 3, 4, 5],
    holidays: [{ date: '2026-10-02', name: 'Holiday' }],
  };
  assert.equal(dateKeyWeekday('2026-10-03'), 6);
  const eligibleWorkingDates = getEligibleWorkingDates({
    month: '2026-10',
    policy: monthPolicy,
    employee: { joiningDate: new Date('2026-10-05T00:00:00.000Z') },
    now: new Date('2026-10-08T06:00:00.000Z'),
  });
  assert.deepEqual(eligibleWorkingDates, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']);
  const result = calculateAttendancePercentage({
    eligibleWorkingDates,
    records: [
      { date: '2026-10-05', status: 'PRESENT', checkIn: new Date() },
      { date: '2026-10-06', status: 'HALF_DAY' },
      { date: '2026-10-07', status: 'MISSING_ATTENDANCE' },
    ],
  });
  assert.equal(result.presentEquivalentDays, 1.5);
  assert.equal(result.workingDays, 4);
  assert.equal(result.attendancePercentage, 37.5);
});

test('recognizes attendance chatbot actions and keeps lookup queries read-only', () => {
  assert.equal(parseChatIntent('Check in now').intent, 'CHECK_IN');
  assert.equal(parseChatIntent('When did I check in?').intent, 'ATTENDANCE_TODAY');
  assert.equal(parseChatIntent('What is my attendance today?').intent, 'ATTENDANCE_TODAY');
  assert.equal(parseChatIntent('How many hours did I work today?').intent, 'WORKING_HOURS');
  assert.equal(parseChatIntent('Show IT department attendance', ['IT']).intent, 'DEPARTMENT_ATTENDANCE');
  assert.equal(parseChatIntent('Who has not checked in?').intent, 'ATTENDANCE_UNRESOLVED');
  assert.equal(parseChatIntent('I forgot to check out').intent, 'ATTENDANCE_CORRECTION');
  assert.equal(parseChatIntent('Who forgot to check out?').intent, 'MISSING_CHECKOUT');
});

test('keeps attendance route permissions separated by role', () => {
  assert.ok(ROLE_PERMISSIONS.EMPLOYEE.includes(PERMISSIONS.VIEW_OWN_ATTENDANCE));
  assert.ok(!ROLE_PERMISSIONS.EMPLOYEE.includes(PERMISSIONS.VIEW_ATTENDANCE));
  assert.ok(ROLE_PERMISSIONS.HR.includes(PERMISSIONS.REVIEW_ATTENDANCE_CORRECTIONS));
  assert.ok(!ROLE_PERMISSIONS.HR.includes(PERMISSIONS.MANAGE_ATTENDANCE_POLICY));
  assert.ok(ROLE_PERMISSIONS.ADMIN.includes(PERMISSIONS.MANAGE_ATTENDANCE_POLICY));
});

test('declares a database-level unique employee/date constraint', () => {
  const uniqueIndex = Attendance.schema.indexes().find(([fields, options]) => (
    fields.employeeId === 1 && fields.date === 1 && options.unique
  ));
  assert.ok(uniqueIndex);
});
