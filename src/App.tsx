import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { getAppSettings, setIncognitoMode } from './services/storage';
import { Navbar } from './components/Navbar';
import { BottomDock } from './components/BottomDock';
import { DiscoverPage } from './pages/DiscoverPage';
import { SearchBrowsePage } from './pages/SearchBrowsePage';
import { MangaDetailPage } from './pages/MangaDetailPage';
import { ReaderPage } from './pages/ReaderPage';
import { LibraryPage } from './pages/LibraryPage';
import { UpdatesPage } from './pages/UpdatesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { StatsPage } from './pages/StatsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { InstallPrompt } from './components/InstallPrompt';
import { AntiScraperGuard } from './components/AntiScraperGuard';
import { WifiOff } from 'lucide-react';

import { TopProgressBar } from './components/TopProgressBar';

// Automatically scroll window to top on every route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
};

// Offline status banner indicator
const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 bg-[#19152b]/95 backdrop-blur-md text-[#9d86e9] border-b border-[#9d86e9]/30 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-xl animate-fade-in">
      <WifiOff className="w-4 h-4 text-[#9d86e9]" />
      <span>Offline Mode — Serving cached manga catalog & downloaded chapters</span>
    </div>
  );
};

export const App: React.FC = () => {
  useEffect(() => {
    // Reset incognito mode on fresh application start
    setIncognitoMode(false);

    const applyTheme = () => {
      const theme = getAppSettings().theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    };
    applyTheme();
    window.addEventListener('neoko_app_settings_changed', applyTheme);
    return () => window.removeEventListener('neoko_app_settings_changed', applyTheme);
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <AntiScraperGuard>
          <Router>
            <TopProgressBar />
            <ScrollToTop />
            <div className="min-h-screen bg-[var(--bg-main)] font-sans text-[var(--text-main)] flex flex-col relative selection:bg-primary/30 selection:text-primary pb-20">
              <Navbar />
              <OfflineBanner />
              <Routes>
                <Route path="/" element={<DiscoverPage />} />
                <Route path="/browse" element={<SearchBrowsePage />} />
                <Route path="/updates" element={<UpdatesPage />} />
                <Route path="/manga/:mangaId" element={<MangaDetailPage />} />
                <Route path="/read/:chapterId" element={<ReaderPage />} />
                <Route path="/read/:mangaId/:chapterId" element={<ReaderPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/history" element={<LibraryPage defaultTab="History" />} />
                <Route path="/collections" element={<CollectionsPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <InstallPrompt />
              <BottomDock />
            </div>
          </Router>
        </AntiScraperGuard>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
