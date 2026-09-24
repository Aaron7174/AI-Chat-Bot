const {
  getAllEmployees,
  getEmployeesByCategory,
  getEmployeesByDepartment,
  getEmployeeById,
  searchEmployeesByName,
  searchEmployees,
  getDepartmentSummary,
  getDepartmentStats,
} = require('../services/employeeService');

const departmentMap = {
  hr: 'HR',
  humanresources: 'HR',
  finance: 'Finance',
  marketing: 'Marketing',
  sales: 'Sales',
  operations: 'Operations',
  admin: 'Admin',
  it: 'IT',
};

const normalizeMessage = (message) => message.trim().toLowerCase();

const suggestions = [
  'Show today\'s company summary',
  'Find employees with React skills',
  'Give me an IT department summary',
  'How many employees are in Chennai?',
];

const extractDepartment = (message) => {
  const lowerMessage = normalizeMessage(message);

  for (const key of Object.keys(departmentMap)) {
    if (lowerMessage.includes(key)) {
      return departmentMap[key];
    }
  }

  return null;
};

const handleChatRequest = (req, res) => {
  try {
    const message = req.body && req.body.message ? req.body.message : '';

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid question.',
      });
    }

    const lowerMessage = normalizeMessage(message);
    const allEmployees = getAllEmployees();

    if (lowerMessage.includes('company summary') || lowerMessage.includes('dashboard summary') || lowerMessage.includes('how many employees do we have')) {
      const itCount = getEmployeesByCategory('it').length;
      const nonITCount = getEmployeesByCategory('non-it').length;
      const departments = getDepartmentStats();
      return res.json({
        reply: 'Here is the current CompanyAI workforce snapshot.',
        type: 'statistics',
        data: departments,
        stats: [
          { label: 'Total employees', value: allEmployees.length },
          { label: 'IT employees', value: itCount },
          { label: 'Non-IT employees', value: nonITCount },
          { label: 'Departments', value: departments.length },
        ],
        employees: [],
        suggestions,
      });
    }

    const skillMatch = lowerMessage.match(/(?:with|know|knows|having)\s+([a-z0-9+#.\-/]+)\s+skills?/i)
      || lowerMessage.match(/(?:skill|skills)\s*:\s*([a-z0-9+#.\-/]+)/i);
    const knownSkills = [...new Set(allEmployees.flatMap((employee) => employee.skills))];
    const detectedSkill = skillMatch
      ? knownSkills.find((skill) => skill.toLowerCase() === skillMatch[1].toLowerCase())
      : knownSkills.find((skill) => lowerMessage.includes(skill.toLowerCase()));

    if (detectedSkill) {
      const results = searchEmployees({ skill: detectedSkill });
      return res.json({
        reply: `I found ${results.length} employees with ${detectedSkill} skills.`,
        type: 'employee_list',
        data: results,
        employees: results,
        suggestions,
      });
    }

    const knownLocations = [...new Set(allEmployees.map((employee) => employee.location))];
    const detectedLocation = knownLocations.find((location) => lowerMessage.includes(location.toLowerCase()));
    if (detectedLocation && (lowerMessage.includes('employee') || lowerMessage.includes('people') || lowerMessage.includes('staff') || lowerMessage.includes('how many'))) {
      const results = searchEmployees({ location: detectedLocation });
      return res.json({
        reply: `There are ${results.length} employees in ${detectedLocation}.`,
        type: 'employee_list',
        data: results,
        employees: results,
        suggestions,
      });
    }

    if (lowerMessage.includes('department summary') || lowerMessage.includes('department has the most')) {
      const department = extractDepartment(lowerMessage) || getDepartmentStats()[0].department;
      const summary = getDepartmentSummary(department);
      return res.json({
        reply: `${department} currently has ${summary.employees} employees with an average salary of ${summary.averageSalary}.`,
        type: 'department_summary',
        data: summary,
        employees: [],
        suggestions,
      });
    }

    if (
      lowerMessage.includes('show all employees') ||
      lowerMessage.includes('list employees') ||
      lowerMessage.includes('all employees') ||
      lowerMessage.includes('show everyone')
    ) {
      return res.json({
        reply: 'Here are all employees.',
        type: 'employee_list',
        data: allEmployees,
        employees: allEmployees,
        suggestions,
      });
    }

    if (
      (lowerMessage.includes('how many employees') || lowerMessage.includes('total employees')) &&
      !lowerMessage.includes('it') &&
      !lowerMessage.includes('non')
    ) {
      return res.json({
        reply: `There are ${allEmployees.length} employees in total.`,
        type: 'statistics',
        stats: [{ label: 'Total employees', value: allEmployees.length }],
        employees: [],
        suggestions,
      });
    }

    if (
      lowerMessage.includes('it employees') ||
      lowerMessage.includes('it staff') ||
      lowerMessage.includes('software developers') ||
      lowerMessage.includes('developers') ||
      lowerMessage.includes('who works in it') ||
      lowerMessage.includes('show it people') ||
      lowerMessage.includes('show it team')
    ) {
      const itEmployees = getEmployeesByCategory('it');
      return res.json({
        reply: `I found ${itEmployees.length} IT employees.`,
        type: 'employee_list',
        data: itEmployees,
        employees: itEmployees,
        suggestions,
      });
    }

    if (
      lowerMessage.includes('non it employees') ||
      lowerMessage.includes('non-it employees') ||
      lowerMessage.includes('non it') ||
      lowerMessage.includes('non-it') ||
      lowerMessage.includes('who works in hr') ||
      lowerMessage.includes('hr employees') ||
      lowerMessage.includes('finance employees') ||
      lowerMessage.includes('marketing employees') ||
      lowerMessage.includes('sales employees') ||
      lowerMessage.includes('admin employees') ||
      lowerMessage.includes('operations employees')
    ) {
      const department = extractDepartment(lowerMessage);

      if (department && department !== 'IT') {
        const results = getEmployeesByDepartment(department);
        return res.json({
          reply: `Here are the ${department} employees.`,
          type: 'employee_list',
          data: results,
          employees: results,
          suggestions,
        });
      }

      const nonITEmployees = getEmployeesByCategory('non-it');
      return res.json({
        reply: `I found ${nonITEmployees.length} non-IT employees.`,
        type: 'employee_list',
        data: nonITEmployees,
        employees: nonITEmployees,
        suggestions,
      });
    }

    if (
      lowerMessage.includes('how many it employees') ||
      lowerMessage.includes('how many it') ||
      lowerMessage.includes('count it employees') ||
      lowerMessage.includes('number of it employees')
    ) {
      const itEmployees = getEmployeesByCategory('it');
      return res.json({
        reply: `There are ${itEmployees.length} IT employees.`,
        type: 'statistics',
        stats: [{ label: 'IT employees', value: itEmployees.length }],
        employees: [],
        suggestions,
      });
    }

    if (
      lowerMessage.includes('how many non it employees') ||
      lowerMessage.includes('how many non-it employees') ||
      lowerMessage.includes('count non it employees') ||
      lowerMessage.includes('number of non it employees')
    ) {
      const nonITEmployees = getEmployeesByCategory('non-it');
      return res.json({
        reply: `There are ${nonITEmployees.length} non-IT employees.`,
        type: 'statistics',
        stats: [{ label: 'Non-IT employees', value: nonITEmployees.length }],
        employees: [],
        suggestions,
      });
    }

    const departmentQueryPatterns = [
      'employees in',
      'employees from',
      'show employees in',
      'show employees from',
      'who works in',
      'staff in',
      'people in',
    ];

    if (departmentQueryPatterns.some((pattern) => lowerMessage.includes(pattern))) {
      const detectedDepartment = extractDepartment(lowerMessage);

      if (detectedDepartment) {
        const results = getEmployeesByDepartment(detectedDepartment);
        return res.json({
          reply: `Here are the ${detectedDepartment} employees.`,
          type: 'employee_list',
          data: results,
          employees: results,
          suggestions,
        });
      }
    }

    const employeeNameMatch = lowerMessage.match(/(?:find|search|show|get|who is|who works in)\s+([a-zA-Z\s]+)/i);
    const nameQuery = employeeNameMatch ? employeeNameMatch[1].trim() : '';

    if ((lowerMessage.includes('find ') || lowerMessage.includes('search ') || lowerMessage.includes('show ') || lowerMessage.includes('who is ') || lowerMessage.includes('who works in ')) && nameQuery) {
      const matchResults = searchEmployeesByName(nameQuery);

      if (matchResults.length > 0) {
        return res.json({
          reply: `Employee found: ${matchResults[0].name}.`,
          type: 'employee_profile',
          data: matchResults,
          employees: matchResults,
          suggestions,
        });
      }
    }

    const idMatch = lowerMessage.match(/employee with id\s*(\d+)/i) || lowerMessage.match(/id\s*(\d+)/i);
    if (idMatch) {
      const employeeId = Number(idMatch[1]);
      const employee = getEmployeeById(employeeId);

      if (employee) {
        return res.json({
          reply: `Employee found: ${employee.name}.`,
          type: 'employee_profile',
          data: [employee],
          employees: [employee],
          suggestions,
        });
      }
    }

    return res.json({
      reply:
        "I'm sorry, I couldn't understand that request. You can ask me things like:\n- Show IT employees\n- Show non-IT employees\n- Find Aaron\n- How many IT employees?\n- Show HR employees",
      type: 'text',
      suggestions,
      employees: [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while processing the chat request.',
    });
  }
};

module.exports = {
  handleChatRequest,
};
