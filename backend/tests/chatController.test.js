const test = require('node:test');
const assert = require('node:assert/strict');
const { handleChatRequest } = require('../controllers/chatController');
const { ROLE_PERMISSIONS } = require('../config/permissions');

const runChat = async ({ message, role, permissions, employeeRecordId, confirmAction }) => {
  let statusCode = 200;
  let body;
  const req = {
    body: { message, ...(confirmAction ? { confirmAction } : {}) },
    ip: '127.0.0.1',
    user: {
      id: `test-${role.toLowerCase()}`,
      name: 'Test User',
      role,
      permissions,
      employeeRecordId,
    },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(response) {
      body = response;
      return response;
    },
  };
  await handleChatRequest(req, res);
  return { statusCode, body };
};

test('routes an authorized employee-directory request through its registered tool', async () => {
  const result = await runChat({
    message: 'Show IT employees',
    role: 'HR',
    permissions: ROLE_PERMISSIONS.HR,
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.intent, 'SEARCH_CATEGORY');
  assert.ok(Array.isArray(result.body.employees));
  assert.ok(result.body.employees.every((employee) => employee.department === 'IT'));
});

test('blocks an employee directory search for a user without directory permission', async () => {
  const result = await runChat({
    message: 'Show IT employees',
    role: 'EMPLOYEE',
    permissions: ROLE_PERMISSIONS.EMPLOYEE,
  });
  assert.equal(result.statusCode, 403);
  assert.match(result.body.message, /permission to search/);
});

test('requires a linked employee identity and confirmation for attendance actions', async () => {
  const missingLink = await runChat({
    message: 'Check in now',
    role: 'EMPLOYEE',
    permissions: ROLE_PERMISSIONS.EMPLOYEE,
  });
  assert.equal(missingLink.statusCode, 403);
  assert.match(missingLink.body.message, /not linked to an employee record/);

  const unlinkedConfirmation = await runChat({
    message: 'Confirm check-in',
    role: 'EMPLOYEE',
    permissions: ROLE_PERMISSIONS.EMPLOYEE,
    confirmAction: 'CHECK_IN',
  });
  assert.equal(unlinkedConfirmation.statusCode, 403);
});
