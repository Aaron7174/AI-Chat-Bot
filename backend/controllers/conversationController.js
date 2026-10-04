const { parseChatIntent } = require('../services/chatIntentService');
const {
  appendMessage,
  createConversation,
  getConversation,
  getConversationContext,
  listConversations,
  renameConversation,
  deleteConversation,
  resolveFollowUp,
} = require('../services/conversationService');
const { getDepartmentStats } = require('../services/employeeService');
const { handleChatRequest } = require('./chatController');

const sendError = (res, error) => res.status(error.statusCode || 500).json({
  success: false,
  message: error.statusCode ? error.message : 'Unable to process conversation request.',
});

const safeResponseData = (response) => ({
  ...(response.type ? { type: response.type } : {}),
  ...(response.intent ? { intent: response.intent } : {}),
  ...(Array.isArray(response.stats) ? { stats: response.stats.slice(0, 20) } : {}),
  ...(Number.isFinite(response.total) ? { total: response.total } : {}),
  ...(typeof response.hasMore === 'boolean' ? { hasMore: response.hasMore } : {}),
  ...(response.directoryUrl ? { directoryUrl: response.directoryUrl } : {}),
  ...(response.attendanceUrl ? { attendanceUrl: response.attendanceUrl } : {}),
  ...(response.attendanceAction ? { attendanceAction: response.attendanceAction } : {}),
  ...(response.attendanceSummary ? { attendanceSummary: response.attendanceSummary } : {}),
  ...(Array.isArray(response.employees) ? {
    employees: response.employees.slice(0, 10).map((employee) => ({
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      category: employee.category,
      role: employee.role,
      location: employee.location,
      status: employee.status,
      skills: Array.isArray(employee.skills) ? employee.skills.slice(0, 10) : [],
    })),
  } : {}),
  ...(Array.isArray(response.suggestions) ? { suggestions: response.suggestions.slice(0, 10) } : {}),
});

const create = async (req, res) => {
  try {
    const conversation = await createConversation(req.user.id);
    return res.status(201).json({ success: true, conversation });
  } catch (error) {
    return sendError(res, error);
  }
};

const list = async (req, res) => {
  try {
    const result = await listConversations(req.user.id, req.query.search, req.query.page);
    return res.json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

const get = async (req, res) => {
  try {
    const conversation = await getConversation(req.params.conversationId, req.user.id);
    return res.json({ success: true, conversation });
  } catch (error) {
    return sendError(res, error);
  }
};

const rename = async (req, res) => {
  try {
    const conversation = await renameConversation(req.params.conversationId, req.user.id, req.body?.title);
    return res.json({ success: true, conversation });
  } catch (error) {
    return sendError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    await deleteConversation(req.params.conversationId, req.user.id);
    return res.status(204).end();
  } catch (error) {
    return sendError(res, error);
  }
};

const sendMessage = async (req, res) => {
  const originalMessage = req.body?.message;
  if (typeof originalMessage !== 'string' || !originalMessage.trim() || originalMessage.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a message between 1 and 500 characters.',
    });
  }

  try {
    const context = await getConversationContext(req.params.conversationId, req.user.id);
    const departments = (await getDepartmentStats()).map(({ department }) => department).filter(Boolean);
    const resolvedMessage = resolveFollowUp(originalMessage, context, departments);
    const userMessage = {
      sender: 'user',
      text: originalMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    await appendMessage(req.params.conversationId, req.user.id, userMessage);

    let statusCode = 200;
    let responseBody;
    const captureResponse = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return body;
      },
    };

    const originalBody = req.body;
    try {
      req.body = { ...originalBody, message: resolvedMessage };
      await handleChatRequest(req, captureResponse);
    } finally {
      req.body = originalBody;
    }

    if (!responseBody) {
      throw new Error('Chat handler returned no response.');
    }

    const parsed = parseChatIntent(resolvedMessage, departments);
    const priorEmployee = context.employee || {};
    const resultEmployee = responseBody.employees?.length === 1
      ? responseBody.employees[0]
      : null;
    const nextContext = statusCode < 400
      ? {
        lastIntent: responseBody.intent || parsed.intent || context.lastIntent || null,
        department: parsed.query?.department || context.department || null,
        employee: resultEmployee
          ? { id: String(resultEmployee.id || ''), name: resultEmployee.name || '' }
          : priorEmployee,
      }
      : {
        lastIntent: context.lastIntent || null,
        department: context.department || null,
        employee: priorEmployee,
      };

    await appendMessage(req.params.conversationId, req.user.id, {
      sender: 'bot',
      text: String(responseBody.reply || responseBody.message || '').slice(0, 10000),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      response: statusCode < 400 ? safeResponseData(responseBody) : undefined,
    }, nextContext);

    return res.status(statusCode).json(responseBody);
  } catch (error) {
    if (req.body?.confirmAction) {
      return res.status(503).json({
        success: false,
        message: 'The attendance action may have completed, but the chat confirmation could not be saved. Check your Attendance page before trying again.',
      });
    }
    return sendError(res, error);
  }
};

module.exports = { create, get, list, remove, rename, sendMessage };
