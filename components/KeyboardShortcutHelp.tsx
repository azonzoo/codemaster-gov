import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutHelp: React.FC<Props> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // De-duplicate shortcuts for display (Ctrl+K and Shift+? are same action)
  const displayShortcuts = SHORTCUTS.filter((s) => !(s.ctrl && s.key === 'k'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-premium-xl border border-slate-200/60 dark:border-slate-700/60 max-w-md w-full mx-4 animate-fadeIn"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100/60 dark:border-blue-800/60">
                <Keyboard size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Keyboard Shortcuts</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2">
            {displayShortcuts.map((shortcut) => (
              <div
                key={`${shortcut.key}-${shortcut.description}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">{shortcut.description}</span>
                <kbd className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm">
                  {shortcut.ctrl && <span>Ctrl+</span>}
                  {shortcut.shift && <span>Shift+</span>}
                  <span>{shortcut.key === 'Escape' ? 'Esc' : shortcut.key}</span>
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              Press <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">?</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">Ctrl+K</kbd> to toggle this dialog
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
