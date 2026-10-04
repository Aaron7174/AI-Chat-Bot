const {
  findEmployee,
  queryEmployees,
} = require('./employeeService');
const {
  buildRegister,
  checkIn,
  checkOut,
  getCompanyMonth,
  getOwnHistory,
  getToday,
} = require('./attendanceService');

const EMPLOYEE_DIRECTORY_INTENTS = [
  'OWN_PROFILE',
  'COUNT_EMPLOYEES',
  'SEARCH_SKILL',
  'SEARCH_CATEGORY',
  'SEARCH_DEPARTMENT',
  'SEARCH_EMPLOYEES',
  'EMPLOYEE_PROFILE',
  'LIST_EMPLOYEES',
];

const ATTENDANCE_INTENTS = [
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

const parseLimit = (value) => {
  const requested = Number(value);
  return Number.isInteger(requested) ? Math.min(10, Math.max(1, requested)) : 5;
};

const employeeDirectoryTool = {
  name: 'employee_directory',
  description: 'Search authorized employee profiles, skills, categories, and departments.',
  intents: EMPLOYEE_DIRECTORY_INTENTS,
  domain: 'employees',
  sensitivity: 'employee_data',
  inputSchema: {
    type: 'object',
    properties: {
      search: { type: 'string', maxLength: 120 },
      department: { type: 'string', maxLength: 80 },
      category: { type: 'string', enum: ['IT', 'Non-IT'] },
      skill: { type: 'string', maxLength: 80 },
      limit: { type: 'integer', minimum: 1, maximum: 10 },
    },
    additionalProperties: false,
  },
  confirmationRequired: false,
  requiredPermissions: ['VIEW_EMPLOYEES', 'VIEW_OWN_PROFILE'],
  authorize: ({ intent, user }) => {
    if (intent === 'OWN_PROFILE') {
      if (!user.permissions.includes('VIEW_OWN_PROFILE') || !user.employeeRecordId) {
        return {
          allowed: false,
          message: 'Your account is not linked to an employee profile yet. Contact HR to link your account.',
        };
      }
      return { allowed: true, scope: 'own' };
    }

    if (user.role === 'EMPLOYEE' || !user.permissions.includes('VIEW_EMPLOYEES')) {
      return { allowed: false, message: 'You do not have permission to search the employee directory.' };
    }
    return { allowed: true, scope: 'directory' };
  },
  execute: async ({ intent, query, user, limit }) => {
    if (intent === 'OWN_PROFILE') {
      return { employee: await findEmployee(user.employeeRecordId) };
    }

    const isCount = intent === 'COUNT_EMPLOYEES';
    return queryEmployees({
      page: 1,
      limit: isCount ? 1 : parseLimit(limit),
      search: query.search,
      department: query.department,
      employeeType: query.category,
      skill: query.skill,
    });
  },
};

const attendanceTool = {
  name: 'attendance_intelligence',
  description: 'Read authorized attendance data and perform confirmed personal attendance actions.',
  intents: ATTENDANCE_INTENTS,
  domain: 'attendance',
  sensitivity: 'attendance_data',
  inputSchema: {
    type: 'object',
    properties: {
      department: { type: 'string', maxLength: 80 },
      monthOffset: { type: 'integer', enum: [-1, 0] },
    },
    additionalProperties: false,
  },
  confirmationRequired: true,
  confirmationRequiredIntents: ['CHECK_IN', 'CHECK_OUT'],
  requiredPermissions: ['VIEW_ATTENDANCE', 'VIEW_OWN_ATTENDANCE'],
  authorize: ({ intent, user, message }) => {
    if (['CHECK_IN', 'CHECK_OUT', 'ATTENDANCE_CORRECTION'].includes(intent)) {
      if (!user.permissions.includes('VIEW_OWN_ATTENDANCE')) {
        return { allowed: false, message: 'You can only manage or request corrections for your own attendance.' };
      }
      if (!user.employeeRecordId) {
        return {
          allowed: false,
          message: 'Your account is not linked to an employee record, so personal attendance is unavailable.',
        };
      }
      return { allowed: true, scope: 'own' };
    }

    if (['DEPARTMENT_ATTENDANCE', 'MISSING_CHECKOUT', 'ATTENDANCE_UNRESOLVED'].includes(intent)) {
      return user.permissions.includes('VIEW_ATTENDANCE')
        ? { allowed: true, scope: 'team' }
        : { allowed: false, message: 'You can only access your own attendance information.' };
    }

    const requestsOwnAttendance = user.role === 'EMPLOYEE' || /\b(my|mine|me|i|am i)\b/i.test(message);
    if (requestsOwnAttendance) {
      if (!user.permissions.includes('VIEW_OWN_ATTENDANCE') || !user.employeeRecordId) {
        return {
          allowed: false,
          message: 'Personal attendance is available only to an employee account linked to an employee record.',
        };
      }
      return { allowed: true, scope: 'own' };
    }

    return user.permissions.includes('VIEW_ATTENDANCE')
      ? { allowed: true, scope: 'team' }
      : { allowed: false, message: 'You can only access your own attendance information.' };
  },
  execute: async ({ intent, query, user, monthOffset, ipAddress, authorization }) => {
    if (intent === 'CHECK_IN') {
      return checkIn({ user, source: 'CHATBOT', ipAddress });
    }
    if (intent === 'CHECK_OUT') {
      return checkOut({ user, source: 'CHATBOT', ipAddress });
    }
    if (intent === 'ATTENDANCE_CORRECTION') {
      return {
        correctionRequest: true,
        attendanceUrl: '/attendance',
        reply: 'I will not invent or directly edit a timestamp. Open Attendance to submit the date, requested check-in/check-out time, and reason for HR review.',
      };
    }
    if (['DEPARTMENT_ATTENDANCE', 'MISSING_CHECKOUT', 'ATTENDANCE_UNRESOLVED'].includes(intent)) {
      return buildRegister({
        department: query.department,
        status: intent === 'MISSING_CHECKOUT'
          ? 'MISSED_CHECKOUT'
          : intent === 'ATTENDANCE_UNRESOLVED'
            ? 'MISSING_ATTENDANCE'
            : undefined,
        page: 1,
        limit: 10,
      });
    }
    if (authorization.scope === 'team') {
      return buildRegister({ department: query.department, page: 1, limit: 20 });
    }
    if (intent === 'ATTENDANCE_HISTORY' || intent === 'ATTENDANCE_PERCENTAGE') {
      const month = monthOffset === undefined ? undefined : await getCompanyMonth(monthOffset);
      return getOwnHistory({ user, month, limit: 100 });
    }
    return getToday(user);
  },
};

const definitions = [employeeDirectoryTool, attendanceTool];
const toolsByIntent = new Map();

for (const tool of definitions) {
  for (const intent of tool.intents) {
    if (toolsByIntent.has(intent)) {
      throw new Error(`Chat intent "${intent}" is registered more than once.`);
    }
    toolsByIntent.set(intent, tool);
  }
}

const getChatTool = (intent) => toolsByIntent.get(intent) || null;

const authorizeChatTool = (tool, context) => {
  if (!tool) return { allowed: false, message: 'This request does not match an available assistant tool.' };
  return tool.authorize(context);
};

const validateToolInput = (tool, input = {}) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    const error = new Error('The assistant tool input must be an object.');
    error.statusCode = 400;
    throw error;
  }

  const properties = tool.inputSchema.properties;
  for (const [key, value] of Object.entries(input)) {
    const definition = properties[key];
    if (!definition) {
      const error = new Error(`Unsupported input field: ${key}.`);
      error.statusCode = 400;
      throw error;
    }
    if (value === undefined || value === null) continue;
    if (definition.type === 'string' && (typeof value !== 'string' || value.length > definition.maxLength)) {
      const error = new Error(`Invalid ${key} for this assistant tool.`);
      error.statusCode = 400;
      throw error;
    }
    if (definition.type === 'integer' && (
      !Number.isInteger(value)
      || (definition.minimum !== undefined && value < definition.minimum)
      || (definition.maximum !== undefined && value > definition.maximum)
      || (definition.enum && !definition.enum.includes(value))
    )) {
      const error = new Error(`Invalid ${key} for this assistant tool.`);
      error.statusCode = 400;
      throw error;
    }
    if (definition.enum && !definition.enum.includes(value)) {
      const error = new Error(`Invalid ${key} for this assistant tool.`);
      error.statusCode = 400;
      throw error;
    }
  }
};

