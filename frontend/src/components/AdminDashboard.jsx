import React, { useState, useEffect } from 'react';
import StatCharts from './StatCharts.jsx';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5050/api');

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('day'); // Default to Today as requested
  
  // Custom date range states
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState(thirtyDaysAgo);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Abnormal filter toggle ("show abnormal worklog user easily")
  const [showAbnormalOnly, setShowAbnormalOnly] = useState(false);

  // Expandable user details
  const [expandedUserId, setExpandedUserId] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      let url = `${API_URL}/admin/stats?timeframe=${timeframe}`;
      if (timeframe === 'custom') {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch admin stats');
      }
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeframe !== 'custom') {
      fetchAdminData();
    }
  }, [timeframe]);

  const handleApplyCustomFilter = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    fetchAdminData();
  };

  const usersList = stats?.users || [];
  const abnormalCount = usersList.filter(u => u.isAbnormal).length;
  const filteredUsers = showAbnormalOnly
    ? usersList.filter(u => u.isAbnormal)
    : usersList;

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '2.5rem' }}>
      
      {/* Header & Global Time Period / Custom Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-color)' }}>Superadmin Control Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Monitor global team activity, Jira vs. Excel distribution, and easily spot abnormal worklogs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ marginRight: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
              Global Time Period:
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '0.5rem 0.8rem', fontSize: '0.88rem' }}
            >
              <option value="day">Today (Default)</option>
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

      {loading && !stats ? (
        <div className="flex-center" style={{ padding: '4rem 0' }}>
          <div className="spinner"></div>
        </div>
      ) : stats && (
        <>
          {/* Superadmin KPI Summary Cards */}
          <div className="stats-cards-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div className="stat-mini-card glass-panel glass-panel-hover">
              <span className="stat-mini-label">Global Total Hours</span>
              <span className="stat-mini-value" style={{ color: 'var(--primary-color)' }}>
                {stats.totalHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
              </span>
              <span className="stat-mini-subtext">Across {usersList.length} active user(s)</span>
            </div>

            <div className="stat-mini-card glass-panel glass-panel-hover">
              <span className="stat-mini-label">Total Overtime Hours</span>
              <span className="stat-mini-value" style={{ color: stats.overtimeHours > 0 ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                {stats.overtimeHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
              </span>
              <span className="stat-mini-subtext">
                {stats.overtimeDays > 0 ? `Logged across ${stats.overtimeDays} overtime day(s)` : 'No overtime logged'}
              </span>
            </div>

            <div className="stat-mini-card glass-panel glass-panel-hover">
              <span className="stat-mini-label">Jira Tracked Split</span>
              <span className="stat-mini-value" style={{ color: 'var(--primary-color)' }}>
                {stats.jiraHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
              </span>
              <span className="stat-mini-subtext">
                {stats.totalHours > 0 ? `${Math.round((stats.jiraHours / stats.totalHours) * 100)}% of global hours` : '0%'}
              </span>
            </div>

            <div className="stat-mini-card glass-panel glass-panel-hover" style={{
              background: abnormalCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.015)',
              borderColor: abnormalCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-glass)'
            }}>
              <span className="stat-mini-label">Abnormal Worklogs</span>
              <span className="stat-mini-value" style={{ color: abnormalCount > 0 ? 'var(--error-color)' : 'var(--success-color)' }}>
                {abnormalCount} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>user(s)</span>
              </span>
              <span className="stat-mini-subtext">Excel &gt; 3h or Total &lt; 7h</span>
            </div>
          </div>

          {/* Activity Breakdown & Jira vs Excel Doughnut Charts with Color Bifurcation */}
          <StatCharts stats={stats} />

          {/* Admin User Table with Abnormal Highlighting & Toggle */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 010 7.75"></path>
                  </svg>
                  User Worklog Audit Table ({timeframe === 'custom' ? `${customStart} to ${customEnd}` : timeframe.toUpperCase()})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Thresholds: Excel hours should not exceed 3h | Total hours should not be less than 7h
                </p>
              </div>

              {/* Abnormal Filter Toggle Button */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAbnormalOnly(!showAbnormalOnly)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: showAbnormalOnly ? '1px solid var(--error-color)' : '1px solid var(--border-glass)',
                    background: showAbnormalOnly ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: showAbnormalOnly ? '#fff' : 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>🚨</span>
                  <span>{showAbnormalOnly ? 'Showing Abnormal Only' : 'Show Abnormal Worklogs Only'}</span>
                  {abnormalCount > 0 && (
                    <span style={{
                      background: 'var(--error-color)',
                      color: '#fff',
                      padding: '0.1rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      {abnormalCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="masters-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Official Outlook Account / Name</th>
                    <th>Total Hrs</th>
                    <th>Jira Hrs</th>
                    <th>Excel Hrs</th>
                    <th>Activity Bifurcation (Hours wise)</th>
                    <th>Audit Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {showAbnormalOnly
                          ? '🎉 No abnormal user worklogs found! All active users match the required thresholds (Total >= 7h and Excel <= 3h).'
                          : 'No user worklogs recorded in this time range.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.sort((a, b) => b.totalHours - a.totalHours).map((u) => {
                      const isAbnormal = u.isAbnormal;
                      const isExpanded = expandedUserId === u.id;
                      const activitiesList = Object.entries(u.activities || {}).sort((a, b) => b[1] - a[1]);

                      return (
                        <React.Fragment key={u.id}>
                          <tr style={{
                            background: isAbnormal ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                            borderLeft: isAbnormal ? '4px solid var(--error-color)' : '4px solid transparent'
                          }}>
                            <td className="td-name">
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}` : u.email.split('@')[0]}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {u.email}
                              </div>
                            </td>

                            {/* Total Hours (< 7 highlighted in red) */}
                            <td>
                              <span style={{
                                fontWeight: '700',
                                color: u.totalHours < 7 ? 'var(--error-color)' : 'var(--text-primary)',
                                background: u.totalHours < 7 ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px'
                              }}>
                                {u.totalHours}h
                              </span>
                            </td>

                            {/* Jira Hours */}
                            <td>
                              <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                                {u.jiraHours}h
                              </span>
                            </td>

                            {/* Excel Hours (> 3 highlighted in red) */}
                            <td>
                              <span style={{
                                fontWeight: '700',
                                color: u.adhocExcelHours > 3 ? 'var(--error-color)' : 'var(--secondary-color)',
                                background: u.adhocExcelHours > 3 ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px'
                              }}>
                                {u.adhocExcelHours}h
                              </span>
                            </td>

                            {/* Activity Bifurcation (Hours wise) */}
                            <td>
                              {activitiesList.length === 0 ? (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                  {activitiesList.map(([actName, hrs], idx) => (
                                    <span key={idx} style={{
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      background: 'rgba(255,255,255,0.06)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-glass)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem'
                                    }}>
                                      <span>{actName}:</span>
                                      <strong style={{ color: 'var(--secondary-color)' }}>{hrs}h</strong>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Audit Status Tag */}
                            <td>
                              {isAbnormal ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                  <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.25)', color: 'var(--error-color)', fontWeight: '700' }}>
                                    🚨 Abnormal Entry
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--error-color)' }}>
                                    {u.adhocExcelHours > 3 ? '• Excel > 3h ' : ''}{u.totalHours < 7 ? '• Total < 7h' : ''}
                                  </span>
                                </div>
                              ) : (
                                <span className="badge badge-active">
                                  ✓ Normal
                                </span>
                              )}
                            </td>

                            {/* Actions: View Detailed Logs */}
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.8rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: isExpanded ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                  borderColor: isExpanded ? 'var(--primary-color)' : 'var(--border-glass)'
                                }}
                                onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                              >
                                <span>📋 Detailed Logs</span>
                                <span>{isExpanded ? '▲' : '▼'}</span>
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Detailed Activity Logs Row for Admin */}
                          {isExpanded && (
                            <tr style={{ background: 'rgba(0, 0, 0, 0.35)' }}>
                              <td colSpan="7" style={{ padding: '1rem 1.5rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <strong style={{ color: 'var(--primary-color)' }}>
                                      Detailed Task Audit for {u.email} ({u.detailedLogs.length} task(s))
                                    </strong>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      Period: {timeframe === 'custom' ? `${customStart} to ${customEnd}` : timeframe.toUpperCase()}
                                    </span>
                                  </div>

                                  {u.detailedLogs.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                      No task descriptions recorded.
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '250px', overflowY: 'auto' }}>
                                      {u.detailedLogs.map((task, tIdx) => (
                                        <div key={tIdx} style={{
                                          display: 'grid',
                                          gridTemplateColumns: '110px 80px 180px 1fr 60px',
                                          gap: '0.75rem',
                                          alignItems: 'center',
                                          padding: '0.5rem 0.75rem',
                                          background: 'rgba(255,255,255,0.03)',
                                          borderRadius: '8px',
                                          border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                                            📅 {task.date}
                                          </span>
                                          <span>
                                            <span style={{
                                              padding: '0.1rem 0.5rem',
                                              borderRadius: '4px',
                                              fontSize: '0.72rem',
                                              fontWeight: '700',
                                              background: task.category === 'Jira' ? 'rgba(99,102,241,0.2)' : 'rgba(20,184,166,0.2)',
                                              color: task.category === 'Jira' ? 'var(--primary-color)' : 'var(--secondary-color)'
                                            }}>
                                              {task.category || 'Jira'}
                                            </span>
                                          </span>
                                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                            {task.workTypeName}
                                          </span>
                                          <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {task.description || <em style={{ color: 'var(--text-muted)' }}>No description provided</em>}
                                          </span>
                                          <span style={{ fontWeight: '700', color: 'var(--text-primary)', textAlign: 'right' }}>
                                            {task.hours}h
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
