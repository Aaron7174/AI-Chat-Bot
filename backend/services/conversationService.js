const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');

const CONVERSATIONS_PER_PAGE = 50;
const MAX_MESSAGES_PER_CONVERSATION = 500;
const TITLE_MAX_LENGTH = 80;

const ensureDatabaseReady = () => {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('Conversation history requires a connected MongoDB database.');
    error.statusCode = 503;
    throw error;
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createConversationTitle = (message) => {
  const text = String(message || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'New conversation';

  const normalized = text.toLowerCase();
  if (/\battendance\b/.test(normalized)) {
    const month = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
    const personMatch = text.match(/\b(?:for|of)\s+([A-Z][\w'-]+)/);
    const person = personMatch?.[1]?.toLowerCase() === month?.[1]?.toLowerCase() ? null : personMatch?.[1];
    return [person, month?.[1], 'Attendance'].filter(Boolean).join(' ').slice(0, TITLE_MAX_LENGTH);
  }

  if (/\bhow many|count|number of|total\b/i.test(text) && /\bemployees?\b/i.test(text)) {
    const department = text.match(/\b(?:in|from)\s+(?:the\s+)?([A-Z][\w& -]*?)(?:\s+department)?[?.!]*$/i);
    return `${department?.[1]?.trim() || 'Employee'} Employee Count`.slice(0, TITLE_MAX_LENGTH);
  }

  if (/\b(?:find|search|show|tell me about)\b/i.test(text)) {
    const person = text.match(/\b(?:find|search(?: for)?|show|tell me about)\s+(?:employee\s+)?([A-Z][\w'-]+)/i);
    if (person?.[1] && !/^(all|it|non|employees?|my|the|me)$/i.test(person[1])) {
      return `${person[1]} Employee Search`.slice(0, TITLE_MAX_LENGTH);
    }
  }

  return text.length <= 52 ? text : `${text.slice(0, 49).trimEnd()}...`;
};

const getConversationId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error('Conversation not found.');
    error.statusCode = 404;
    throw error;
  }
  return new mongoose.Types.ObjectId(id);
};

const getOwnedConversation = async (conversationId, userId) => {
  ensureDatabaseReady();
  const conversation = await Conversation.findOne({
    _id: getConversationId(conversationId),
    userId,
  });
  if (!conversation) {
    const error = new Error('Conversation not found.');
    error.statusCode = 404;
    throw error;
  }
  return conversation;
};

const toConversationSummary = (conversation) => {
  const lastMessage = conversation.messages?.[conversation.messages.length - 1];
  return {
    id: String(conversation._id),
    title: conversation.title,
    preview: lastMessage?.text || '',
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages?.length || 0,
  };
};

const toConversationDetails = (conversation) => ({
  ...toConversationSummary(conversation),
  messages: (conversation.messages || []).map((message) => ({
    sender: message.sender,
    text: message.text,
    time: message.time,
    ...(message.response ? { ...message.response } : {}),
  })),
});

const createConversation = async (userId) => {
  ensureDatabaseReady();
  const conversation = await Conversation.create({
    userId,
    title: 'New conversation',
  });
  return toConversationDetails(conversation);
};

const listConversations = async (userId, search = '', page = 1) => {
  ensureDatabaseReady();
  const query = { userId };
  const normalizedPage = Number.isInteger(Number(page)) ? Math.max(1, Math.min(10000, Number(page))) : 1;
  const normalizedSearch = String(search || '').trim().slice(0, 100);
  if (normalizedSearch) {
    const matcher = new RegExp(escapeRegExp(normalizedSearch), 'i');
    query.$or = [{ title: matcher }, { 'messages.text': matcher }];
  }
  const conversations = await Conversation.find(query)
    .sort({ updatedAt: -1 })
    .skip((normalizedPage - 1) * CONVERSATIONS_PER_PAGE)
    .limit(CONVERSATIONS_PER_PAGE)
    .select('title messages.sender messages.text updatedAt');
  return {
    conversations: conversations.map(toConversationSummary),
    nextPage: conversations.length === CONVERSATIONS_PER_PAGE ? normalizedPage + 1 : null,
  };
};

const getConversation = async (conversationId, userId) => (
  toConversationDetails(await getOwnedConversation(conversationId, userId))
);

const renameConversation = async (conversationId, userId, title) => {
  const normalizedTitle = String(title || '').trim();
  if (!normalizedTitle || normalizedTitle.length > TITLE_MAX_LENGTH) {
    const error = new Error(`Conversation title must be between 1 and ${TITLE_MAX_LENGTH} characters.`);
    error.statusCode = 400;
    throw error;
  }
  const conversation = await getOwnedConversation(conversationId, userId);
  conversation.title = normalizedTitle;
  await conversation.save();
  return toConversationSummary(conversation);
};

const deleteConversation = async (conversationId, userId) => {
  ensureDatabaseReady();
  const result = await Conversation.deleteOne({
    _id: getConversationId(conversationId),
    userId,
  });
  if (!result.deletedCount) {
    const error = new Error('Conversation not found.');
    error.statusCode = 404;
    throw error;
  }
};

const appendMessage = async (conversationId, userId, message, context) => {
  const conversation = await getOwnedConversation(conversationId, userId);
  if (conversation.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
    const error = new Error('This conversation has reached its message limit. Start a new conversation to continue.');
    error.statusCode = 409;
    throw error;
  }

  conversation.messages.push(message);
  if (context) conversation.context = context;
  if (message.sender === 'user' && conversation.title === 'New conversation') {
    conversation.title = createConversationTitle(message.text);
  }
  await conversation.save();
  return toConversationDetails(conversation);
};

const getStoredContext = (conversation) => ({
  ...(conversation.context?.toObject ? conversation.context.toObject() : conversation.context || {}),
  lastUserMessage: [...(conversation.messages || [])].reverse().find((message) => message.sender === 'user')?.text || '',
});

const getConversationContext = async (conversationId, userId) => (
  getStoredContext(await getOwnedConversation(conversationId, userId))
);

const resolveFollowUp = (message, context, departments = []) => {
  const text = String(message || '').trim();
  const normalized = text.toLowerCase();
  const previousMessage = String(context?.lastUserMessage || '').toLowerCase();

  if (
    /\b(?:what about|how about|and)\s+(?:last|previous|prior)\s+month\b/i.test(normalized)
    && ['ATTENDANCE_HISTORY', 'ATTENDANCE_PERCENTAGE'].includes(context?.lastIntent)
    && /\bmy\b|\bmine\b/.test(previousMessage)
  ) {
    return context.lastIntent === 'ATTENDANCE_PERCENTAGE'
      ? 'What is my attendance percentage for last month?'
      : 'What is my attendance history for last month?';
  }

  if (
    /\b(?:what about|how about|and)\s+(?:this|current)\s+month\b/i.test(normalized)
    && ['ATTENDANCE_HISTORY', 'ATTENDANCE_PERCENTAGE'].includes(context?.lastIntent)
    && /\bmy\b|\bmine\b/.test(previousMessage)
  ) {
    return context.lastIntent === 'ATTENDANCE_PERCENTAGE'
      ? 'What is my attendance percentage for this month?'
      : 'What is my attendance history for this month?';
  }

  if (!['COUNT_EMPLOYEES', 'SEARCH_DEPARTMENT', 'DEPARTMENT_ATTENDANCE'].includes(context?.lastIntent)) {
    return text;
  }

  const mentionedDepartment = [...departments]
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)
    .find((department) => {
      const escapedDepartment = escapeRegExp(String(department).trim());
      return new RegExp(`^(?:what\\s+about|how\\s+about|and)\\s+(?:the\\s+)?${escapedDepartment}[?.!]*$`, 'i').test(text);
    });

  if (!mentionedDepartment) return text;
  if (context.lastIntent === 'COUNT_EMPLOYEES') {
    return `How many employees are in ${mentionedDepartment}?`;
  }
  if (context.lastIntent === 'DEPARTMENT_ATTENDANCE') {
    return `Show ${mentionedDepartment} department attendance`;
  }
  return `Show employees in ${mentionedDepartment}`;
};

module.exports = {
  appendMessage,
  createConversation,
  createConversationTitle,
  deleteConversation,
  getConversation,
  getConversationContext,
  listConversations,
  resolveFollowUp,
  renameConversation,
};
