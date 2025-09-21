'use client';

import { useState, useEffect } from 'react';

export default function SimpleTasksPage() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    const loadData = async () => {
      try {
        setStatus('Fetching tasks...');
        
        const response = await fetch('/api/tasks', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          setStatus(`API Error: ${response.status}`);
          return;
        }

        const result = await response.json();
        setStatus(`Success! Found ${result.data?.length || 0} tasks`);
      } catch (error) {
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    loadData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Simple Tasks Test</h1>
      <p><strong>Status:</strong> {status}</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <p>This is a minimal test page to isolate TasksPage issues.</p>
        <p>If you see this without errors, the problem is in component imports or complex state management.</p>
      </div>
    </div>
  );
}