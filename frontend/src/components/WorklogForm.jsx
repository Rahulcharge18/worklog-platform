import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5050/api');

export default function WorklogForm({ onLogSubmitted, initialDate = '' }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialDate || todayStr);
  const [detailedLogs, setDetailedLogs] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch active work types
  useEffect(() => {
    const fetchWorkTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/worktypes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWorkTypes(data);
        }
      } catch (err) {
        console.error('Error fetching work types:', err);
      }
    };
    fetchWorkTypes();
  }, []);

  // Sync initialDate prop
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  // Helper to create a default empty task
  const createDefaultTask = (typesList) => {
    const defaultType = typesList && typesList.length > 0 ? typesList[0] : { _id: null, name: 'Development' };
    return {
      _id: `temp_${Date.now()}_${Math.random()}`,
      workTypeId: defaultType._id,
      workTypeName: defaultType.name,
      category: 'Jira',
      description: '',
      hours: 1
    };
  };

  // Fetch existing log for selected date to pre-fill
  useEffect(() => {
    const fetchLogForDate = async () => {
      const token = localStorage.getItem('token');
      if (!token || !date) return;

      try {
        const response = await fetch(`${API_URL}/worklogs?startDate=${date}&endDate=${date}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const logs = await response.json();
          if (logs && logs.length > 0) {
            const log = logs[0];
            const existingDetails = (log.detailedLogs || []).map(d => ({
              ...d,
              category: d.category === 'Excel' || d.category === 'Adhoc Excel' ? 'Excel' : 'Jira',
              _id: d._id || `temp_${Date.now()}_${Math.random()}`
            }));
            setDetailedLogs(existingDetails.length > 0 ? existingDetails : [createDefaultTask(workTypes)]);
          } else {
            // Reset to default empty task if no log exists
            setDetailedLogs([createDefaultTask(workTypes)]);
          }
        }
      } catch (err) {
        console.error('Error fetching log for date:', err);
      }
    };

    fetchLogForDate();
  }, [date, workTypes]);

  // Auto-calculate summary totals from task rows
  const calculatedJira = detailedLogs.reduce((sum, task) => {
    return task.category === 'Jira' ? sum + (parseFloat(task.hours) || 0) : sum;
  }, 0);

  const calculatedExcel = detailedLogs.reduce((sum, task) => {
    return task.category === 'Excel' ? sum + (parseFloat(task.hours) || 0) : sum;
  }, 0);

  const totalHours = Math.round((calculatedJira + calculatedExcel) * 100) / 100;
  const jiraHoursFormatted = Math.round(calculatedJira * 100) / 100;
  const excelHoursFormatted = Math.round(calculatedExcel * 100) / 100;

  const handleAddTask = () => {
    setDetailedLogs([...detailedLogs, createDefaultTask(workTypes)]);
  };

  // Update a specific task field
  const handleUpdateTask = (id, field, value) => {
    const updated = detailedLogs.map(task => {
      if (task._id === id) {
        if (field === 'workTypeId') {
          const selectedType = workTypes.find(wt => wt._id === value);
          return { 
            ...task, 
            workTypeId: value, 
            workTypeName: selectedType ? selectedType.name : task.workTypeName 
          };
        }
        let val = value;
        if (field === 'hours') {
          val = parseFloat(value) || 0;
        }
        return { ...task, [field]: val };
      }
      return task;
    });
    setDetailedLogs(updated);
  };

  // Remove a task
  const handleRemoveTask = (id) => {
    const updated = detailedLogs.filter(task => task._id !== id);
    setDetailedLogs(updated.length > 0 ? updated : [createDefaultTask(workTypes)]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (totalHours === 0) {
      setError('Please log at least 1 task with valid hours.');
      return;
    }

    if (totalHours > 24) {
      setError('Total hours for a single day cannot exceed 24 hours.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        date,
        jiraHours: jiraHoursFormatted,
        adhocExcelHours: excelHoursFormatted,
        detailedLogs: detailedLogs.map(task => ({
          workTypeId: task.workTypeId,
          workTypeName: task.workTypeName,
          category: task.category,
          description: (task.description || '').trim(),
          hours: parseFloat(task.hours) || 0
        }))
      };

      const response = await fetch(`${API_URL}/worklogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit worklog');
      }

      setSuccess(`Worklog for ${date} saved successfully! (${totalHours} total hours recorded)`);
      if (onLogSubmitted) {
        onLogSubmitted(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="worklog-form-container glass-panel">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Log Work Hours</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Add tasks and select whether they are tracked in Jira or Excel
          </p>
        </div>
        <div>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '0.55rem 0.85rem', fontWeight: '600' }}
            value={date}
            max={todayStr}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert-banner alert-error"><span>{error}</span></div>}
      {success && <div className="alert-banner alert-success"><span>{success}</span></div>}

      {/* Auto-Calculated Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div className="glass-panel" style={{
          padding: '1rem 1.25rem',
          background: 'rgba(99, 102, 241, 0.08)',
          borderColor: 'rgba(99, 102, 241, 0.2)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', fontWeight: '600' }}>
            Jira Hours (Auto)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--primary-color)' }}>
            {jiraHoursFormatted} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
          </div>
        </div>

        <div className="glass-panel" style={{
          padding: '1rem 1.25rem',
          background: 'rgba(20, 184, 166, 0.08)',
          borderColor: 'rgba(20, 184, 166, 0.2)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', fontWeight: '600' }}>
            Excel Hours (Auto)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--secondary-color)' }}>
            {excelHoursFormatted} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
          </div>
        </div>

        <div className="glass-panel" style={{
          padding: '1rem 1.25rem',
          background: totalHours > 24 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)',
          borderColor: totalHours > 24 ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-glass)'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', fontWeight: '600' }}>
            Total Hours
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '700', color: totalHours > 24 ? 'var(--error-color)' : 'var(--text-primary)' }}>
            {totalHours} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>hrs</span>
          </div>
        </div>
      </div>

      {/* Detailed Tasks List */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Detailed Activity Tasks
            </h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddTask}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem' }}
            >
              <span>+ Add Task</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {detailedLogs.map((task, index) => (
              <div
                key={task._id || index}
                className="glass-panel animate-slide-up"
                style={{
                  padding: '1rem',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 2.5fr 85px 36px',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}
              >
                {/* Work Type Dropdown */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontWeight: '500' }}>
                    Type of Work
                  </label>
                  <select
                    className="form-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                    value={task.workTypeId || ''}
                    onChange={(e) => handleUpdateTask(task._id, 'workTypeId', e.target.value)}
                  >
                    {workTypes.map(wt => (
                      <option key={wt._id} value={wt._id}>
                        {wt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category: Jira vs Excel Only */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontWeight: '500' }}>
                    Category
                  </label>
                  <select
                    className="form-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                    value={task.category || 'Jira'}
                    onChange={(e) => handleUpdateTask(task._id, 'category', e.target.value)}
                  >
                    <option value="Jira">Jira</option>
                    <option value="Excel">Excel</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontWeight: '500' }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                    placeholder="Brief description of work done..."
                    value={task.description || ''}
                    onChange={(e) => handleUpdateTask(task._id, 'description', e.target.value)}
                  />
                </div>

                {/* Hours */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem', fontWeight: '500' }}>
                    Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    className="form-input"
                    style={{ padding: '0.5rem 0.6rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: '600' }}
                    value={task.hours}
                    onChange={(e) => handleUpdateTask(task._id, 'hours', e.target.value)}
                    required
                  />
                </div>

                {/* Remove task button */}
                <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center', height: '100%' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ color: 'var(--text-muted)', padding: '0.4rem' }}
                    onClick={() => handleRemoveTask(task._id)}
                    title="Remove task"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: 'auto', padding: '0.75rem 2rem' }}
          >
            {loading ? 'Saving Worklog...' : 'Save Worklog Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
