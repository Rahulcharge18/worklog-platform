const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Worklog = require('../models/Worklog');
const authMiddleware = require('../middleware/auth');

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

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
    // Default to today (day) if unspecified
    const dateStr = formatLocalDate(today);
    return { start: dateStr, end: dateStr };
  }
};

// @route   GET api/admin/stats
// @desc    Get aggregated stats for all users (filtered by timeframe or custom dates)
// @access  Private Admin
router.get('/stats', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { timeframe = 'day', startDate: customStart, endDate: customEnd } = req.query;
    const { start, end } = getDateRange(timeframe, customStart, customEnd);

    const logs = await Worklog.find({
      date: { $gte: start, $lte: end }
    }).populate('userId', 'email firstName lastName role');

    let totalHours = 0;
    let jiraHours = 0;
    let adhocExcelHours = 0;
    let overtimeHours = 0;
    let overtimeDays = 0;
    let activities = {};
    const userStatsMap = {};

    logs.forEach(log => {
      totalHours += log.totalHours;
      jiraHours += log.jiraHours;
      adhocExcelHours += log.adhocExcelHours;

      // Overtime calculation (> 8 hours)
      if (log.totalHours > 8) {
        overtimeDays += 1;
        overtimeHours += (log.totalHours - 8);
      }

      // User breakdown
      if (log.userId) {
        const userIdStr = log.userId._id.toString();
        const userEmail = log.userId.email;
        if (!userStatsMap[userIdStr]) {
          userStatsMap[userIdStr] = {
            id: userIdStr,
            email: userEmail,
            firstName: log.userId.firstName || '',
            lastName: log.userId.lastName || '',
            totalHours: 0,
            jiraHours: 0,
            adhocExcelHours: 0,
            overtimeHours: 0,
            overtimeDays: 0,
            activities: {},
            detailedLogs: []
          };
        }

        const u = userStatsMap[userIdStr];
        u.totalHours += log.totalHours;
        u.jiraHours += log.jiraHours;
        u.adhocExcelHours += log.adhocExcelHours;

        if (log.totalHours > 8) {
          u.overtimeDays += 1;
          u.overtimeHours += (log.totalHours - 8);
        }

        // Granular activities & detailed logs per user
        log.detailedLogs.forEach(detail => {
          if (!u.activities[detail.workTypeName]) {
            u.activities[detail.workTypeName] = 0;
          }
          u.activities[detail.workTypeName] += detail.hours;

          u.detailedLogs.push({
            date: log.date,
            workTypeName: detail.workTypeName,
            category: detail.category || 'Jira',
            description: detail.description || '',
            hours: detail.hours
          });
        });

        // Round user numbers
        u.totalHours = Math.round(u.totalHours * 100) / 100;
        u.jiraHours = Math.round(u.jiraHours * 100) / 100;
        u.adhocExcelHours = Math.round(u.adhocExcelHours * 100) / 100;
        u.overtimeHours = Math.round(u.overtimeHours * 100) / 100;
        u.isAbnormal = u.adhocExcelHours > 3 || u.totalHours < 7;
      }

      // Global Activities breakdown
      log.detailedLogs.forEach(detail => {
        if (!activities[detail.workTypeName]) {
          activities[detail.workTypeName] = 0;
        }
        activities[detail.workTypeName] += detail.hours;
      });
    });

    const usersArray = Object.values(userStatsMap);

    res.json({
      timeframe,
      startDate: start,
      endDate: end,
      totalHours: Math.round(totalHours * 100) / 100,
      jiraHours: Math.round(jiraHours * 100) / 100,
      adhocExcelHours: Math.round(adhocExcelHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      overtimeDays,
      activities,
      categoryBreakdown: {
        Jira: Math.round(jiraHours * 100) / 100,
        Excel: Math.round(adhocExcelHours * 100) / 100
      },
      users: usersArray
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
