const { formatDateKey } = require('./attendanceCalculator');

const getEligibleWorkingDates = ({ month, policy, employee, now = new Date() }) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const today = formatDateKey(now, policy.timezone);
  const lastEligibleDay = month === today.slice(0, 7)
    ? Number(today.slice(8, 10))
    : daysInMonth;
  const employmentStart = employee.joiningDate
    ? formatDateKey(new Date(employee.joiningDate), policy.timezone)
    : `${month}-01`;

  return Array.from({ length: Math.max(0, lastEligibleDay) }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const weekday = new Date(Date.UTC(year, monthNumber - 1, index + 1)).getUTCDay();
    const holiday = policy.holidays.some((item) => item.date === date);
    return date >= employmentStart && policy.workingDays.includes(weekday) && !holiday ? date : null;
  }).filter(Boolean);
};

const calculateAttendancePercentage = ({ records, eligibleWorkingDates }) => {
  const recordsByDate = new Map(records.map((record) => [record.date, record]));
  const presentEquivalentDays = eligibleWorkingDates.reduce((sum, date) => {
    const record = recordsByDate.get(date);
    if (!record) return sum;
    if (record.status === 'HALF_DAY') return sum + 0.5;
    if (record.checkIn || ['PRESENT', 'LATE', 'WORK_FROM_HOME', 'CORRECTION_APPROVED'].includes(record.status)) {
      return sum + 1;
    }
    return sum;
  }, 0);
  const attendancePercentage = eligibleWorkingDates.length
    ? Math.round((presentEquivalentDays / eligibleWorkingDates.length) * 10000) / 100
    : 0;

  return {
    workingDays: eligibleWorkingDates.length,
    presentEquivalentDays,
    attendancePercentage,
  };
};

module.exports = { calculateAttendancePercentage, getEligibleWorkingDates };
