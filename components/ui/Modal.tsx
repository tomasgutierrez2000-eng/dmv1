'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Optional class for the inner panel (e.g. max-w-2xl). */
  panelClassName?: string;
  /** If true, close on backdrop click. Default true. */
  closeOnBackdrop?: boolean;
  /** If true, close on Escape. Default true. */
  closeOnEscape?: boolean;
}

/**
 * Shared modal: backdrop, escape to close, optional focus trap.
 * Use for SchemaImportModal, DdlExportModal, SampleDataSqlExportModal, etc.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  panelClassName = 'max-w-2xl w-full max-h-[85vh]',
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose();
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (!open) return;
    if (closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, closeOnEscape, handleEscape]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        className={`bg-pwc-gray border border-pwc-gray-light rounded-xl shadow-xl flex flex-col text-pwc-white ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between p-4 border-b border-pwc-gray-light shrink-0">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-pwc-gray-light text-pwc-gray-light hover:text-pwc-white"
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
