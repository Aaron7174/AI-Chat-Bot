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
    .replace(/['’]s\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return term.length >= 2 ? term : null;
};

const parseChatIntent = (message, departments = []) => {
  const originalMessage = String(message || '').trim();
  const lowerMessage = normalizeText(originalMessage);
  const explicitDepartment = findDepartment(lowerMessage, departments);
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
  if (/\b(attendance percentage|attendance rate|attendance this month|attendance history)\b|\b(show my attendance|my attendance)(?:\s+(?:this month|history))?[?.!]*$/.test(lowerMessage)) {
    return {
      intent: /\bpercentage|rate\b/.test(lowerMessage) ? 'ATTENDANCE_PERCENTAGE' : 'ATTENDANCE_HISTORY',
      query: { department: explicitDepartment },
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

  if (explicitDepartment && /\b(department|team|employees?)\b/.test(lowerMessage)) {
    return {
      intent: 'SEARCH_DEPARTMENT',
      query: { department: explicitDepartment },
      summary: `search employees in ${explicitDepartment}`,
    };
  }

  return { intent: 'UNKNOWN', query: {}, summary: 'unrecognized employee directory request' };
};

module.exports = {
  parseChatIntent,
  extractSearchTerm,
  normalizeText,
};
