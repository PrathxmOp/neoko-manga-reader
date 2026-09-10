import React, { useState } from 'react';
import { getContentFilterSettings, saveContentFilterSettings } from '../services/storage';
import { ContentFilterSettings } from '../types/manga';
import { X, Check, ShieldCheck, Heart, Sparkles, Flame, Languages, Globe } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: ContentFilterSettings) => void;
}

export const ContentLanguageModal: React.FC<ModalProps> = ({ isOpen, onClose, onSave }) => {
  const [settings, setSettings] = useState<ContentFilterSettings>(getContentFilterSettings());
  const [selectedLangs, setSelectedLangs] = useState<string[]>(
    Array.isArray(settings.languages) && settings.languages.length > 0 ? settings.languages : ['en']
  );
  const [selectedRating, setSelectedRating] = useState<ContentFilterSettings['contentRating']>(
    settings.contentRating || 'Suggestive'
  );

  if (!isOpen) return null;

  const toggleLanguage = (langCode: string) => {
    if (langCode === 'all') {
      setSelectedLangs(['all']);
      return;
    }

    let updated: string[];
    if (selectedLangs.includes('all')) {
      updated = [langCode];
    } else if (selectedLangs.includes(langCode)) {
      updated = selectedLangs.filter(l => l !== langCode);
      if (updated.length === 0) updated = ['en'];
    } else {
      updated = [...selectedLangs, langCode];
    }
    setSelectedLangs(updated);
  };

  const handleSave = () => {
    const updated = saveContentFilterSettings({
      contentRating: selectedRating,
      languages: selectedLangs,
    });
    setSettings(updated);
    if (onSave) onSave(updated);
    onClose();
  };

  const languageOptions = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', label: 'Korean', flag: '🇰🇷' },
    { code: 'es', label: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', label: 'French', flag: '🇫🇷' },
    { code: 'pl', label: 'Polish', flag: '🇵🇱' },
    { code: 'all', label: 'All Languages', flag: '🌐' },
  ];

  const ratings: {
    key: ContentFilterSettings['contentRating'];
    title: string;
    badge?: string;
    desc: string;
    icon: any;
  }[] = [
    {
      key: 'Safe',
      title: 'Safe',
      desc: 'Family-friendly content suitable for all ages.',
      icon: ShieldCheck,
    },
    {
      key: 'Suggestive',
      title: 'Suggestive',
      badge: 'Recommended',
      desc: 'Mild fan service, romance, and suggestive themes.',
      icon: Heart,
    },
    {
      key: 'Erotica',
      title: 'Erotica',
      desc: 'Mature themes, violence, and non-explicit erotica.',
      icon: Sparkles,
    },
    {
      key: 'All',
      title: 'Pornographic (18+)',
      desc: 'Includes explicit 18+ adult content.',
      icon: Flame,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#141824] rounded-3xl border border-[#2b2746] p-5 sm:p-6 shadow-2xl space-y-5 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2b2746] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg sm:text-xl text-white">
                Content & Language Settings
              </h2>
              <p className="font-sans text-xs text-[#7c779b]">
                Select reading languages and content safety rating.
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
          {/* Section 1: Language Preferences */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold uppercase text-[#9d86e9] tracking-wider flex items-center gap-1.5">
              <Languages className="w-4 h-4" />
              Manga Reading Languages
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {languageOptions.map((lang) => {
                const isSelected = selectedLangs.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#9d86e9]/20 border-[#9d86e9] text-[#9d86e9] shadow-sm'
                        : 'bg-[#1c1833] border-[#2b2746] text-slate-300 hover:border-[#9d86e9]/40'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{lang.flag}</span>
                      <span className="truncate">{lang.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#9d86e9] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Content Rating Options */}
          <div className="space-y-2.5 pt-2 border-t border-[#2b2746]">
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
                    onClick={() => setSelectedRating(r.key)}
                    className={`group p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#9d86e9]/15 border-[#9d86e9] shadow-md'
                        : 'bg-[#1c1833]/60 border-[#2b2746] hover:border-[#9d86e9]/40'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#9d86e9] text-black font-bold' : 'bg-[#2b2746] text-[#7c779b]'
                    }`}>
                      <Icon className="w-4 h-4" />
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
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#9d86e9] to-[#7c5cdb] hover:from-[#b19cf5] hover:to-[#8c6de6] text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-[#9d86e9]/20 transition-all active:scale-[0.98]"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
