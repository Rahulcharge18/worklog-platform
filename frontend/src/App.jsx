import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth.jsx';
import Dashboard from './components/Dashboard.jsx';
import Navigation from './components/Navigation.jsx';
import LogPage from './components/LogPage.jsx';
import WorkTypesPage from './components/WorkTypesPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5050/api');

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error('Error fetching user context:', err);
      } finally {
        setInitializing(false);
      }
    };

    fetchUser();
  }, [token]);

  const handleAuthSuccess = (newToken, authUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(authUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  if (initializing) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255, 255, 255, 0.05)',
          borderTopColor: 'var(--primary-color)',
          borderRadius: '50%',
          animation: 'pulseGlow 2s infinite linear'
        }}></div>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
          Initializing work.io...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navigation user={user} onLogout={handleLogout} />
        <main className="main-content">
          <div className="page-container">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard user={user} />} />
              <Route path="/log" element={<LogPage user={user} />} />
              <Route path="/worktypes" element={<WorkTypesPage user={user} />} />
              <Route path="/profile" element={<ProfilePage user={user} onUserUpdate={setUser} />} />
              <Route 
                path="/admin" 
                element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" replace />} 
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
