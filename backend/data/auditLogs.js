const auditLogs = [];

const recordAudit = ({ req, action, employee, description }) => {
  auditLogs.push({
    userId: req.user.id,
    userName: req.user.name,
    role: req.user.role,
    action,
    employeeId: employee?.employeeId || employee?.id || null,
    employeeName: employee?.name || null,
    department: employee?.department || null,
    description,
    timestamp: new Date().toISOString(),
    ipAddress: req.ip,
  });
};

module.exports = { auditLogs, recordAudit };
