const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const {
  createConversationTitle,
  getConversation,
  listConversations,
  resolveFollowUp,
} = require('../services/conversationService');

test('creates short deterministic titles for common supported requests', () => {
  assert.equal(createConversationTitle('How many employees are in IT?'), 'IT Employee Count');
  assert.equal(createConversationTitle('Show my attendance for September'), 'September Attendance');
  assert.equal(createConversationTitle('Show Ravi'), 'Ravi Employee Search');
  assert.notEqual(createConversationTitle('Find employees with React skills'), 'employees Employee Search');
  assert.ok(createConversationTitle('a'.repeat(100)).length <= 52);
});

test('resolves own-attendance month follow-ups using conversation intent', () => {
  const context = {
    lastIntent: 'ATTENDANCE_HISTORY',
    lastUserMessage: 'Show my attendance this month',
  };
  assert.equal(
    resolveFollowUp('What about last month?', context),
    'What is my attendance history for last month?',
  );
  assert.equal(
    resolveFollowUp('And this month?', { ...context, lastIntent: 'ATTENDANCE_PERCENTAGE' }),
    'What is my attendance percentage for this month?',
  );
  assert.equal(
    resolveFollowUp('What about last month?', { ...context, lastUserMessage: 'Show Ravi attendance' }),
    'What about last month?',
  );
});

test('resolves department follow-ups only when the previous turn supports them', () => {
  const departments = ['Human Resources', 'IT'];
  assert.equal(
    resolveFollowUp('What about Human Resources?', { lastIntent: 'COUNT_EMPLOYEES' }, departments),
    'How many employees are in Human Resources?',
  );
  assert.equal(
    resolveFollowUp('And IT?', { lastIntent: 'SEARCH_DEPARTMENT' }, departments),
    'Show employees in IT',
  );
  assert.equal(
    resolveFollowUp('What about IT?', { lastIntent: 'GENERAL_CHAT' }, departments),
    'What about IT?',
  );
});

test('requires MongoDB rather than silently keeping persistent history in memory', async () => {
  const originalReadyState = mongoose.connection.readyState;
  mongoose.connection.readyState = 0;
  try {
    await assert.rejects(listConversations('user-id'), (error) => error.statusCode === 503);
  } finally {
    mongoose.connection.readyState = originalReadyState;
  }
});

test('conversation lookups always scope by the authenticated owner', async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindOne = Conversation.findOne;
  const ownerId = new mongoose.Types.ObjectId().toString();
  const conversationId = new mongoose.Types.ObjectId().toString();
  let query;

  mongoose.connection.readyState = 1;
  Conversation.findOne = (filter) => {
    query = filter;
    return Promise.resolve(null);
  };
  try {
    await assert.rejects(getConversation(conversationId, ownerId), (error) => error.statusCode === 404);
    assert.equal(String(query.userId), ownerId);
    assert.equal(String(query._id), conversationId);
  } finally {
    Conversation.findOne = originalFindOne;
    mongoose.connection.readyState = originalReadyState;
  }
});

test('conversation search is escaped, owner-scoped, and paginated on the server', async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = Conversation.find;
  const ownerId = new mongoose.Types.ObjectId().toString();
  let query;
  let requestedSkip;
  let requestedLimit;

  mongoose.connection.readyState = 1;
  Conversation.find = (filter) => {
    query = filter;
    return {
      sort() { return this; },
      skip(value) { requestedSkip = value; return this; },
      limit(value) { requestedLimit = value; return this; },
      select() { return Promise.resolve([]); },
    };
  };
  try {
    const result = await listConversations(ownerId, 'a.*', 2);
    assert.equal(String(query.userId), ownerId);
    assert.equal(query.$or[0].title.source, 'a\\.\\*');
    assert.equal(requestedSkip, 50);
    assert.equal(requestedLimit, 50);
    assert.deepEqual(result, { conversations: [], nextPage: null });
  } finally {
    Conversation.find = originalFind;
    mongoose.connection.readyState = originalReadyState;
  }
});
