const test = require('node:test');
const assert = require('node:assert/strict');
const { parseChatIntent } = require('../services/chatIntentService');

test('recognizes standalone greetings as conversational intent', () => {
  for (const message of ['Hello', 'Hi!', 'Good morning', 'Hey, how are you?']) {
    assert.equal(parseChatIntent(message).intent, 'GENERAL_CHAT', message);
  }
});

test('recognizes acknowledgements without treating them as employee searches', () => {
  for (const message of ['Thanks', 'Thank you so much.', 'Got it']) {
    assert.equal(parseChatIntent(message).intent, 'GENERAL_CHAT', message);
  }
});

test('explains supported capabilities only for explicit help questions', () => {
  for (const message of ['What can you do?', 'How can you help me?', 'Show me help']) {
    assert.equal(parseChatIntent(message).intent, 'SYSTEM_HELP', message);
  }

  assert.notEqual(parseChatIntent('Help me find Alex').intent, 'SYSTEM_HELP');
});

test('classifies unavailable product features without misrouting them to employee search', () => {
  assert.deepEqual(parseChatIntent('Apply for leave next week'), {
    intent: 'UNSUPPORTED_FEATURE',
    query: { feature: 'leave management' },
    summary: 'explain that leave management is unavailable',
  });
  assert.equal(parseChatIntent('Show me salary information').intent, 'UNSUPPORTED_FEATURE');
  assert.equal(parseChatIntent('Find Alex').intent, 'SEARCH_EMPLOYEES');
  assert.equal(parseChatIntent('Is Alex a good fit for managing leave requests?').intent, 'UNSUPPORTED_FEATURE');
});

test('asks for the missing target in incomplete directory searches', () => {
  const result = parseChatIntent('Find an employee');
  assert.equal(result.intent, 'CLARIFICATION');
  assert.match(result.clarification, /Which employee/);
  assert.equal(parseChatIntent('Show me IT employees', ['IT']).intent, 'SEARCH_CATEGORY');
});

test('understands common attendance phrasing and relative month filters', () => {
  const lastMonth = parseChatIntent('Show my attendance for last month');
  assert.equal(lastMonth.intent, 'ATTENDANCE_HISTORY');
  assert.equal(lastMonth.query.monthOffset, -1);

  const percentage = parseChatIntent('What was my attendance percentage this month?');
  assert.equal(percentage.intent, 'ATTENDANCE_PERCENTAGE');
  assert.equal(percentage.query.monthOffset, 0);

  const vague = parseChatIntent('Can you check my attendance?');
  assert.equal(vague.intent, 'CLARIFICATION');
  assert.match(vague.clarification, /own attendance today/);
});

test('clarifies unsupported or unclear questions instead of guessing a directory search', () => {
  const result = parseChatIntent('Tell me something useful');
  assert.equal(result.intent, 'CLARIFICATION');
  assert.match(result.clarification, /employees, departments, skills/);
});
