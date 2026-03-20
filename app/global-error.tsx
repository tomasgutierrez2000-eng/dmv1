'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ background: '#1a1a2e', color: '#fff', fontFamily: 'system-ui' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>Critical Error</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {error.message || 'The application encountered a critical error.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#d04a02',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <a
                href="/"
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid #4b5563',
                  borderRadius: '0.25rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
