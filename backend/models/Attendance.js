const mongoose = require('mongoose');

const attendanceAuditEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'CHECK_IN',
        'CHECK_OUT',
        'CORRECTION_REQUEST',
        'CORRECTION_APPROVED',
        'CORRECTION_REJECTED',
        'STATUS_CHANGED',
      ],
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, trim: true, maxlength: 500 },
    source: { type: String, enum: ['WEB', 'CHATBOT', 'HR', 'ADMIN'], default: 'WEB' },
    ipAddress: { type: String, maxlength: 64 },
  },
  { _id: false },
);

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      immutable: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      immutable: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: {
      type: String,
      enum: [
        'PRESENT',
        'ABSENT',
        'LATE',
        'HALF_DAY',
        'ON_LEAVE',
        'HOLIDAY',
        'WEEK_OFF',
        'WORK_FROM_HOME',
        'COMP_OFF',
        'MISSED_CHECKOUT',
        'CORRECTION_PENDING',
        'CORRECTION_APPROVED',
        'CORRECTION_REJECTED',
      ],
      default: 'PRESENT',
    },
    checkIn: Date,
    checkOut: Date,
    checkInSource: { type: String, enum: ['WEB', 'CHATBOT'], default: 'WEB' },
    checkOutSource: { type: String, enum: ['WEB', 'CHATBOT'], default: 'WEB' },
    workingMinutes: { type: Number, min: 0, default: 0 },
    overtimeMinutes: { type: Number, min: 0, default: 0 },
    scheduledStartTime: { type: String, required: true },
    scheduledEndTime: { type: String, required: true },
    lateMinutes: { type: Number, min: 0, default: 0 },
    earlyCheckoutMinutes: { type: Number, min: 0, default: 0 },
    isLate: { type: Boolean, default: false },
    isEarlyCheckout: { type: Boolean, default: false },
    isOvertime: { type: Boolean, default: false },
    workMode: { type: String, enum: ['ONSITE', 'WFH'], default: 'ONSITE' },
    notes: { type: String, trim: true, maxlength: 500 },
    correctionRequested: { type: Boolean, default: false },
    correctionStatus: { type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], default: 'NONE' },
    correctionReason: { type: String, trim: true, maxlength: 500 },
    correctionPreviousStatus: { type: String, trim: true },
    requestedCheckIn: Date,
    requestedCheckOut: Date,
    correctionRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    auditEvents: { type: [attendanceAuditEventSchema], default: [] },
  },
  { timestamps: true },
);

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ userId: 1, date: -1 });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
