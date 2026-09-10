import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, Menu, X, Settings, Compass, Grid, Clock, Bookmark, BarChart3, FolderHeart, Eye, EyeOff } from 'lucide-react';
import { getIncognitoMode, toggleIncognitoMode } from '../services/storage';

interface NavbarProps {
  activeSourceName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeSourceName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [incognito, setIncognito] = useState(() => getIncognitoMode());

  useEffect(() => {
    const handleIncognitoChange = () => {
      setIncognito(getIncognitoMode());
    };
    window.addEventListener('neoko_incognito_changed', handleIncognitoChange);
    return () => {
      window.removeEventListener('neoko_incognito_changed', handleIncognitoChange);
    };
  }, []);

  if (location.pathname.startsWith('/read/')) {
    return null;
  }

  return (
    <>
      <header className="fixed top-0 w-full z-40 pt-safe bg-[#0c0c14]/90 backdrop-blur-xl border-b border-[#1f1c35] shadow-lg">
        <div className="h-14 px-3 sm:px-6 flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 cursor-pointer group shrink-0 relative select-none"
          >
            <span className="font-display font-black text-2xl sm:text-3xl tracking-tight animate-neoko-shimmer">
              NEOKO
            </span>

            {/* Black Incognito Goggles Overlay */}
            {incognito && (
              <span title="Incognito Mode Active" className="inline-flex items-center justify-center incognito-goggles-anim shrink-0 -ml-0.5">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]" viewBox="0 0 24 24" fill="none">
                  {/* Outer Goggles Dark Frame */}
                  <path d="M2 9.5C2 9.5 7 7.8 12 7.8C17 7.8 22 9.5 22 9.5L21.4 11.2C21.4 11.2 16.8 9.8 12 9.8C7.2 9.8 2.6 11.2 2.6 11.2L2 9.5Z" fill="#18181b" stroke="#a78bfa" strokeWidth="0.8" />
                  {/* Left Pure Black Lens */}
                  <path d="M2.5 11C2.5 11 6.8 10.4 10.6 11C11.1 13.8 10 17 6.8 17.2C3.3 17.2 2.5 14 2.5 11Z" fill="#000000" stroke="#c084fc" strokeWidth="1.3" />
                  {/* Right Pure Black Lens */}
                  <path d="M13.4 11C17.2 10.4 21.5 11 21.5 11C21.5 14 20.7 17.2 17.2 17.2C14 17 12.9 13.8 13.4 11Z" fill="#000000" stroke="#c084fc" strokeWidth="1.3" />
                  {/* Glossy White Reflection Rays */}
                  <path d="M4.2 12.4L6.8 15.2" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
                  <path d="M15.1 12.4L17.7 15.2" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
                  {/* Curved Nose Bridge */}
                  <path d="M10.6 11.6C11.3 11 12.7 11 13.4 11.6" stroke="#c084fc" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                </svg>
              </span>
            )}
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Heart Rating Counter Pill -> Donation Goal Modal */}
            <button
              onClick={() => setShowDonationModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1c1833] hover:bg-[#282348] text-[#ec4899] border border-[#ec4899]/30 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
              title="Monthly Donation Goal"
            >
              <Heart className="w-3.5 h-3.5 fill-current text-[#ec4899]" />
              <span className="text-[11px] text-white font-medium">0%</span>
            </button>

            {/* Quick Search Button */}
            <button
              aria-label="Search"
              onClick={() => navigate('/browse')}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-[#a5a3c2] hover:text-white hover:bg-[#1c1833] transition-colors"
              title="Search catalog"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-[#a5a3c2] hover:text-white hover:bg-[#1c1833] transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Hamburger Mobile Menu Drawer Toggle */}
            <button
              onClick={() => setShowMobileDrawer(!showMobileDrawer)}
              aria-label="Menu"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full text-[#a5a3c2] hover:text-white hover:bg-[#1c1833] transition-colors"
              title="Menu"
            >
              {showMobileDrawer ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Slide-down Mobile Drawer */}
        {showMobileDrawer && (
          <div className="border-t border-[#1f1c35] bg-[#120f23] p-4 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 shadow-2xl">
            <button
              onClick={() => { setShowMobileDrawer(false); navigate('/'); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-[#231f3d] transition-colors"
            >
              <Compass className="w-4 h-4 text-[#9d86e9]" />
              <span>Home / Discover</span>
            </button>
            <button
              onClick={() => { setShowMobileDrawer(false); navigate('/browse'); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-[#231f3d] transition-colors"
            >
              <Grid className="w-4 h-4 text-[#9d86e9]" />
              <span>Search & Browse Catalog</span>
            </button>
            <button
              onClick={() => { setShowMobileDrawer(false); navigate('/updates'); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-[#231f3d] transition-colors"
            >
              <Clock className="w-4 h-4 text-[#9d86e9]" />
              <span>Reading History & Updates</span>
            </button>
            <button
              onClick={() => { setShowMobileDrawer(false); navigate('/library'); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-[#231f3d] transition-colors"
            >
              <Bookmark className="w-4 h-4 text-[#9d86e9]" />
              <span>My Library</span>
            </button>
            <button
              onClick={() => { setShowMobileDrawer(false); navigate('/collections'); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-[#231f3d] transition-colors"
            >
              <FolderHeart className="w-4 h-4 text-[#9d86e9]" />
              <span>Custom Collections</span>
            </button>
            <button
              onClick={() => { setShowMobileDrawer(false); navigate('/stats'); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-[#231f3d] transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-[#9d86e9]" />
              <span>Reading Stats & Analytics</span>
            </button>
            <button
              onClick={() => { setShowMobileDrawer(false); navigate('/settings'); }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-white hover:bg-[#231f3d] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#9d86e9]" />
              <span>Settings</span>
            </button>

            {/* Incognito Mode Toggle */}
            <div className="mt-1 pt-2 border-t border-[#2b2746]/60">
              <button
                onClick={() => toggleIncognitoMode()}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  incognito
                    ? 'bg-[#9d86e9]/15 text-[#cbbcf6] border border-[#9d86e9]/40'
                    : 'text-[#7c779b] hover:bg-[#231f3d] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {incognito ? <EyeOff className="w-4 h-4 text-[#9d86e9]" /> : <Eye className="w-4 h-4" />}
                  <span>Incognito Mode</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide ${
                  incognito
                    ? 'bg-[#9d86e9] text-[#0c0c14]'
                    : 'bg-[#231f3d] text-[#7c779b]'
                }`}>
                  {incognito ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Monthly Donation Goal Modal */}
      {showDonationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
          onClick={() => setShowDonationModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#161327] border border-[#2b2746] rounded-3xl p-6 space-y-4 shadow-2xl animate-scale-in text-white relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowDonationModal(false)}
              className="absolute top-4 right-4 text-[#7c779b] hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center justify-between pr-6">
              <h2 className="font-display font-extrabold text-base text-white">Monthly Server & Domain Goal</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ec4899]/20 text-[#ec4899] font-bold text-xs">0%</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-[#231f3d] overflow-hidden">
                <div className="h-full w-[2%] bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-full transition-all duration-500" />
              </div>
              <p className="text-xs text-[#9d86e9] font-bold">$0 of $30 (~₹2,500) this month</p>
            </div>

            <p className="text-xs text-[#9e9ab8] leading-relaxed">
              <strong>Demo Notice:</strong> This is currently a demo test build. I am raising funds to buy a high-speed dedicated server and custom domain for NEOKO.
            </p>

            <div className="p-3.5 rounded-2xl bg-[#1c1833] border border-[#ec4899]/40 text-xs text-slate-200 leading-relaxed space-y-1">
              <p className="font-semibold text-[#ec4899]">⚠️ Vital Notice:</p>
              <p className="text-[11px] text-slate-300">
                If the monthly goal of <strong>$30 (~₹2,500)</strong> is not met, server hosting costs cannot be sustained and the website will have to be closed. Every contribution directly keeps NEOKO online!
              </p>
            </div>

            <a
              href="https://buymeachai.in/prathxm"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-2xl bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span>Support & Keep Online</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
