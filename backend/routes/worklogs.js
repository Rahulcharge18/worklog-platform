const express = require('express');
const router = express.Router();
const Worklog = require('../models/Worklog');
const authMiddleware = require('../middleware/auth');

// Helper to format local date without UTC shift
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get start and end date based on timeframe
const getDateRange = (timeframe, customStart, customEnd) => {
  if (timeframe === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }

  const today = new Date();
  
  if (timeframe === 'day') {
    const dateStr = formatLocalDate(today);
    return { start: dateStr, end: dateStr };
  } else if (timeframe === 'week') {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: formatLocalDate(monday), end: formatLocalDate(sunday) };
  } else if (timeframe === 'month') {
    const year = today.getFullYear();
    const month = today.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return { start: formatLocalDate(startDate), end: formatLocalDate(endDate) };
  } else if (timeframe === 'year') {
    const year = today.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    return { start: formatLocalDate(startDate), end: formatLocalDate(endDate) };
  } else {
    // Default to month
    const year = today.getFullYear();
    const month = today.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return { start: formatLocalDate(startDate), end: formatLocalDate(endDate) };
  }
};

// @route   GET api/worklogs
// @desc    Get worklogs for current user (optionally filtered by startDate and endDate)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let query = { userId: req.userId };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  try {
    const logs = await Worklog.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/worklogs
// @desc    Create or update a worklog for a specific date
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
  const { date, jiraHours, adhocExcelHours, detailedLogs } = req.body;

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  let parsedJira = parseFloat(jiraHours) || 0;
  let parsedAdhoc = parseFloat(adhocExcelHours) || 0;

  // Automatically calculate jira and adhoc hours if detailedLogs are provided
  if (detailedLogs && Array.isArray(detailedLogs) && detailedLogs.length > 0) {
    let calcJira = 0;
    let calcExcel = 0;
    detailedLogs.forEach(task => {
      const hrs = parseFloat(task.hours) || 0;
      if (task.category === 'Jira') {
        calcJira += hrs;
      } else {
        calcExcel += hrs;
      }
    });
    parsedJira = Math.round(calcJira * 100) / 100;
    parsedAdhoc = Math.round(calcExcel * 100) / 100;
  }

  try {
    // Find existing log for the user and date
    let worklog = await Worklog.findOne({ userId: req.userId, date });

    if (worklog) {
      // Update existing
      worklog.jiraHours = parsedJira;
      worklog.adhocExcelHours = parsedAdhoc;
      worklog.detailedLogs = detailedLogs || [];
    } else {
      // Create new
      worklog = new Worklog({
        userId: req.userId,
        date,
        jiraHours: parsedJira,
        adhocExcelHours: parsedAdhoc,
        detailedLogs: detailedLogs || []
      });
    }

    await worklog.save();
    res.json(worklog);

  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/worklogs/stats
// @desc    Get aggregated stats for dashboard (filtered by timeframe or custom date range)
// @access  Private
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { timeframe = 'month', startDate: customStart, endDate: customEnd } = req.query;
    const { start, end } = getDateRange(timeframe, customStart, customEnd);

    const logs = await Worklog.find({
      userId: req.userId,
      date: { $gte: start, $lte: end }
    });

    let totalHours = 0;
    let jiraHours = 0;
    let adhocExcelHours = 0;
    let overtimeHours = 0;
    let overtimeDays = 0;
    let activities = {};
    let categoryBreakdown = { Jira: 0, Excel: 0 };

    logs.forEach(log => {
      totalHours += log.totalHours;
      jiraHours += log.jiraHours;
      adhocExcelHours += log.adhocExcelHours;

      categoryBreakdown.Jira += log.jiraHours;
      categoryBreakdown.Excel += log.adhocExcelHours;

      // Overtime calculation (> 8 hours)
      if (log.totalHours > 8) {
        overtimeDays += 1;
        overtimeHours += (log.totalHours - 8);
      }

      // Activities breakdown
      log.detailedLogs.forEach(detail => {
        if (!activities[detail.workTypeName]) {
          activities[detail.workTypeName] = 0;
        }
        activities[detail.workTypeName] += detail.hours;
      });
    });

    res.json({
      timeframe,
      startDate: start,
      endDate: end,
      totalHours: Math.round(totalHours * 100) / 100,
      jiraHours: Math.round(jiraHours * 100) / 100,
      adhocExcelHours: Math.round(adhocExcelHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      overtimeDays,
      daysLogged: logs.length,
      activities,
      categoryBreakdown: {
        Jira: Math.round(categoryBreakdown.Jira * 100) / 100,
        Excel: Math.round(categoryBreakdown.Excel * 100) / 100
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
