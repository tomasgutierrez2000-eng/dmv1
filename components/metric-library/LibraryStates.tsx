'use client';

import Link from 'next/link';

/** Loading state: skeleton cards to reduce layout shift. */
export function LibraryLoading() {
  return (
    <div className="grid gap-3" role="status" aria-live="polite">
      <span className="sr-only">Loading metrics…</span>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse"
          aria-hidden
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-5 bg-gray-200 rounded w-48" />
                <div className="h-5 bg-gray-100 rounded-full w-20" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-4/5 mb-3" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-100 rounded w-40" />
                <div className="h-6 bg-gray-100 rounded w-24" />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="h-8 bg-gray-200 rounded w-8 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full-page loading for detail views. */
export function LibraryPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center" role="status" aria-live="polite">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" aria-hidden />
      <span className="mt-4 text-sm text-gray-500">Loading…</span>
    </div>
  );
}

/** Error state with optional retry and back link. */
export function LibraryError({
  message = 'Something went wrong.',
  onRetry,
  backHref,
  backLabel = 'Back to Library',
}: {
  message?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center text-center px-6" role="alert">
      <p className="text-gray-700 font-medium">{message}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Try again
          </button>
        )}
        {backHref && (
          <Link
            href={backHref}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

/** Empty state for no results. */
export function LibraryEmpty({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-10 text-center shadow-sm">
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4" aria-hidden>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
