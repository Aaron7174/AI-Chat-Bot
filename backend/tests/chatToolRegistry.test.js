const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ATTENDANCE_INTENTS,
  EMPLOYEE_DIRECTORY_INTENTS,
  authorizeChatTool,
  executeChatTool,
  getChatTool,
  getRegisteredChatTools,
} = require('../services/chatToolRegistry');

const user = (role, permissions, employeeRecordId = 'employee-1') => ({
  id: `${role.toLowerCase()}-1`,
  role,
  permissions,
  employeeRecordId,
});

test('registers every supported employee and attendance intent exactly once', () => {
  const allIntents = [...EMPLOYEE_DIRECTORY_INTENTS, ...ATTENDANCE_INTENTS];
  assert.equal(new Set(allIntents).size, allIntents.length);
  for (const intent of allIntents) {
    assert.ok(getChatTool(intent), `missing registry definition for ${intent}`);
  }
  assert.equal(getChatTool('APPLY_LEAVE'), null);
});

test('exposes definitions without executable handlers or user data', () => {
  const tools = getRegisteredChatTools();
  assert.deepEqual(tools.map(({ name }) => name), ['employee_directory', 'attendance_intelligence']);
  assert.ok(tools.every((tool) => tool.inputSchema && !('execute' in tool) && !('authorize' in tool)));
  assert.equal(getChatTool('CHECK_IN').confirmationRequired, true);
  assert.deepEqual(getChatTool('CHECK_IN').confirmationRequiredIntents, ['CHECK_IN', 'CHECK_OUT']);
});

test('enforces employee directory search and own-profile permissions separately', () => {
  assert.equal(authorizeChatTool(getChatTool('SEARCH_DEPARTMENT'), {
    intent: 'SEARCH_DEPARTMENT',
    user: user('HR', ['VIEW_EMPLOYEES']),
    message: 'Show IT employees',
  }).allowed, true);
  assert.equal(authorizeChatTool(getChatTool('SEARCH_DEPARTMENT'), {
    intent: 'SEARCH_DEPARTMENT',
    user: user('EMPLOYEE', ['VIEW_OWN_PROFILE', 'VIEW_OWN_ATTENDANCE']),
    message: 'Show IT employees',
  }).allowed, false);
  assert.equal(authorizeChatTool(getChatTool('OWN_PROFILE'), {
    intent: 'OWN_PROFILE',
    user: user('EMPLOYEE', ['VIEW_OWN_PROFILE']),
    message: 'Show my profile',
  }).scope, 'own');
  assert.equal(authorizeChatTool(getChatTool('OWN_PROFILE'), {
    intent: 'OWN_PROFILE',
    user: user('EMPLOYEE', ['VIEW_OWN_PROFILE'], null),
    message: 'Show my profile',
  }).allowed, false);
});

test('scopes attendance to own or team permissions and requires linked identities for mutations', () => {
  assert.deepEqual(authorizeChatTool(getChatTool('ATTENDANCE_HISTORY'), {
    intent: 'ATTENDANCE_HISTORY',
    user: user('EMPLOYEE', ['VIEW_OWN_ATTENDANCE']),
    message: 'Show my attendance',
  }), { allowed: true, scope: 'own' });

  assert.deepEqual(authorizeChatTool(getChatTool('ATTENDANCE_UNRESOLVED'), {
    intent: 'ATTENDANCE_UNRESOLVED',
    user: user('HR', ['VIEW_ATTENDANCE']),
    message: 'Who is absent today?',
  }), { allowed: true, scope: 'team' });

  assert.equal(authorizeChatTool(getChatTool('ATTENDANCE_UNRESOLVED'), {
    intent: 'ATTENDANCE_UNRESOLVED',
    user: user('EMPLOYEE', ['VIEW_OWN_ATTENDANCE']),
    message: 'Who is absent today?',
  }).allowed, false);

  assert.equal(authorizeChatTool(getChatTool('CHECK_IN'), {
    intent: 'CHECK_IN',
    user: user('EMPLOYEE', ['VIEW_OWN_ATTENDANCE'], null),
    message: 'Check in now',
  }).allowed, false);
});

test('executes no registered tool unless server-side authorization and confirmation pass', async () => {
  await assert.rejects(executeChatTool(getChatTool('SEARCH_DEPARTMENT'), {
    intent: 'SEARCH_DEPARTMENT',
    user: user('EMPLOYEE', ['VIEW_OWN_ATTENDANCE']),
    message: 'Show employees in IT',
    query: { department: 'IT' },
  }), (error) => error.statusCode === 403);

  await assert.rejects(executeChatTool(getChatTool('CHECK_IN'), {
    intent: 'CHECK_IN',
    user: user('EMPLOYEE', ['VIEW_OWN_ATTENDANCE']),
    message: 'Check in now',
    query: {},
  }), (error) => error.statusCode === 409);
});

test('validates parsed tool inputs before calling the data service', async () => {
  await assert.rejects(executeChatTool(getChatTool('SEARCH_CATEGORY'), {
    intent: 'SEARCH_CATEGORY',
    user: user('HR', ['VIEW_EMPLOYEES']),
    message: 'Show employees in Finance',
    query: { category: 'Finance' },
  }), (error) => error.statusCode === 400);

  await assert.rejects(executeChatTool(getChatTool('ATTENDANCE_HISTORY'), {
    intent: 'ATTENDANCE_HISTORY',
    user: user('EMPLOYEE', ['VIEW_OWN_ATTENDANCE']),
    message: 'Show my attendance',
    query: { monthOffset: -2 },
  }), (error) => error.statusCode === 400);
});

test('accepts optional parser fields when they are unset', async () => {
  const result = await executeChatTool(getChatTool('COUNT_EMPLOYEES'), {
    intent: 'COUNT_EMPLOYEES',
    user: user('HR', ['VIEW_EMPLOYEES']),
    message: 'How many employees are there?',
    query: { department: null, category: null },
  });
  assert.equal(typeof result.total, 'number');
});
