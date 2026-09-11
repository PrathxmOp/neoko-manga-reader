import React, { useState } from 'react';
import { getContentFilterSettings, saveContentFilterSettings } from '../services/storage';
import { ContentFilterSettings } from '../types/manga';
import { X, Check, ShieldCheck, Flame, Shield } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';

import { AgeVerificationModal } from './AgeVerificationModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: ContentFilterSettings) => void;
}

export const ContentLanguageModal: React.FC<ModalProps> = ({ isOpen, onClose, onSave }) => {
  useBodyScrollLock(isOpen);
  const [settings, setSettings] = useState<ContentFilterSettings>(getContentFilterSettings());
  const [selectedRating, setSelectedRating] = useState<ContentFilterSettings['contentRating']>(
    settings.contentRating || 'normal'
  );
  const [showAgeModal, setShowAgeModal] = useState(false);

  const { ref: dismissRef, offsetY, isDragging } = useSwipeDismiss<HTMLDivElement>({
    onDismiss: onClose,
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const handleRatingSelect = (key: ContentFilterSettings['contentRating']) => {
    if (key === '18+' && selectedRating !== '18+') {
      setShowAgeModal(true);
    } else {
      setSelectedRating(key);
    }
  };

  const handleSave = () => {
    const updated = saveContentFilterSettings({
      contentRating: selectedRating,
      languages: ['en'],
    });
    setSettings(updated);
    if (onSave) onSave(updated);
    onClose();
  };

  const ratings: {
    key: ContentFilterSettings['contentRating'];
    title: string;
    badge?: string;
    desc: string;
    icon: any;
  }[] = [
    {
      key: 'normal',
      title: 'Normal Mode',
      badge: 'Standard',
      desc: 'Standard manga, manhwa & webtoons. All adult content is hidden.',
      icon: ShieldCheck,
    },
    {
      key: '18+',
      title: '18+ Mode',
      badge: 'Adult (18+)',
      desc: 'Allows explicit 18+ content and raw mature extensions.',
      icon: Flame,
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 pt-14 pb-16 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        ref={dismissRef}
        style={{
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : 'none',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative w-full max-w-lg bg-[#141824] rounded-3xl border border-[#2b2746] p-5 sm:p-6 shadow-2xl space-y-5 text-white max-h-[calc(100vh-130px)] sm:max-h-[85vh] flex flex-col my-auto touch-pan-y"
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1.5 rounded-full bg-[#2b2746] mx-auto -mt-2 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2b2746] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
                Content Safety Settings
              </h2>
              <p className="font-sans text-xs text-[#7c779b]">
                Select active content browsing mode (Normal or 18+).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#2b2746] hover:bg-[#38335b] text-[#7c779b] hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-5 pr-1 scrollbar-thin scrollbar-thumb-[#2b2746] flex-1">
          {/* Content Rating Options */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold uppercase text-[#9d86e9] tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Content Safety Rating
            </label>
            <div className="flex flex-col gap-2">
              {ratings.map((r) => {
                const isSelected = selectedRating === r.key;
                const Icon = r.icon;
                return (
                  <div
                    key={r.key}
                    onClick={() => handleRatingSelect(r.key)}
                    className={`group p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#9d86e9]/15 border-[#9d86e9] shadow-md'
                        : 'bg-[#1c1833]/60 border-[#2b2746] hover:border-[#9d86e9]/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#9d86e9] text-black font-bold' : 'bg-[#2b2746] text-[#7c779b]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-xs sm:text-sm text-white">
                          {r.title}
                        </span>
                        {r.badge && (
                          <span className="px-2 py-0.5 rounded-md bg-[#9d86e9]/20 text-[#9d86e9] text-[9px] font-extrabold uppercase">
                            {r.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#7c779b] leading-tight mt-0.5">
                        {r.desc}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#9d86e9] text-black flex items-center justify-center shrink-0 mt-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 shrink-0 border-t border-[#2b2746]">
          <button
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-[#9d86e9] hover:bg-[#8b72e0] text-[#0c0c14] font-extrabold text-sm transition-all shadow-lg active:scale-98 cursor-pointer"
          >
            Apply Mode
          </button>
        </div>

        {/* Age Verification Modal */}
        <AgeVerificationModal
          isOpen={showAgeModal}
          onConfirm={() => {
            setSelectedRating('18+');
            setShowAgeModal(false);
          }}
          onCancel={() => {
            setShowAgeModal(false);
          }}
        />
      </div>
    </div>
  );
};
