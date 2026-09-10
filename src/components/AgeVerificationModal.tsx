import React from 'react';
import { Flame, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AgeVerificationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AgeVerificationModal: React.FC<AgeVerificationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pt-14 pb-16 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#161226] rounded-3xl border border-[#ef4444]/40 p-6 shadow-2xl space-y-5 text-white animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full text-[#7c779b] hover:text-white hover:bg-[#231f3d] transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Badge & Icon */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#ef4444] flex items-center justify-center shadow-lg shadow-[#ef4444]/10 animate-bounce-short">
            <Flame className="w-9 h-9 stroke-[2.5]" />
          </div>
          <span className="px-3 py-1 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-xs font-black uppercase tracking-wider">
            18+ Content Warning
          </span>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white">
            Age Verification Required
          </h2>
        </div>

        {/* Body Text */}
        <div className="space-y-2 text-center text-xs sm:text-sm text-[#a5a3c2] leading-relaxed bg-[#1c1833] p-4 rounded-2xl border border-[#2b2746]">
          <p>
            You are about to switch to <strong className="text-white">18+ Mode</strong>. This unlocks explicit adult content, mature themes, erotica, and 18+ extensions.
          </p>
          <p className="text-[#ef4444] font-semibold text-xs pt-1 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>You must be at least 18 years old to proceed.</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#ef4444]/25 active:scale-95 transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>I am 18+</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-[#231f3d] hover:bg-[#2e294f] text-[#a5a3c2] hover:text-white font-bold text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
