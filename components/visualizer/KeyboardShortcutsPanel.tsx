'use client';

import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: ['Scroll'], desc: 'Zoom in/out' },
  { keys: ['Drag'], desc: 'Pan canvas' },
  { keys: ['+', '-'], desc: 'Zoom in / out' },
  { keys: ['0'], desc: 'Fit to view' },
  { keys: ['Esc'], desc: 'Deselect / close panel' },
  { keys: ['Double-click'], desc: 'Fit canvas to view' },
  { keys: ['Middle-click'], desc: 'Pan (anywhere)' },
  { keys: ['?'], desc: 'Toggle this panel' },
];

export default function KeyboardShortcutsPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">Keyboard shortcuts</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 space-y-1">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-medium">?</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}
