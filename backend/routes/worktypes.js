const express = require('express');
const router = express.Router();
const WorkType = require('../models/WorkType');
const Worklog = require('../models/Worklog');
const authMiddleware = require('../middleware/auth');

// @route   GET /api/worktypes
// @desc    Get all active work types
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const workTypes = await WorkType.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json(workTypes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/worktypes/all
// @desc    Get all work types including inactive (for masters management)
// @access  Private
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const workTypes = await WorkType.find().sort({ order: 1, name: 1 });
    res.json(workTypes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/worktypes
// @desc    Create a new work type
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Work type name is required' });
  }

  try {
    // Check for duplicate
    const existing = await WorkType.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: `Work type "${name}" already exists` });
    }

    const workType = new WorkType({
      name: name.trim(),
      description: (description || '').trim(),
      isDefault: false
    });

    await workType.save();
    res.status(201).json(workType);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/worktypes/:id
// @desc    Update a work type
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, description, isActive } = req.body;

  try {
    const workType = await WorkType.findById(req.params.id);
    if (!workType) {
      return res.status(404).json({ message: 'Work type not found' });
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== workType.name) {
      const existing = await WorkType.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({ message: `Work type "${name}" already exists` });
      }
      workType.name = name.trim();
    }

    if (description !== undefined) workType.description = description.trim();
    if (isActive !== undefined) workType.isActive = isActive;

    await workType.save();
    res.json(workType);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/worktypes/:id
// @desc    Delete a work type (soft-delete if used in logs, hard-delete otherwise)
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const workType = await WorkType.findById(req.params.id);
    if (!workType) {
      return res.status(404).json({ message: 'Work type not found' });
    }

    if (workType.isDefault) {
      return res.status(400).json({ message: 'Default work types cannot be deleted. You can deactivate them instead.' });
    }

    // Check if used in any worklog detail
    const usageCount = await Worklog.countDocuments({ 'detailedLogs.workTypeId': req.params.id });

    if (usageCount > 0) {
      // Soft delete — just deactivate
      workType.isActive = false;
      await workType.save();
      return res.json({ message: `Work type deactivated (used in ${usageCount} log(s))`, workType });
    }

    // Hard delete
    await WorkType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Work type deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
