const {
  findEmployee,
  queryEmployees,
  getDepartmentStats,
} = require('../services/employeeService');
const { parseChatIntent } = require('../services/chatIntentService');
const {
  buildRegister,
  checkIn,
  checkOut,
  getOwnHistory,
  getToday,
} = require('../services/attendanceService');

const suggestionsByRole = {
  ADMIN: [
    'Show all employees',
    'Show IT employees',
    'Find employees with React skills',
    'How many employees are in HR?',
  ],
  HR: [
    'Show all employees',
    'Show Non-IT employees',
    'Find an employee by name',
    'How many employees are in IT?',
    'Who has not checked in today?',
    'Show HR department attendance',
  ],
  EMPLOYEE: ['Show my profile', 'What is my attendance today?', 'How many hours did I work today?', 'What is my attendance percentage?', 'Check in now'],
};

const toChatEmployee = (employee) => ({
  id: employee.id,
  employeeId: employee.employeeId,
  name: employee.name,
  department: employee.department,
  category: employee.category || employee.employeeType,
  role: employee.designation || employee.role,
  location: employee.location,
  email: employee.email,
  status: employee.status || employee.employmentStatus || 'ACTIVE',
  joiningDate: employee.joiningDate,
  skills: Array.isArray(employee.skills) ? employee.skills : [],
});

const parseLimit = (value) => {
  const requested = Number(value);
  return Number.isInteger(requested) ? Math.min(10, Math.max(1, requested)) : 5;
};

const formatAttendanceTime = (value, timeZone) => value
  ? new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : 'not recorded';

