'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pwc-black text-pwc-white p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
        <p className="text-sm text-gray-400">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-pwc-orange text-white rounded hover:bg-orange-600 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 border border-slate-600 text-slate-300 rounded hover:border-slate-400 hover:text-white transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