const executeChatTool = async (tool, context) => {
  if (!tool) {
    const error = new Error('This request does not match an available assistant tool.');
    error.statusCode = 400;
    throw error;
  }

  const authorization = authorizeChatTool(tool, context);
  if (!authorization.allowed) {
    const error = new Error(authorization.message);
    error.statusCode = 403;
    throw error;
  }
  if (tool.confirmationRequiredIntents?.includes(context.intent) && context.confirmed !== true) {
    const error = new Error('This attendance action requires explicit user confirmation.');
    error.statusCode = 409;
    throw error;
  }

  validateToolInput(tool, context.query || {});
  return tool.execute({ ...context, authorization });
};

const getRegisteredChatTools = () => definitions.map((tool) => ({
  name: tool.name,
  description: tool.description,
  intents: [...tool.intents],
  domain: tool.domain,
  sensitivity: tool.sensitivity,
  confirmationRequired: tool.confirmationRequired,
  confirmationRequiredIntents: [...(tool.confirmationRequiredIntents || [])],
  inputSchema: tool.inputSchema,
  requiredPermissions: [...tool.requiredPermissions],
}));

module.exports = {
  ATTENDANCE_INTENTS,
  EMPLOYEE_DIRECTORY_INTENTS,
  authorizeChatTool,
  executeChatTool,
  getChatTool,
  getRegisteredChatTools,
};
