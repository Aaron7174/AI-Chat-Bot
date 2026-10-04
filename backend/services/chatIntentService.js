const normalizeText = (value) => String(value || '').trim().toLowerCase();

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findDepartment = (message, departments = []) => {
  const lowerMessage = normalizeText(message);
  const knownDepartment = departments
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)
    .find((department) => new RegExp(`\\b${escapeRegExp(normalizeText(department))}\\b`, 'i').test(lowerMessage));

  if (knownDepartment) return knownDepartment;

  if (/\b(human resources|humanresources|hr)\b/i.test(lowerMessage)) return 'HR';
  return null;
};

const extractSearchTerm = (message) => {
  const match = String(message || '').match(
    /\b(?:find|search(?:\s+for)?|look\s+up|who\s+is|show|display|get|tell\s+me\s+about|profile\s+(?:of|for)|details\s+(?:of|for))\s+(?:me\s+)?(?:the\s+)?(?:employee\s+)?(.+?)(?:\s+(?:in|from|at)\s+(?:the\s+)?(?:department|team|office)\b.*)?[?.!]*$/i,
  );

  if (!match) return null;

  const term = match[1]
    .replace(/\b(employee|employees|profile|details|information|contact|please|named|called)\b/gi, ' ')
    .replace(/\b(show|give me|tell me about)\b/gi, ' ')
    .replace(/\b(?:a|an|the|me)\b/gi, ' ')
    .replace(/['’]s\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return term.length >= 2 ? term : null;
};

const parseConversationalIntent = (message) => {
  const text = normalizeText(message).replace(/[.!?]+$/, '').trim();
  const greeting = /^(?:hi|hello|hey|good morning|good afternoon|good evening)(?:\s*,?\s*(?:how are you|how is it going))?$/;
  const thanks = /^(?:thanks|thank you|thanks a lot|thank you so much|got it|understood)$/;

  if (greeting.test(text)) {
    return { intent: 'GENERAL_CHAT', query: {}, summary: 'respond to a greeting' };
  }

  if (thanks.test(text)) {
    return { intent: 'GENERAL_CHAT', query: {}, summary: 'acknowledge the user' };
  }

  if (/\b(?:what can you do|how can you help|what can you help me with|what do you do|show (?:me )?help|chatbot help|supported questions)\b/.test(text)) {
    return { intent: 'SYSTEM_HELP', query: {}, summary: 'explain supported assistant capabilities' };
  }

  return null;
};

const parseUnsupportedFeatureIntent = (message) => {
  const text = normalizeText(message);
  const unsupportedFeatures = [
    { feature: 'leave management', pattern: /\b(?:leave balance|leave history|leave requests?|apply(?:ing)? for leave|cancel leave|leave status|leave days)\b/ },
    { feature: 'salary and payroll assistance', pattern: /\b(?:salary|payroll|payslip|pay slip|compensation|salary impact)\b/ },
    { feature: 'helpdesk tickets', pattern: /\b(?:help ?desk|support ticket|create (?:a )?ticket|ticket status|my tickets)\b/ },
    { feature: 'announcements and notifications', pattern: /\b(?:announcement|notifications?|notify me)\b/ },
    { feature: 'voice assistance', pattern: /\b(?:voice assistant|voice input|speak to|talk to the assistant|speech to text)\b/ },
    { feature: 'company policy search', pattern: /\b(?:company policy|leave policy|policy document|knowledge base|employee handbook)\b/ },
  ];
  const match = unsupportedFeatures.find(({ pattern }) => pattern.test(text));

  return match
    ? { intent: 'UNSUPPORTED_FEATURE', query: { feature: match.feature }, summary: `explain that ${match.feature} is unavailable` }
    : null;
};

const parseMonthOffset = (message) => {
  const text = normalizeText(message);
  if (/\b(?:last|previous|prior) month\b/.test(text)) return -1;
  if (/\b(?:this|current) month\b/.test(text)) return 0;
  return undefined;
};

const parseChatIntent = (message, departments = []) => {
  const originalMessage = String(message || '').trim();
  const lowerMessage = normalizeText(originalMessage);
  const conversationalIntent = parseConversationalIntent(originalMessage);
  if (conversationalIntent) return conversationalIntent;
  const unsupportedFeatureIntent = parseUnsupportedFeatureIntent(originalMessage);
  if (unsupportedFeatureIntent) return unsupportedFeatureIntent;

  const explicitDepartment = findDepartment(lowerMessage, departments);
  const monthOffset = parseMonthOffset(lowerMessage);
  const category = /\bnon[\s-]?it\b/.test(lowerMessage)
    ? 'Non-IT'
    : /\b(?:it employees|it team|it staff|employees in it)\b/.test(lowerMessage)
      ? 'IT'
      : null;

  if (/\bwho\b.*\b(forgot|missed)\b/.test(lowerMessage)) {
    return { intent: 'MISSING_CHECKOUT', query: { department: explicitDepartment }, summary: 'find missed checkouts' };
  }
  if (/\b(forgot|missed|correction|correct my|attendance is wrong)\b/.test(lowerMessage)
    && /\b(check.?in|check.?out|attendance)\b/.test(lowerMessage)) {
    return { intent: 'ATTENDANCE_CORRECTION', query: {}, summary: 'request an attendance correction' };
  }
  if (/\b(check\s*in|clock\s*in|sign\s*in)\b.*\b(now|today|please|me)?\b|\b(check\s*in|clock\s*in|sign\s*in)\s+now\b/i.test(lowerMessage)
    && !/\b(when|what|did i|have i|was i|am i|status|time|record|forgot|missed|correction|yesterday|last)\b/.test(lowerMessage)) {
    return { intent: 'CHECK_IN', query: {}, summary: 'check in for today' };
  }
  if (/\b(check\s*out|clock\s*out|sign\s*out)\b.*\b(now|today|please|me)?\b|\b(check\s*out|clock\s*out|sign\s*out)\s+now\b/i.test(lowerMessage)
    && !/\b(when|what|did i|have i|was i|am i|status|time|record|forgot|missed|correction|yesterday|last)\b/.test(lowerMessage)) {
    return { intent: 'CHECK_OUT', query: {}, summary: 'check out for today' };
  }
  if (/\b(?:can you|could you|please)\s+(?:check|show|tell me about)\s+(?:my|mine)\s+attendance\b/.test(lowerMessage)) {
    return {
      intent: 'CLARIFICATION',
      query: {},
      clarification: 'Is this about your own attendance today or your monthly attendance history?',
      summary: 'clarify the attendance period',
    };
  }
  if (/\b(attendance percentage|attendance rate|attendance (?:this|last|previous) month|attendance history|attendance records?)\b|\b(show my attendance|my attendance)(?:\s+(?:for\s+)?(?:this|current|last|previous) month|\s+history)?[?.!]*$/.test(lowerMessage)) {
    return {
      intent: /\bpercentage|rate\b/.test(lowerMessage) ? 'ATTENDANCE_PERCENTAGE' : 'ATTENDANCE_HISTORY',
      query: { department: explicitDepartment, monthOffset },
      summary: 'view attendance history',
    };
  }
  if (explicitDepartment && /\battendance\b/.test(lowerMessage) && /\bdepartment|team|employees?\b/.test(lowerMessage)) {
    return { intent: 'DEPARTMENT_ATTENDANCE', query: { department: explicitDepartment }, summary: `view attendance for ${explicitDepartment}` };
  }
  if (/\b(department attendance|attendance in|attendance for)\b/.test(lowerMessage)
    && explicitDepartment) {
    return { intent: 'DEPARTMENT_ATTENDANCE', query: { department: explicitDepartment }, summary: `view attendance for ${explicitDepartment}` };
  }
  if (/\b(who(?:'s| is)? (?:has )?not checked in|who hasn't checked in|who has not checked in|missing attendance|who is absent|absent today)\b/.test(lowerMessage)) {
    return { intent: 'ATTENDANCE_UNRESOLVED', query: { department: explicitDepartment }, summary: 'find unresolved attendance' };
  }
  if (/\b(missed checkout|missing checkout|forgot to check out)\b/.test(lowerMessage)) {
    return { intent: 'MISSING_CHECKOUT', query: { department: explicitDepartment }, summary: 'find missed checkouts' };
  }
  if (/\b(attendance today|today's attendance|my attendance today|attendance status|am i late|late today|when did i check.?in|when did i check.?out|check.?in time|check.?out time|working hours|hours (?:did i|have i) work(?:ed)?|overtime)\b/.test(lowerMessage)) {
    const intent = /\bovertime\b/.test(lowerMessage)
      ? 'OVERTIME'
      : /\bworking hours|hours (?:did i|have i) work(?:ed)?\b/.test(lowerMessage)
        ? 'WORKING_HOURS'
        : /\blate\b/.test(lowerMessage)
          ? 'LATE_STATUS'
          : 'ATTENDANCE_TODAY';
    return { intent, query: { department: explicitDepartment }, summary: 'view today’s attendance' };
  }

  if (/\b(attendance|check.?in|check.?out|work(?:ing)? hours)\b/.test(lowerMessage)
    && /\b(?:did|does|has|have|show|check|tell|what|when|how|my|mine)\b/.test(lowerMessage)) {
    return {
      intent: 'CLARIFICATION',
      query: {},
      clarification: 'Is this about your own attendance today, your monthly attendance history, or the team attendance register?',
      summary: 'clarify the attendance question',
    };
  }

  if (/\b(my profile|my employee details|my employee profile|show my details)\b/.test(lowerMessage)) {
    return { intent: 'OWN_PROFILE', query: {}, summary: 'view own employee profile' };
  }

  if (/\b(how many|count|number of|total)\b/.test(lowerMessage)) {
    return {
      intent: 'COUNT_EMPLOYEES',
      query: { department: explicitDepartment, category },
      summary: 'count employees',
    };
  }

  if (/\b(?:with|knows?|skilled in|skills? in)\s+([\w.+#-]+)(?:\s+skills?)?\b/i.test(originalMessage)) {
    const skill = originalMessage.match(/\b(?:with|knows?|skilled in|skills? in)\s+([\w.+#-]+)(?:\s+skills?)?\b/i)?.[1];
    return { intent: 'SEARCH_SKILL', query: { skill }, summary: `search employees with ${skill} skills` };
  }

  if (category && (/\b(?:show|list|find|search|browse|get)\b/.test(lowerMessage) || /\b(?:employees?|team|staff)\b/.test(lowerMessage))) {
    return { intent: 'SEARCH_CATEGORY', query: { category }, summary: `search ${category} employees` };
  }

  if (/\b(?:show|list|find|search|browse|get|who works in)\b/.test(lowerMessage) && explicitDepartment) {
    return {
      intent: 'SEARCH_DEPARTMENT',
      query: { department: explicitDepartment },
      summary: `search employees in ${explicitDepartment}`,
    };
  }

  if (/\b(?:show|list|browse|get)\b.*\b(?:all|every)\s+employees?\b|\b(?:all|list)\s+employees?\b/.test(lowerMessage)) {
    return { intent: 'LIST_EMPLOYEES', query: {}, summary: 'list employees' };
  }

  if (/\b(?:find|search(?:\s+for)?|look\s+up|who\s+is|show|display|get|tell\s+me\s+about|profile\s+(?:of|for)|details\s+(?:of|for))\b/.test(lowerMessage)) {
    const search = extractSearchTerm(originalMessage);
    if (search) {
      return {
        intent: /\b(profile|details|information)\b/.test(lowerMessage) ? 'EMPLOYEE_PROFILE' : 'SEARCH_EMPLOYEES',
        query: { search },
        summary: `search employee directory for ${search}`,
      };
    }
  }

  if (/\b(?:find|search(?:\s+for)?|look\s+up|who is|show|display|get|tell me about|profile of|details of)\b/.test(lowerMessage)) {
    return {
      intent: 'CLARIFICATION',
      query: {},
      clarification: 'Which employee, department, or skill should I look up?',
      summary: 'ask for a directory search target',
    };
  }

  if (explicitDepartment && /\b(department|team|employees?)\b/.test(lowerMessage)) {
    return {
      intent: 'SEARCH_DEPARTMENT',
      query: { department: explicitDepartment },
      summary: `search employees in ${explicitDepartment}`,
    };
  }

  return {
    intent: 'CLARIFICATION',
    query: {},
    clarification: 'I can look up employees, departments, skills, or supported attendance information. What would you like to know?',
    summary: 'clarify an unsupported or ambiguous request',
  };
};

module.exports = {
  parseChatIntent,
  parseConversationalIntent,
  parseUnsupportedFeatureIntent,
  parseMonthOffset,
  extractSearchTerm,
  normalizeText,
};
