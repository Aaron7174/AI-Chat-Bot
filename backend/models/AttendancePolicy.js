const mongoose = require('mongoose');

const attendancePolicySchema = new mongoose.Schema(
  {
    key: { type: String, default: 'company', unique: true, immutable: true },
    timezone: { type: String, default: 'Asia/Kolkata', required: true },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      validate: (days) => days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    },
    startTime: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, default: '18:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    breakDurationMinutes: { type: Number, default: 60, min: 0, max: 240 },
    lateThresholdMinutes: { type: Number, default: 10, min: 0, max: 240 },
    halfDayThresholdMinutes: { type: Number, default: 240, min: 0, max: 1440 },
    overtimeThresholdMinutes: { type: Number, default: 0, min: 0, max: 1440 },
    allowSelfServiceWfh: { type: Boolean, default: false },
    holidays: {
      type: [{ date: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ }, name: { type: String, trim: true, maxlength: 100 } }],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.AttendancePolicy || mongoose.model('AttendancePolicy', attendancePolicySchema);
