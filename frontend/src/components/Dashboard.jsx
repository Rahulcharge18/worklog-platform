import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCharts from './StatCharts.jsx';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5050/api');

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('day'); // Default to Today
  
  // Custom date range states
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState(thirtyDaysAgo);
  const [customEnd, setCustomEnd] = useState(todayStr);

  const [expandedLogId, setExpandedLogId] = useState(null);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      let statsUrl = `${API_URL}/worklogs/stats?timeframe=${timeframe}`;
      if (timeframe === 'custom') {
        statsUrl += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const statsRes = await fetch(statsUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!statsRes.ok) throw new Error('Failed to fetch analytics stats');
      const rawStats = await statsRes.json();

      const statsData = (rawStats[timeframe] && typeof rawStats[timeframe] === 'object')
        ? { ...rawStats[timeframe], timeframe }
        : rawStats;

      const startDate = statsData.startDate || customStart;
      const endDate = statsData.endDate || customEnd;

      // Fetch logs for the same date range
      const logsRes = await fetch(`${API_URL}/worklogs?startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!logsRes.ok) throw new Error('Failed to fetch recent logs');
      const logsData = await logsRes.json();

      setStats(statsData);
      setRecentLogs(logsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe !== 'custom') {
      fetchDashboardData();
    }
  }, [timeframe]);

  const handleApplyCustomFilter = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    fetchDashboardData();
  };

  const handleEditLog = (date) => {
    navigate(`/log?date=${date}`);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Gain insights into your work.io time logging, Jira tracking, and activity distribution</p>
        </div>
        
        {/* Time Period Filter & Custom Dates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ marginRight: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
              Time Period:
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '0.5rem 0.8rem', fontSize: '0.88rem' }}
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Pickers with Explicit Submit Button */}
          {timeframe === 'custom' && (
            <form onSubmit={handleApplyCustomFilter} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                value={customStart}
                max={customEnd || todayStr}
                onChange={(e) => setCustomStart(e.target.value)}
                required
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                value={customEnd}
                min={customStart}
                max={todayStr}
                onChange={(e) => setCustomEnd(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: 'auto', padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}
              >
                Apply Filter
              </button>
            </form>
          )}
        </div>
      </div>

      {error && <div className="alert-banner alert-error"><span>{error}</span></div>}

      {/* KPI Stats Summary Row */}
      {stats && (() => {
        const totalHours = stats.totalHours || 0;
        const daysLogged = stats.daysLogged ?? recentLogs.length;
        const jiraHours = stats.jiraHours || 0;
        const adhocHours = stats.adhocExcelHours || 0;
        const overtimeHours = stats.overtimeHours || 0;
        const overtimeDays = stats.overtimeDays || 0;
        const avgPerDay = daysLogged > 0 ? Math.round((totalHours / daysLogged) * 10) / 10 : 0;

        return (
          <div className="stats-cards-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div className="stat-mini-card glass-panel glass-panel-hover">
              <span className="stat-mini-label">Total Recorded Hours</span>
              <span className="stat-mini-value" style={{ color: 'var(--primary-color)' }}>
                {totalHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
              </span>
              <span className="stat-mini-subtext">Across {daysLogged} working day(s)</span>
            </div>

            <div className="stat-mini-card glass-panel glass-panel-hover">
              <span className="stat-mini-label">Jira Tracked Hours</span>
              <span className="stat-mini-value" style={{ color: 'var(--primary-color)' }}>
                {jiraHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
              </span>
              <span className="stat-mini-subtext">
                {totalHours > 0 ? `${Math.round((jiraHours / totalHours) * 100)}% of total hours` : '0%'}
              </span>
            </div>

            <div className="stat-mini-card glass-panel glass-panel-hover">
              <span className="stat-mini-label">Excel Tracked Hours</span>
              <span className="stat-mini-value" style={{ color: 'var(--secondary-color)' }}>
                {adhocHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
              </span>
              <span className="stat-mini-subtext">
                {totalHours > 0 ? `${Math.round((adhocHours / totalHours) * 100)}% of total hours` : '0%'}
              </span>
            </div>

            <div className="stat-mini-card glass-panel glass-panel-hover">
              <span className="stat-mini-label">Overtime Hours</span>
              <span className="stat-mini-value" style={{ color: overtimeHours > 0 ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                {overtimeHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
              </span>
              <span className="stat-mini-subtext">
                {overtimeDays > 0 ? `Logged across ${overtimeDays} day(s) (>8h/day)` : 'No overtime recorded'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Doughnut & Pie Charts */}
      <StatCharts stats={stats} />

      {/* Recent Logs Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Logged Activity History ({timeframe === 'custom' ? `${customStart} to ${customEnd}` : timeframe.toUpperCase()})
        </h3>

        {recentLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No worklogs recorded in this time range. Click 'Log Hours' in the sidebar to add your first entry!
          </div>
        ) : (
          <div className="recent-logs-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentLogs.map((log) => {
              const hasDetails = log.detailedLogs && log.detailedLogs.length > 0;
              const isExpanded = expandedLogId === log._id;
              const isAbnormal = log.adhocExcelHours > 3 || log.totalHours < 7;

              return (
                <div key={log._id} style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: isAbnormal ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid var(--border-glass)',
                  background: isAbnormal ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.015)'
                }}>
                  {/* Log summary row */}
                  <div className="recent-log-item" style={{ border: 'none', borderRadius: 0, padding: '0.85rem 1.25rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span className="log-date" style={{ fontSize: '0.95rem' }}>{log.date}</span>
                        {hasDetails && (
                          <span
                            onClick={() => setExpandedLogId(isExpanded ? null : log._id)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.5rem',
                              background: 'rgba(20,184,166,0.12)',
                              color: 'var(--secondary-color)',
                              border: '1px solid rgba(20,184,166,0.25)',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              userSelect: 'none',
                              fontWeight: '600'
                            }}
                          >
                            📋 {log.detailedLogs.length} task(s) {isExpanded ? '▲' : '▼'}
                          </span>
                        )}
                        {isAbnormal && (
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: 'var(--error-color)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '20px',
                            fontWeight: '700'
                          }}>
                            🚨 {log.adhocExcelHours > 3 ? 'Excel > 3h ' : ''}{log.totalHours < 7 ? 'Total < 7h' : ''}
                          </span>
                        )}
                      </div>
                      <div className="log-breakdown" style={{ marginTop: '0.2rem' }}>
                        Jira: <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>{log.jiraHours}h</span> &nbsp;|&nbsp;
                        Excel: <span style={{ color: 'var(--secondary-color)', fontWeight: '600' }}>{log.adhocExcelHours}h</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="log-total-hours" style={{ fontSize: '1.05rem', color: isAbnormal ? 'var(--error-color)' : 'inherit' }}>
                        {log.totalHours} hrs
                      </span>
                      <button
                        onClick={() => handleEditLog(log.date)}
                        className="btn-secondary"
                        style={{
                          padding: '0.35rem 0.8rem',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Edit this log"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Expandable detailed tasks */}
                  {isExpanded && hasDetails && (
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-glass)' }}>
                      {log.detailedLogs.map((task, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.4rem 0',
                          borderBottom: idx < log.detailedLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          fontSize: '0.85rem'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                              padding: '0.12rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              background: task.category === 'Jira' ? 'rgba(99,102,241,0.18)' : 'rgba(20,184,166,0.18)',
                              color: task.category === 'Jira' ? 'var(--primary-color)' : 'var(--secondary-color)'
                            }}>
                              {task.category || 'Jira'}
                            </span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {task.workTypeName}
                            </span>
                            {task.description && (
                              <span style={{ color: 'var(--text-secondary)' }}>
                                — {task.description}
                              </span>
                            )}
                          </span>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)', minWidth: '45px', textAlign: 'right' }}>
                            {task.hours}h
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
