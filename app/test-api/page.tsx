'use client';

import { useEffect, useState } from 'react';

export default function TestAPIPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    fetch('/api/facility-summary')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        setStatus('success');
        setMessage(`Success! Received ${Array.isArray(json) ? json.length : 'non-array'} items`);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <div className={`p-4 rounded ${
            status === 'loading' ? 'bg-yellow-50 border border-yellow-200' :
            status === 'success' ? 'bg-green-50 border border-green-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <p className={`font-medium ${
              status === 'loading' ? 'text-yellow-800' :
              status === 'success' ? 'text-green-800' :
              'text-red-800'
            }`}>
              {status === 'loading' && '⏳ Loading...'}
              {status === 'success' && '✅ Success'}
              {status === 'error' && '❌ Error'}
            </p>
            {message && (
              <p className="mt-2 text-sm">{message}</p>
            )}
          </div>
        </div>

        {data && Array.isArray(data) ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Sample Data (first item)</h2>
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
              {JSON.stringify((data as unknown[])[0], null, 2)}
            </pre>
          </div>
        ) : null}

        {status === 'error' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Troubleshooting</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>Check that the data file exists: <code className="bg-gray-100 px-1 rounded">facility-summary-mvp/output/l3/facility-summary.json</code></li>
              <li>Verify the Next.js server is running: <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
              <li>Check the server terminal for error messages</li>
              <li>Check the browser console (F12) for network errors</li>
            </ul>
          </div>
        )}

        <div className="mt-4">
          <a
            href="/overview"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Overview →
          </a>
        </div>
      </div>
    </div>
  );
}
