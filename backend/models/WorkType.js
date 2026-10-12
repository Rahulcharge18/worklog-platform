const mongoose = require('mongoose');

const WorkTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Work type name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false  // true for pre-seeded entries
  },
  order: {
    type: Number,
    default: 99
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkType', WorkTypeSchema);
