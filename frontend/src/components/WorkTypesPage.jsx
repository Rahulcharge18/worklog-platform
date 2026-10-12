import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5050/api');

export default function WorkTypesPage() {
  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for creating new work type
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchWorkTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/worktypes/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch work types');
      const data = await response.json();
      setWorkTypes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkTypes();
  }, []);

  const handleCreateWorkType = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newTypeName.trim()) {
      setError('Please enter a work type name');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/worktypes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTypeName.trim(),
          description: newTypeDescription.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create work type');
      }

      setSuccess(`Work type "${data.name}" created successfully!`);
      setNewTypeName('');
      setNewTypeDescription('');
      setShowAddForm(false);
      fetchWorkTypes();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (wt) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/worktypes/${wt._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !wt.isActive })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update work type');
      }

      fetchWorkTypes();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditing = (wt) => {
    setEditingId(wt._id);
    setEditName(wt.name);
    setEditDesc(wt.description || '');
  };

  const handleSaveEdit = async (id) => {
    setError('');
    setSuccess('');
    if (!editName.trim()) {
      setError('Work type name cannot be empty');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/worktypes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim()
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save work type');
      }

      setEditingId(null);
      setSuccess('Work type updated successfully');
      fetchWorkTypes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Manage Work Types</h1>
          <p>Configure activity classification categories for work.io time logging</p>
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '0.65rem 1.25rem' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Close Form' : '+ Add Work Type'}
        </button>
      </div>

      {error && <div className="alert-banner alert-error"><span>{error}</span></div>}
      {success && <div className="alert-banner alert-success"><span>{success}</span></div>}

      {/* Add New Work Type Form */}
      {showAddForm && (
        <div className="glass-panel animate-slide-up" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Create New Work Type</h3>
          <form onSubmit={handleCreateWorkType}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="newTypeName">Name *</label>
                <input
                  id="newTypeName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Code Review"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="newTypeDescription">Description (Optional)</label>
                <input
                  id="newTypeDescription"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Reviewing peer pull requests"
                  value={newTypeDescription}
                  onChange={(e) => setNewTypeDescription(e.target.value)}
                />
              </div>

              <div>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '0.7rem 1.5rem' }}>
                  {submitting ? 'Saving...' : 'Add Type'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex-center" style={{ padding: '3rem 0' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table className="masters-table">
            <thead>
              <tr>
                <th>Work Type Name</th>
                <th>Description</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workTypes.map(wt => (
                <tr key={wt._id}>
                  <td className="td-name">
                    {editingId === wt._id ? (
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem' }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      wt.name
                    )}
                  </td>
                  <td>
                    {editingId === wt._id ? (
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.4rem 0.6rem' }}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    ) : (
                      wt.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description</span>
                    )}
                  </td>
                  <td>
                    {wt.isDefault ? (
                      <span className="badge badge-default">System Default</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>Custom</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${wt.isActive ? 'badge-active' : 'badge-inactive'}`}>
                      {wt.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {editingId === wt._id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-primary"
                          style={{ width: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => handleSaveEdit(wt._id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                          onClick={() => startEditing(wt)}
                          title="Edit work type"
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          style={{
                            padding: '0.3rem 0.75rem',
                            fontSize: '0.8rem',
                            color: wt.isActive ? 'var(--warning-color)' : 'var(--success-color)'
                          }}
                          onClick={() => handleToggleActive(wt)}
                          title={wt.isActive ? 'Deactivate work type' : 'Activate work type'}
                        >
                          {wt.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
