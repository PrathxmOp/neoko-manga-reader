import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Clock, BookOpen, BarChart3, Settings, EyeOff } from 'lucide-react';
import { getIncognitoMode } from '../services/storage';

export const BottomDock: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const items = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Browse', path: '/browse', icon: Search },
    { label: 'Library', path: '/library', icon: BookOpen },
    { label: 'Stats', path: '/stats', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#120f23]/95 backdrop-blur-xl border-t border-[#231f3c] py-1.5 px-2 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      <nav className="max-w-md mx-auto flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-1 px-3 sm:px-4 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-[#25213b] text-[#9d86e9]'
                  : 'text-[#7c779b] hover:text-white hover:bg-[#1a172e]'
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[11px] font-semibold tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
