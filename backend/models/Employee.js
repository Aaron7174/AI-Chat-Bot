const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    joiningDate: {
      type: Date,
    },
    employmentStatus: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'],
      default: 'ACTIVE',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'DELETED'],
      default: 'ACTIVE',
    },
    category: {
      type: String,
      trim: true,
    },
    skills: [{ type: String, trim: true }],
    experience: {
      type: String,
      trim: true,
    },
    salary: {
      type: Number,
      default: 0,
    },
    manager: {
      type: String,
      trim: true,
    },
    projects: [{ type: String, trim: true }],
    photo: {
      type: String,
      trim: true,
    },
    attendance: {
      presentDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 },
    },
    leave: {
      totalLeaves: { type: Number, default: 0 },
      usedLeaves: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

employeeSchema.index({ department: 1, status: 1 });
employeeSchema.index({ location: 1, status: 1 });
employeeSchema.index({ role: 1 });
employeeSchema.index({ skills: 1 });
employeeSchema.index({ email: 1, employeeId: 1 });

module.exports = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
