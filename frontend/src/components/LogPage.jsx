import React from 'react';
import { useSearchParams } from 'react-router-dom';
import WorklogForm from './WorklogForm.jsx';

export default function LogPage({ user }) {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>{dateParam ? `Edit Log for ${dateParam}` : 'Log Your Work'}</h2>
      <WorklogForm 
        onLogSubmitted={() => {
          // Could navigate to dashboard or show a success toast
        }} 
        initialDate={dateParam || ''}
      />
    </div>
  );
}
