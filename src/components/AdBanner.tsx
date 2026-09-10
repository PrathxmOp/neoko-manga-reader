import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAdSettings, AdSettings } from '../services/storage';
import { Sparkles, ShieldCheck, Megaphone, ExternalLink } from 'lucide-react';

interface AdBannerProps {
  placement?: 'top' | 'sidebar' | 'reader' | 'footer';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ placement = 'top', className = '' }) => {
  const navigate = useNavigate();
  const [adSettings, setAdSettings] = useState<AdSettings>(getAdSettings());

  useEffect(() => {
    const handleAdSettingsChange = () => {
      setAdSettings(getAdSettings());
    };
    window.addEventListener('neoko_ad_settings_changed', handleAdSettingsChange);
    return () => window.removeEventListener('neoko_ad_settings_changed', handleAdSettingsChange);
  }, []);

  // Don't render if Ads are disabled globally by Admin
  if (!adSettings.adsEnabledGlobally) {
    return null;
  }

  // Don't render if user is Pro/VIP and Ad-Free is enabled for Pro users
  if (adSettings.isProUser && adSettings.disableAdsForProUsers) {
    return (
      <div className="w-full py-2 px-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between text-xs text-primary font-sans my-2">
        <span className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-primary" />
          VIP Ad-Free Experience Active
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-on-primary font-extrabold uppercase tracking-wider">
          NEOKO PRO
        </span>
      </div>
    );
  }

  // Render Custom Ad HTML/Script snippet if configured by Admin
  if (adSettings.customAdScript && adSettings.customAdScript.trim()) {
    return (
      <div className={`w-full relative overflow-hidden rounded-2xl bg-surface-container border border-surface-container-high p-3 flex flex-col items-center justify-center my-3 ${className}`}>
        <div className="w-full flex items-center justify-between text-[10px] text-outline font-bold uppercase mb-2 px-1">
          <span>SPONSORED ADVERTISEMENT ({adSettings.adNetwork.toUpperCase()})</span>
          <button onClick={() => navigate('/profile')} className="text-primary hover:underline flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Remove Ads
          </button>
        </div>
        <div 
          className="w-full flex justify-center overflow-hidden"
          dangerouslySetInnerHTML={{ __html: adSettings.customAdScript }}
        />
      </div>
    );
  }

  // Default Built-in Partner Ad Unit
  return (
    <div className={`w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-container-high via-surface-bright to-surface-container-high border border-surface-container-highest p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md my-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <Megaphone className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col text-xs font-sans">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-on-surface">Official Partner Sponsor</span>
            <span className="px-2 py-0.5 rounded-md bg-surface-container-lowest text-primary text-[9px] font-extrabold uppercase border border-primary/20">
              AD • {adSettings.adNetwork.toUpperCase()}
            </span>
          </div>
          <span className="text-outline mt-0.5 text-[11px]">
            Support scanlation drops & unlock instant high-speed mirror servers.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
        <button
          onClick={() => navigate('/profile')}
          className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary font-sans text-xs font-bold flex items-center gap-1 hover:bg-primary-fixed transition-all shadow-md active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Remove Ads</span>
        </button>
      </div>
    </div>
  );
};
