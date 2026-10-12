const mongoose = require('mongoose');

const DetailedLogSchema = new mongoose.Schema({
  workTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkType',
    required: [true, 'Work type is required']
  },
  workTypeName: {
    type: String,
    required: [true, 'Work type name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Jira', 'Excel'],
    default: 'Jira',
    required: [true, 'Category (Jira or Excel) is required']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  hours: {
    type: Number,
    required: [true, 'Task hours are required'],
    min: [0.1, 'Hours must be greater than 0'],
    max: [24, 'Hours cannot exceed 24']
  }
});

const WorklogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Store as 'YYYY-MM-DD'
    required: [true, 'Date is required']
  },
  jiraHours: {
    type: Number,
    required: [true, 'Jira hours are required'],
    min: [0, 'Hours cannot be negative'],
    max: [24, 'Hours cannot exceed 24']
  },
  adhocExcelHours: {
    type: Number,
    required: [true, 'Adhoc Excel hours are required'],
    min: [0, 'Hours cannot be negative'],
    max: [24, 'Hours cannot exceed 24']
  },
  totalHours: {
    type: Number,
    required: true
  },
  detailedLogs: [DetailedLogSchema]
}, {
  timestamps: true
});

// Ensure a user can only have one worklog entry per date
WorklogSchema.index({ userId: 1, date: 1 }, { unique: true });

// Auto-compute totalHours and validate
WorklogSchema.pre('validate', function () {
  this.jiraHours = Math.round((this.jiraHours || 0) * 100) / 100;
  this.adhocExcelHours = Math.round((this.adhocExcelHours || 0) * 100) / 100;
  this.totalHours = Math.round((this.jiraHours + this.adhocExcelHours) * 100) / 100;

  if (this.totalHours > 24) {
    this.invalidate('totalHours', 'Total hours cannot exceed 24 in a single day.', this.totalHours);
  }
});

module.exports = mongoose.model('Worklog', WorklogSchema);
