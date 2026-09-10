import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const navigationShortcuts = [
    { label: 'Previous Page / Step Up (Scroll)', key: '←' },
    { label: 'Next Page / Step Down (Scroll)', key: '→' },
    { label: 'Scroll Up', key: '↑' },
    { label: 'Scroll Down', key: '↓ / Space' },
    { label: 'First Page / Top', key: 'Home' },
    { label: 'Last Page / Bottom', key: 'End' },
    { label: 'Page Up (jump)', key: 'PgUp' },
    { label: 'Page Down (jump)', key: 'PgDn' },
  ];

  const zoomDisplayShortcuts = [
    { label: 'Zoom In', key: '+ / =' },
    { label: 'Zoom Out', key: '-' },
    { label: 'Reset Zoom', key: '0' },
    { label: 'Toggle Fullscreen', key: 'F' },
    { label: 'Hide / Show Controls', key: 'H' },
    { label: 'Show Keyboard Shortcuts', key: '?' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pt-14 pb-16 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#141824] rounded-3xl border border-surface-container-high p-6 shadow-2xl space-y-6 text-on-surface max-h-[calc(100vh-130px)] sm:max-h-[85vh] flex flex-col my-auto overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-container-high pb-4">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-primary" />
            <h2 className="font-display font-extrabold text-lg text-on-surface">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-bright text-outline hover:text-on-surface flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Body Container */}
        <div className="flex flex-col gap-6 max-h-[65vh] overflow-y-auto no-scrollbar pr-1">
          {/* Navigation Category */}
          <div className="flex flex-col gap-2">
            <span className="font-display font-bold text-xs text-outline uppercase tracking-wider">
              NAVIGATION
            </span>
            <div className="flex flex-col divide-y divide-surface-container-high/40">
              {navigationShortcuts.map((sc) => (
                <div key={sc.label} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-sans text-on-surface-variant">{sc.label}</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high text-primary font-mono text-[11px] font-bold border border-white/5 shadow-sm">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Zoom & Display Category */}
          <div className="flex flex-col gap-2">
            <span className="font-display font-bold text-xs text-outline uppercase tracking-wider">
              ZOOM & DISPLAY
            </span>
            <div className="flex flex-col divide-y divide-surface-container-high/40">
              {zoomDisplayShortcuts.map((sc) => (
                <div key={sc.label} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-sans text-on-surface-variant">{sc.label}</span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-surface-container-high text-primary font-mono text-[11px] font-bold border border-white/5 shadow-sm">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
