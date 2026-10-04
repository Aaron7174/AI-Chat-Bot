const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
} = require('../services/employeeService');

test('employee mutations fail instead of reporting temporary fallback writes as saved', async () => {
  await assert.rejects(createEmployee({}), { code: 'PERSISTENCE_UNAVAILABLE' });
  await assert.rejects(updateEmployee('EMP-1', {}), { code: 'PERSISTENCE_UNAVAILABLE' });
  await assert.rejects(softDeleteEmployee('EMP-1', 'admin'), { code: 'PERSISTENCE_UNAVAILABLE' });
});