const handleChatRequest = async (req, res) => {
  try {
    const message = req.body && req.body.message ? req.body.message : '';

    if (typeof message !== 'string' || !message.trim() || message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a message between 1 and 500 characters.',
      });
    }

    if (req.body?.confirmAction) {
      if (!req.user.permissions.includes('VIEW_OWN_ATTENDANCE')) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage your attendance.' });
      }
      const action = String(req.body.confirmAction).toUpperCase();
      if (!['CHECK_IN', 'CHECK_OUT'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Unsupported attendance action.' });
      }
      const attendance = action === 'CHECK_IN'
        ? await checkIn({ user: req.user, source: 'CHATBOT', ipAddress: req.ip })
        : await checkOut({ user: req.user, source: 'CHATBOT', ipAddress: req.ip });
      return res.json({
        success: true,
        reply: action === 'CHECK_IN'
          ? `Check-in recorded for ${attendance.employee.name}.`
          : `Check-out recorded for ${attendance.employee.name}.`,
        attendanceSummary: {
          status: attendance.status,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          workingMinutes: attendance.workingMinutes,
          lateMinutes: attendance.lateMinutes,
          overtimeMinutes: attendance.overtimeMinutes,
        },
        suggestions: suggestionsByRole[req.user.role] || [],
        intent: action,
      });
    }

    const suggestions = suggestionsByRole[req.user.role] || [];
    const departments = (await getDepartmentStats()).map((item) => item.department).filter(Boolean);
    const parsedIntent = parseChatIntent(message, departments);
    const attendanceIntents = [
      'CHECK_IN',
      'CHECK_OUT',
      'ATTENDANCE_CORRECTION',
      'ATTENDANCE_TODAY',
      'ATTENDANCE_HISTORY',
      'ATTENDANCE_PERCENTAGE',
      'WORKING_HOURS',
      'LATE_STATUS',
      'OVERTIME',
      'DEPARTMENT_ATTENDANCE',
      'MISSING_CHECKOUT',
      'ATTENDANCE_UNRESOLVED',
    ];
    if (attendanceIntents.includes(parsedIntent.intent)) {
      if (['CHECK_IN', 'CHECK_OUT'].includes(parsedIntent.intent)) {
        if (!req.user.permissions.includes('VIEW_OWN_ATTENDANCE')) {
          return res.status(403).json({ success: false, message: 'You do not have permission to manage your attendance.' });
        }
        return res.json({
          success: true,
          reply: `Please confirm that you want to ${parsedIntent.intent === 'CHECK_IN' ? 'check in' : 'check out'} now. The server will record the time when you confirm.`,
          attendanceAction: parsedIntent.intent,
          suggestions,
          intent: parsedIntent.intent,
        });
      }

      if (parsedIntent.intent === 'ATTENDANCE_CORRECTION') {
        if (!req.user.permissions.includes('VIEW_OWN_ATTENDANCE')) {
          return res.status(403).json({ success: false, message: 'You can only request corrections for your own attendance.' });
        }
        return res.json({
          success: true,
          reply: 'I will not invent or directly edit a timestamp. Open Attendance to submit the date, requested check-in/check-out time, and reason for HR review.',
          attendanceUrl: '/attendance',
          suggestions,
          intent: parsedIntent.intent,
        });
      }

      if (['DEPARTMENT_ATTENDANCE', 'MISSING_CHECKOUT', 'ATTENDANCE_UNRESOLVED'].includes(parsedIntent.intent)) {
        if (!req.user.permissions.includes('VIEW_ATTENDANCE')) {
          return res.status(403).json({ success: false, message: 'You can only access your own attendance information.' });
        }
        const register = await buildRegister({
          department: parsedIntent.query.department,
          status: parsedIntent.intent === 'MISSING_CHECKOUT'
            ? 'MISSED_CHECKOUT'
            : parsedIntent.intent === 'ATTENDANCE_UNRESOLVED'
              ? 'MISSING_ATTENDANCE'
              : undefined,
          page: 1,
          limit: 10,
        });
        const relevantRecords = parsedIntent.intent === 'DEPARTMENT_ATTENDANCE'
          ? register.records
          : register.records.filter((record) => record.status === (parsedIntent.intent === 'MISSING_CHECKOUT' ? 'MISSED_CHECKOUT' : 'MISSING_ATTENDANCE'));
        const stats = Object.entries(register.counts)
          .filter(([label]) => label !== 'totalEmployees')
          .map(([label, value]) => ({ label: label.replaceAll('_', ' '), value }));
        const description = parsedIntent.intent === 'MISSING_CHECKOUT'
          ? `${register.counts.MISSED_CHECKOUT || 0} employees with a recorded missed checkout.`
          : parsedIntent.intent === 'ATTENDANCE_UNRESOLVED'
            ? `${register.counts.MISSING_ATTENDANCE || 0} active employees have unresolved attendance. These are not automatically marked absent.`
            : `Attendance summary for ${parsedIntent.query.department}: ${register.counts.totalEmployees} active employees.`;
        return res.json({
          success: true,
          reply: description,
          employees: relevantRecords.slice(0, 5).map((record) => ({
            id: record.employee.id,
            employeeId: record.employee.employeeId,
            name: record.employee.name,
            department: record.employee.department,
            status: record.status,
          })),
          stats,
          attendanceUrl: '/attendance',
          suggestions,
          intent: parsedIntent.intent,
        });
      }

      const requestsOwnAttendance = req.user.role === 'EMPLOYEE' || /\b(my|mine|me|i|am i)\b/i.test(message);
      const canReadOwnAttendance = req.user.permissions.includes('VIEW_OWN_ATTENDANCE')
        && Boolean(req.user.employeeRecordId)
        && requestsOwnAttendance;
      if (!canReadOwnAttendance) {
        if (requestsOwnAttendance) {
          return res.status(403).json({
            success: false,
            message: 'Personal attendance is available only to an employee account linked to an employee record.',
          });
        }
        if (req.user.permissions.includes('VIEW_ATTENDANCE')) {
          const register = await buildRegister({
            department: parsedIntent.query.department,
            page: 1,
            limit: 20,
          });
          return res.json({
            success: true,
            reply: `For ${register.date}, there are ${register.counts.totalEmployees} active employees. ${register.counts.PRESENT || 0} are present, ${register.counts.LATE || 0} are late, ${register.counts.WORK_FROM_HOME || 0} are working from home, and ${register.counts.MISSING_ATTENDANCE || 0} have unresolved attendance.`,
            stats: Object.entries(register.counts).map(([label, value]) => ({ label: label.replaceAll('_', ' '), value })),
            attendanceUrl: '/attendance',
            suggestions,
            intent: parsedIntent.intent,
          });
        }
        return res.status(403).json({ success: false, message: 'You can only access your own attendance information.' });
      }

      if (parsedIntent.intent === 'ATTENDANCE_HISTORY' || parsedIntent.intent === 'ATTENDANCE_PERCENTAGE') {
        const month = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
        }).format(new Date());
        const history = await getOwnHistory({ user: req.user, month, limit: 100 });
        return res.json({
          success: true,
          reply: parsedIntent.intent === 'ATTENDANCE_PERCENTAGE'
            ? `Your attendance for ${history.month} is ${history.attendancePercentage}% (${history.presentEquivalentDays} present-equivalent days out of ${history.workingDays} eligible working days).`
            : `You have ${history.total} attendance records for ${history.month}.`,
          stats: [
            { label: 'Attendance', value: `${history.attendancePercentage}%` },
            { label: 'Present-equivalent days', value: history.presentEquivalentDays },
            { label: 'Working days', value: history.workingDays },
          ],
          attendanceUrl: '/attendance',
          suggestions,
          intent: parsedIntent.intent,
        });
      }

      const todayAttendance = await getToday(req.user);
      const attendance = todayAttendance.attendance;
      const timeZone = todayAttendance.policy.timezone;
      const reply = parsedIntent.intent === 'WORKING_HOURS'
        ? `You have worked ${Math.floor((attendance?.workingMinutes || 0) / 60)} hours and ${(attendance?.workingMinutes || 0) % 60} minutes today.`
        : parsedIntent.intent === 'LATE_STATUS'
          ? attendance?.isLate
            ? `You checked in ${attendance.lateMinutes} minutes after the scheduled start time.`
            : 'You were not recorded as late today.'
          : parsedIntent.intent === 'OVERTIME'
            ? `Recorded overtime today: ${attendance?.overtimeMinutes || 0} minutes.`
            : attendance
              ? `Your attendance today is ${attendance.status.replaceAll('_', ' ')}. Check-in: ${formatAttendanceTime(attendance.checkIn, timeZone)}; check-out: ${formatAttendanceTime(attendance.checkOut, timeZone)}.`
              : 'No attendance record exists for today yet.';
      return res.json({
        success: true,
        reply,
        attendanceUrl: '/attendance',
        stats: attendance ? [
          { label: 'Status', value: attendance.status.replaceAll('_', ' ') },
          { label: 'Worked', value: `${Math.floor((attendance.workingMinutes || 0) / 60)}h ${(attendance.workingMinutes || 0) % 60}m` },
          { label: 'Late minutes', value: attendance.lateMinutes || 0 },
          { label: 'Overtime minutes', value: attendance.overtimeMinutes || 0 },
        ] : [],
        suggestions,
        intent: parsedIntent.intent,
      });
    }

    const supportedDirectoryIntents = [
      'OWN_PROFILE',
      'COUNT_EMPLOYEES',
      'SEARCH_SKILL',
      'SEARCH_CATEGORY',
      'SEARCH_DEPARTMENT',
      'SEARCH_EMPLOYEES',
      'EMPLOYEE_PROFILE',
      'LIST_EMPLOYEES',
    ];

    if (!supportedDirectoryIntents.includes(parsedIntent.intent)) {
      return res.json({
        success: true,
        reply: "I can help search employee profiles, list teams, and count employees. Try “Find Alex”, “Show IT employees”, or “How many employees are in HR?”.",
        type: 'text',
        employees: [],
        suggestions,
        intent: parsedIntent.intent,
      });
    }

    if (req.user.role === 'EMPLOYEE') {
      if (parsedIntent.intent !== 'OWN_PROFILE') {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own employee profile.',
        });
      }

      if (!req.user.employeeRecordId) {
        return res.status(403).json({
          success: false,
          message: 'Your account is not linked to an employee profile yet. Contact HR to link your account.',
        });
      }

      const employee = await findEmployee(req.user.employeeRecordId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Your linked employee profile could not be found. Contact HR for assistance.',
        });
      }

      return res.json({
        success: true,
        reply: 'Here is your employee profile.',
        type: 'employee_profile',
        employees: [toChatEmployee(employee)],
        suggestions,
        intent: parsedIntent.intent,
      });
    }

    const isCount = parsedIntent.intent === 'COUNT_EMPLOYEES';
    const category = parsedIntent.query.category;
    const department = parsedIntent.query.department;
    const search = parsedIntent.query.search;
    const skill = parsedIntent.query.skill;

    const result = await queryEmployees({
      page: 1,
      limit: isCount ? 1 : parseLimit(req.body.limit),
      search,
      department,
      employeeType: category,
      skill,
    });
    const scopeName = department || category || (skill ? `${skill} skills` : search || 'matching filter');
    const reply = isCount
      ? department
        ? `There ${result.total === 1 ? 'is' : 'are'} ${result.total} ${result.total === 1 ? 'employee' : 'employees'} in ${department}.`
        : category
          ? `There ${result.total === 1 ? 'is' : 'are'} ${result.total} ${category} ${result.total === 1 ? 'employee' : 'employees'}.`
          : `There ${result.total} employees in total.`
      : result.total
        ? `I found ${result.total} ${result.total === 1 ? 'employee' : 'employees'}${scopeName ? ` for ${scopeName}` : ''}. Showing ${result.employees.length}.`
        : `I couldn't find employees${scopeName ? ` for ${scopeName}` : ''}. Check the spelling or try a department, name, or skill.`;

    return res.json({
      success: true,
      reply,
      type: isCount ? 'statistics' : parsedIntent.intent === 'EMPLOYEE_PROFILE' ? 'employee_profile' : 'employee_list',
      stats: isCount ? [{ label: scopeName, value: result.total }] : [],
      employees: isCount ? [] : result.employees.map(toChatEmployee),
      total: result.total,
      hasMore: !isCount && result.total > result.employees.length,
      directoryUrl: category === 'IT'
        ? '/it-employees'
        : category === 'Non-IT'
          ? '/non-it-employees'
          : department
            ? `/employees?department=${encodeURIComponent(department)}`
            : '/employees',
      suggestions,
      intent: parsedIntent.intent,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Chat request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while processing the chat request.',
    });
  }
};

module.exports = {
  handleChatRequest,
};
