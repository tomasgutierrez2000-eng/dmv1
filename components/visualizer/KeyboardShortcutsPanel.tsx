'use client';

import { useEffect, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: ['Click empty'], desc: 'Clear selection (no zoom change)' },
  { keys: ['Click category'], desc: 'Zoom to category' },
  { keys: ['Click table'], desc: 'Zoom to table & open details' },
  { keys: ['Scroll'], desc: 'Zoom in/out' },
  { keys: ['Drag'], desc: 'Pan canvas' },
  { keys: ['Shift', 'Drag'], desc: 'Zoom to region (marquee)' },
  { keys: ['+', '-'], desc: 'Zoom in / out' },
  { keys: ['0'], desc: 'Fit to view' },
  { keys: ['Esc'], desc: 'Deselect & close panel' },
  { keys: ['Double-click empty'], desc: 'Zoom in toward click' },
  { keys: ['Triple-click empty'], desc: 'Zoom out to 15%' },
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
          {shortcuts.map((s) => (
            <div key={`${s.keys.join('-')}-${s.desc.slice(0, 20)}`} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-sm font-medium">?</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}
