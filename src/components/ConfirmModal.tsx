import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-[#161327] border border-[#2b2746] rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-2xl ${isDanger ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-[#9d86e9]/10 border border-[#9d86e9]/20 text-[#9d86e9]'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full text-[#7c779b] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-white font-display tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#7c779b] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-[#231f3d] hover:bg-[#2b2746] text-slate-200 text-xs font-semibold border border-[#2b2746] transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/25'
                : 'bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] shadow-[#9d86e9]/25'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
