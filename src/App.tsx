import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { getAppSettings, setIncognitoMode } from './services/storage';
import { Navbar } from './components/Navbar';
import { BottomDock } from './components/BottomDock';
import { InstallPrompt } from './components/InstallPrompt';
import { AntiScraperGuard } from './components/AntiScraperGuard';
import { WifiOff } from 'lucide-react';
import { TopProgressBar } from './components/TopProgressBar';

const DiscoverPage = React.lazy(() => import('./pages/DiscoverPage'));
const SearchBrowsePage = React.lazy(() => import('./pages/SearchBrowsePage'));
const MangaDetailPage = React.lazy(() => import('./pages/MangaDetailPage'));
const ReaderPage = React.lazy(() => import('./pages/ReaderPage'));
const LibraryPage = React.lazy(() => import('./pages/LibraryPage'));
const UpdatesPage = React.lazy(() => import('./pages/UpdatesPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const StatsPage = React.lazy(() => import('./pages/StatsPage'));
const CollectionsPage = React.lazy(() => import('./pages/CollectionsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const PageFallback: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
    <div className="w-12 h-12 rounded-2xl bg-[#9d86e9]/10 border border-[#9d86e9]/30 flex items-center justify-center mb-4 animate-pulse">
      <div className="w-6 h-6 rounded-lg bg-[#9d86e9]/40" />
    </div>
    <div className="h-4 w-32 bg-[#1f1b3a] rounded-full animate-pulse mb-2" />
    <div className="h-3 w-24 bg-[#1f1b3a]/60 rounded-full animate-pulse" />
  </div>
);

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
              <React.Suspense fallback={<PageFallback />}>
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
              </React.Suspense>

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
