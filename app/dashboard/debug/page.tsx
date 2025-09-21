'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [authStatus, setAuthStatus] = useState('checking...');
  const [apiStatus, setApiStatus] = useState('not tested');

  useEffect(() => {
    // Test auth status
    fetch('/api/customers', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
    .then(async (response) => {
      const text = await response.text();
      setApiStatus(`${response.status} - ${text.substring(0, 200)}`);
      
      if (response.status === 401) {
        setAuthStatus('Not authenticated (401)');
      } else if (response.status === 200) {
        setAuthStatus('Authenticated successfully');
      } else {
        setAuthStatus(`Unexpected status: ${response.status}`);
      }
    })
    .catch((error) => {
      setAuthStatus(`Error: ${error.message}`);
      setApiStatus(`Error: ${error.message}`);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug Information</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
            <p className="text-sm bg-gray-100 p-3 rounded font-mono">{authStatus}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">API Response</h2>
            <p className="text-sm bg-gray-100 p-3 rounded font-mono whitespace-pre-wrap">{apiStatus}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Browser Information</h2>
            <div className="text-sm space-y-2">
              <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
              <p><strong>Cookies:</strong> {typeof document !== 'undefined' ? document.cookie || 'None' : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}