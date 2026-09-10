import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 p-4 rounded-2xl bg-[#161327]/95 border border-[#9d86e9]/40 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9] shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h4 className="font-display font-bold text-sm text-white">Install NEOKO App</h4>
            <p className="text-xs text-[#7c779b]">Install as a standalone app for offline manga reading and quick launcher access.</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#2b2746]">
        <button
          onClick={() => setShowPrompt(false)}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="px-4 py-1.5 rounded-xl bg-[#9d86e9] hover:bg-[#8b72e0] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Install App
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
