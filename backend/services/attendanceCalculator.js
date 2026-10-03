const datePartsInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
};

const timePartsInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { hour: Number(values.hour), minute: Number(values.minute) };
};

const formatDateKey = (date, timeZone) => {
  const { year, month, day } = datePartsInZone(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const dateKeyWeekday = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const zonedDateTimeToUtc = (dateKey, time, timeZone) => {
  if (!isValidDateKey(dateKey) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Invalid local date or time.');
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetAsUtc;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const localDate = formatDateKey(new Date(candidate), timeZone);
    const localTime = timePartsInZone(new Date(candidate), timeZone);
    const [localYear, localMonth, localDay] = localDate.split('-').map(Number);
    const representedAsUtc = Date.UTC(localYear, localMonth - 1, localDay, localTime.hour, localTime.minute);
    const adjustment = targetAsUtc - representedAsUtc;
    if (adjustment === 0) break;
    candidate += adjustment;
  }

  return new Date(candidate);
};

const minutesOfDayInZone = (date, timeZone) => {
  const { hour, minute } = timePartsInZone(date, timeZone);
  return hour * 60 + minute;
};

const scheduleForDate = (dateKey, policy) => {
  const [startHour, startMinute] = policy.startTime.split(':').map(Number);
  const [endHour, endMinute] = policy.endTime.split(':').map(Number);
  const scheduledSpan = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (scheduledSpan <= 0 || scheduledSpan <= policy.breakDurationMinutes) {
    throw new Error('Attendance policy must have an end time after start time and a shorter break.');
  }
  return {
    start: zonedDateTimeToUtc(dateKey, policy.startTime, policy.timezone),
    end: zonedDateTimeToUtc(dateKey, policy.endTime, policy.timezone),
    scheduledWorkMinutes: scheduledSpan - policy.breakDurationMinutes,
  };
};

const calculateCheckIn = (timestamp, dateKey, policy) => {
  const schedule = scheduleForDate(dateKey, policy);
  const lateMinutes = Math.max(0, Math.floor((timestamp.getTime() - schedule.start.getTime()) / 60000));
  const isLate = lateMinutes > policy.lateThresholdMinutes;
  return {
    scheduledStartTime: policy.startTime,
    scheduledEndTime: policy.endTime,
    lateMinutes,
    isLate,
    status: isLate ? 'LATE' : 'PRESENT',
  };
};

const calculateCheckOut = (checkIn, checkOut, policy) => {
  const rawMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
  if (rawMinutes < 0) throw new Error('Checkout cannot be earlier than check-in.');
  const workingMinutes = Math.max(0, rawMinutes - (rawMinutes > policy.breakDurationMinutes ? policy.breakDurationMinutes : 0));
  const schedule = scheduleForDate(formatDateKey(checkIn, policy.timezone), policy);
  const overtimeMinutes = Math.max(0, workingMinutes - schedule.scheduledWorkMinutes);
  const earlyCheckoutMinutes = Math.max(0, Math.floor((schedule.end.getTime() - checkOut.getTime()) / 60000));
  const isHalfDay = workingMinutes < policy.halfDayThresholdMinutes;

  return {
    workingMinutes,
    overtimeMinutes: overtimeMinutes > policy.overtimeThresholdMinutes ? overtimeMinutes : 0,
    earlyCheckoutMinutes,
    isEarlyCheckout: earlyCheckoutMinutes > 0,
    isOvertime: overtimeMinutes > policy.overtimeThresholdMinutes,
    status: isHalfDay ? 'HALF_DAY' : undefined,
  };
};

const formatMinutes = (minutes = 0) => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  return `${Math.floor(safeMinutes / 60)}h ${String(safeMinutes % 60).padStart(2, '0')}m`;
};

module.exports = {
  calculateCheckIn,
  calculateCheckOut,
  dateKeyWeekday,
  formatDateKey,
  formatMinutes,
  isValidDateKey,
  minutesOfDayInZone,
  scheduleForDate,
  zonedDateTimeToUtc,
};
