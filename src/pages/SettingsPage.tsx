import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  getReaderSettings, saveReaderSettings, getContentFilterSettings, saveContentFilterSettings,
  getAppSettings, saveAppSettings, clearApiCache, clearHistory, getBookmarks,
  exportAllData, importAllData, clearAllData, getStorageUsage,
  getDisabledSourceIds, isSourceEnabled, toggleSourceEnabled,
  getExtensionMode, setExtensionMode, getGeminiApiKey, saveGeminiApiKey,
  getTranslationLanguage, saveTranslationLanguage, getAiTranslationEnabled, saveAiTranslationEnabled
} from '../services/storage';
import { testGeminiApiKey } from '../services/translationService';
import { getTrackers, loginTrackerCredentials, loginTrackerOAuth, logoutTracker, getServerInfo, clearCachedImages, getCategories, createCategory, deleteCategory, getSources, isDedicatedNsfwName } from '../services/suwayomiApi';
import { getCacheUsageStats } from '../services/cacheManager';
import { ReaderSettings, ContentFilterSettings, AppSettings, TrackerInfo, Category, ServerInfo, Source } from '../types/manga';
import { AgeVerificationModal } from '../components/AgeVerificationModal';
import { RazorpayDonateButton } from '../components/RazorpayDonateButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  Settings, BookOpen, Eye, Library, Download, Bell, Palette, Database, Info,
  ChevronRight, Check, ShieldCheck, Heart, Sparkles, Flame, Monitor, Moon, Sun,
  RotateCcw, Trash2, Upload, FileDown, ExternalLink, Github, MessageCircle, MessageSquare,
  RefreshCw, Plus, X, LogOut, AlertCircle, HardDrive, Radio, Send, Edit3,
  Languages, Key, EyeOff, CheckCircle2
} from 'lucide-react';

const AVATARS = ['🔮', '⚡', '🔥', '🌸', '🎭', '🐉', '🌙', '💎', '🎨', '🦊', '🌊', '⭐'];

type SettingsTab = 'general' | 'reader' | 'ai' | 'content' | 'sources' | 'library' | 'tracking' | 'appearance' | 'data' | 'about';

const TABS: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'reader', label: 'Reader', icon: BookOpen },
  { id: 'ai', label: 'AI & Translation', icon: Languages },
  { id: 'content', label: 'Content & Filtering', icon: Eye },
  { id: 'sources', label: 'Sources & Providers', icon: Radio },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'tracking', label: 'Tracking', icon: ExternalLink },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data & Privacy', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.title = 'Settings — NEOKO';
  }, []);

  const initialTabParam = searchParams.get('tab') as SettingsTab;
  const [activeTab, setActiveTabState] = useState<SettingsTab>(
    initialTabParam && TABS.some(t => t.id === initialTabParam) ? initialTabParam : 'general'
  );

  const changeTab = (tab: SettingsTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const [readerSettings, setReaderSettingsState] = useState<ReaderSettings>(getReaderSettings());
  const [contentSettings, setContentSettingsState] = useState<ContentFilterSettings>(getContentFilterSettings());
  const [appSettings, setAppSettingsState] = useState<AppSettings>(getAppSettings());
  const [showAgeModal, setShowAgeModal] = useState(false);
  useBodyScrollLock(showAgeModal);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.username || 'Reader');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '🔮');
  const [trackers, setTrackers] = useState<TrackerInfo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [storageInfo, setStorageInfo] = useState(getStorageUsage());
  const [sources, setSources] = useState<Source[]>([]);
  const [disabledSourceIds, setDisabledSourceIds] = useState<string[]>(getDisabledSourceIds());
  const [loadingSources, setLoadingSources] = useState(false);

  // Tracker connection modal state
  const [selectedTrackerForLogin, setSelectedTrackerForLogin] = useState<TrackerInfo | null>(null);
  const [trackerLoginMode, setTrackerLoginMode] = useState<'oauth' | 'credentials'>('oauth');
  const [oAuthCallbackInput, setOAuthCallbackInput] = useState('');
  const [trackerUsername, setTrackerUsername] = useState('');
  const [trackerPassword, setTrackerPassword] = useState('');
  const [trackerLoginLoading, setTrackerLoginLoading] = useState(false);

  const handleCompleteOAuthLogin = async () => {
    if (!selectedTrackerForLogin || !oAuthCallbackInput.trim()) return;
    setTrackerLoginLoading(true);
    try {
      let callbackString = oAuthCallbackInput.trim();
      if (!callbackString.startsWith('http') && !callbackString.includes('code=')) {
        callbackString = `http://localhost:4567/api/v1/tracker/login/${selectedTrackerForLogin.id}?code=${encodeURIComponent(callbackString)}`;
      }
      const success = await loginTrackerOAuth(selectedTrackerForLogin.id, callbackString);
      if (success) {
        showToast(`Successfully connected to ${selectedTrackerForLogin.name}!`, 'success');
        setSelectedTrackerForLogin(null);
        setOAuthCallbackInput('');
        await loadTrackers();
      } else {
        showToast(`Failed to verify ${selectedTrackerForLogin.name} login. Check your URL/code and try again.`, 'error');
      }
    } catch (err: any) {
      showToast(`OAuth Error: ${err?.message || 'Login failed'}`, 'error');
    } finally {
      setTrackerLoginLoading(false);
    }
  };

  const handleCompleteCredentialLogin = async () => {
    if (!selectedTrackerForLogin || !trackerUsername.trim() || !trackerPassword.trim()) return;
    setTrackerLoginLoading(true);
    try {
      const success = await loginTrackerCredentials(selectedTrackerForLogin.id, trackerUsername, trackerPassword);
      if (success) {
        showToast(`Successfully logged in to ${selectedTrackerForLogin.name}!`, 'success');
        setSelectedTrackerForLogin(null);
        setTrackerUsername('');
        setTrackerPassword('');
        await loadTrackers();
      } else {
        showToast(`Login failed for ${selectedTrackerForLogin.name}. Please check username and password.`, 'error');
      }
    } catch (err: any) {
      showToast(`Login Error: ${err?.message || 'Authentication failed'}`, 'error');
    } finally {
      setTrackerLoginLoading(false);
    }
  };

  // Gemini AI & Translation state
  const [aiTranslationEnabled, setAiTranslationEnabled] = useState(getAiTranslationEnabled());
  const [geminiApiKey, setGeminiApiKey] = useState(getGeminiApiKey());
  const [translationLang, setTranslationLang] = useState(getTranslationLanguage());
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleToggleAiTranslation = (enabled: boolean) => {
    setAiTranslationEnabled(enabled);
    saveAiTranslationEnabled(enabled);
    triggerSaveNotice();
  };

  const handleSaveGeminiKey = (key: string) => {
    setGeminiApiKey(key);
    saveGeminiApiKey(key);
    triggerSaveNotice();
  };

  const handleSaveTranslationLang = (lang: string) => {
    setTranslationLang(lang);
    saveTranslationLanguage(lang);
    triggerSaveNotice();
  };

  const handleTestKey = async () => {
    if (!geminiApiKey.trim()) {
      showToast('Please enter an API Key first', 'error');
      return;
    }
    setIsTestingKey(true);
    setKeyTestStatus(null);
    const result = await testGeminiApiKey(geminiApiKey);
    setIsTestingKey(false);
    setKeyTestStatus(result);
    if (result.success) {
      showToast('Gemini API Key verified successfully!', 'success');
    } else {
      showToast(`Key verification failed: ${result.message}`, 'error');
    }
  };

  useEffect(() => {
    loadTrackers();
    loadCategories();
    loadServerInfo();
    loadMangaSources();
  }, []);

  // Auto-detect OAuth redirect code parameter in URL if redirected back directly
  useEffect(() => {
    const search = window.location.search;
    if (search.includes('code=') && trackers.length > 0) {
      const fullUrl = window.location.href;
      const codeMatch = search.match(/code=([^&]+)/);
      const trackerIdMatch = search.match(/trackerId=([^&]+)/);
      if (codeMatch) {
        const targetTracker = trackerIdMatch 
          ? trackers.find(t => String(t.id) === trackerIdMatch[1])
          : trackers.find(t => !t.isLoggedIn);
        if (targetTracker) {
          showToast(`Processing ${targetTracker.name} login...`, 'info');
          loginTrackerOAuth(targetTracker.id, fullUrl).then(ok => {
            if (ok) {
              showToast(`Connected to ${targetTracker.name}!`, 'success');
              loadTrackers();
            }
          });
        }
      }
    }
  }, [trackers]);

  const loadTrackers = async () => { setTrackers(await getTrackers()); };
  const loadCategories = async () => { setCategories(await getCategories()); };
  const loadServerInfo = async () => { setServerInfo(await getServerInfo()); };
  const loadMangaSources = async () => {
    // First render cached sources immediately for 0ms loading time
    const cached = await getSources(false, true);
    if (cached && cached.length > 0) {
      setSources(cached);
      setLoadingSources(false);
    } else {
      setLoadingSources(true);
    }

    try {
      const list = await getSources(true, true);
      if (list && list.length > 0) {
        setSources(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSources(false);
    }
  };

  const saveDebounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSavedBadge, setShowSavedBadge] = useState(false);

  const triggerSaveNotice = () => {
    setShowSavedBadge(true);
    if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    saveDebounceTimer.current = setTimeout(() => {
      setShowSavedBadge(false);
    }, 2200);
  };

  const handleToggleSource = (sourceId: string) => {
    toggleSourceEnabled(sourceId);
    setDisabledSourceIds(getDisabledSourceIds());
    triggerSaveNotice();
  };

  const handleEnableAllSources = () => {
    localStorage.removeItem('neoko_disabled_sources_v1');
    setDisabledSourceIds([]);
    triggerSaveNotice();
    window.dispatchEvent(new Event('neoko_content_filter_changed'));
  };

  const handleToggleExtensionMode = (sourceId: string | number, sourceName: string, targetMode: 'normal' | '18+') => {
    setExtensionMode(sourceId, targetMode);
    setExtensionMode(sourceName, targetMode);
    setContentSettingsState(getContentFilterSettings());
    triggerSaveNotice();
    showToast(`"${sourceName}" assigned to ${targetMode} mode`, 'success');
  };

  const updateReader = (patch: Partial<ReaderSettings>) => {
    const updated = saveReaderSettings(patch);
    setReaderSettingsState(updated);
    triggerSaveNotice();
  };

  const updateContent = (patch: Partial<ContentFilterSettings>) => {
    const updated = saveContentFilterSettings(patch);
    setContentSettingsState(updated);
    triggerSaveNotice();
  };

  const updateApp = (patch: Partial<AppSettings>) => {
    const updated = saveAppSettings(patch);
    setAppSettingsState(updated);
    triggerSaveNotice();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const success = await createCategory(newCategoryName.trim());
    if (success) {
      setNewCategoryName('');
      await loadCategories();
      showToast('Category created');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    await deleteCategory(id);
    await loadCategories();
    showToast('Category deleted');
  };

  const handleExportData = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neoko-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = importAllData(ev.target?.result as string);
        if (result) {
          showToast('Data imported successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast('Import failed — invalid file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const ToggleSwitch = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${active ? 'bg-[#9d86e9]' : 'bg-[#2b2746]'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-200 ${active ? 'left-6' : 'left-1'}`} />
    </button>
  );

  const SettingRow = ({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-3 border-b border-[#2b2746]/60 last:border-none">
      <div className="flex flex-col min-w-0">
        <span className="font-sans text-sm font-semibold text-white">{label}</span>
        {desc && <span className="font-sans text-xs text-[#7c779b] mt-0.5">{desc}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="font-display font-bold text-xs text-[#9d86e9] uppercase tracking-wider mb-2 mt-4 first:mt-0">{title}</h3>
  );

  const SelectPills = ({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            value === o.id ? 'bg-[#9d86e9] text-[#0c0c14] shadow-sm' : 'bg-[#231f3d] text-[#7c779b] hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <main className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-7xl mx-auto space-y-4 animate-fade-in">
      {/* Floating Fixed Saved Toast Badge */}
      {showSavedBadge && (
        <div className="fixed top-16 sm:top-20 right-4 sm:right-8 z-50 px-4 py-2.5 rounded-2xl bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Settings Saved</span>
        </div>
      )}

      {/* 1. Kagane Search Settings Input */}
      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center bg-[#161327] rounded-xl px-4 py-3 border border-[#2b2746] focus-within:border-[#9d86e9] transition-all">
          <Settings className="w-4 h-4 text-[#7c779b] mr-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="w-full bg-transparent text-white text-sm placeholder-[#7c779b] focus:outline-none"
          />
        </div>
      </div>

      {/* 2. Responsive Category Tabs (2-Column Grid on Mobile, Scrollable Pills on Desktop) */}
      <nav className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:overflow-x-auto no-scrollbar py-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-[#9d86e9] text-[#0c0c14] shadow-md shadow-[#9d86e9]/20'
                  : 'bg-[#161327] text-white hover:bg-[#231f3d] border border-[#2b2746]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 text-current" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Kagane Settings Section Container */}
      <div className="bg-[#161327] rounded-2xl border border-[#2b2746] p-3.5 sm:p-5 shadow-xl animate-fade-in-up" key={activeTab}>
            {/* ──── GENERAL ──── */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div>
                  <SectionTitle title="Reader Profile Identity" />
                  <div className="p-3 sm:p-4 rounded-2xl bg-[#1c1833] border border-[#2b2746] flex flex-col gap-4 mt-2">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#231f3d] flex items-center justify-center text-2xl sm:text-3xl border border-[#9d86e9]/30 shadow-md shrink-0">
                        {user?.avatar || '🔮'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-bold text-base text-white">{user?.username || 'Reader'}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#9d86e9]/20 text-[#9d86e9] text-[10px] font-extrabold uppercase">
                            Local Profile
                          </span>
                        </div>
                        <span className="text-xs text-[#7c779b]">Personalize display name & avatar</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-[#8b70e5] transition-colors shadow-sm shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Identity</span>
                    </button>
                  </div>

                  {isEditingProfile && (
                    <div className="p-4 rounded-2xl bg-[#1c1833] border border-[#9d86e9]/40 space-y-4 mt-3 animate-fade-in">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white">Choose Avatar Icon</label>
                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                          {AVATARS.map(avatar => (
                            <button
                              key={avatar}
                              onClick={() => setEditAvatar(avatar)}
                              className={`w-full aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${
                                editAvatar === avatar ? 'bg-[#9d86e9]/30 border border-[#9d86e9] scale-110' : 'bg-[#231f3d] hover:bg-[#2e294f]'
                              }`}
                            >
                              {avatar}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-white">Display Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full bg-[#161327] border border-[#2b2746] rounded-xl px-4 py-2.5 text-white text-sm focus:border-[#9d86e9] focus:outline-none"
                          placeholder="Reader"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 rounded-xl bg-[#231f3d] text-white text-xs font-bold hover:bg-[#2b2746]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            updateProfile({ username: editName.trim() || 'Reader', avatar: editAvatar });
                            setIsEditingProfile(false);
                            triggerSaveNotice();
                          }}
                          className="px-4 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] text-xs font-extrabold shadow-sm"
                        >
                          Save Identity
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#2b2746]">
                  <SectionTitle title="Preferences" />
                  <SettingRow label="Default Start Page" desc="Which page to show when you open NEOKO">
                    <SelectPills
                      options={[
                        { id: '/', label: 'Discover' },
                        { id: '/browse', label: 'Browse' },
                        { id: '/library', label: 'Library' },
                        { id: '/updates', label: 'Updates' },
                      ]}
                      value={appSettings.defaultStartPage}
                      onChange={v => updateApp({ defaultStartPage: v as any })}
                    />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* ──── READER ──── */}
            {activeTab === 'reader' && (
              <div className="space-y-1 divide-y divide-surface-container-high">
                <SectionTitle title="Reading Mode" />
                <SettingRow label="Default Mode">
                  <SelectPills
                    options={[{ id: 'webtoon', label: 'Webtoon' }, { id: 'single', label: 'Single' }, { id: 'double', label: 'Double' }]}
                    value={readerSettings.mode}
                    onChange={v => updateReader({ mode: v as any })}
                  />
                </SettingRow>
                <SettingRow label="Fit Mode">
                  <SelectPills
                    options={[{ id: 'width', label: 'Width' }, { id: 'height', label: 'Height' }, { id: 'original', label: 'Original' }]}
                    value={readerSettings.fitMode}
                    onChange={v => updateReader({ fitMode: v as any })}
                  />
                </SettingRow>
                <SettingRow label="Reading Direction">
                  <SelectPills
                    options={[{ id: 'ltr', label: 'Left → Right' }, { id: 'rtl', label: 'Right → Left' }]}
                    value={readerSettings.readingDirection}
                    onChange={v => updateReader({ readingDirection: v as any })}
                  />
                </SettingRow>
                <SectionTitle title="Display" />
                <SettingRow label="Background Color">
                  <SelectPills
                    options={[{ id: 'black', label: 'Black' }, { id: 'dark-grey', label: 'Dark Grey' }, { id: 'white', label: 'White' }]}
                    value={readerSettings.backgroundColor}
                    onChange={v => updateReader({ backgroundColor: v as any })}
                  />
                </SettingRow>
                <SettingRow label="Color Filter">
                  <SelectPills
                    options={[{ id: 'normal', label: 'Normal' }, { id: 'sepia', label: 'Sepia' }, { id: 'dark', label: 'Dark' }, { id: 'invert', label: 'Invert' }]}
                    value={readerSettings.colorFilter}
                    onChange={v => updateReader({ colorFilter: v as any })}
                  />
                </SettingRow>
                <SettingRow label="Show Page Number">
                  <ToggleSwitch active={readerSettings.showPageNumber} onToggle={() => updateReader({ showPageNumber: !readerSettings.showPageNumber })} />
                </SettingRow>
                <SectionTitle title="Behavior" />
                <SettingRow label="Auto-Load Next Chapter">
                  <ToggleSwitch active={readerSettings.autoLoadNextChapter} onToggle={() => updateReader({ autoLoadNextChapter: !readerSettings.autoLoadNextChapter })} />
                </SettingRow>
                <SettingRow label="Preload Pages">
                  <ToggleSwitch active={readerSettings.preloadPages} onToggle={() => updateReader({ preloadPages: !readerSettings.preloadPages })} />
                </SettingRow>
                <SettingRow label="Auto-Scroll Speed" desc={`Speed: ${readerSettings.autoScrollSpeed}`}>
                  <input type="range" min={1} max={5} value={readerSettings.autoScrollSpeed} onChange={e => updateReader({ autoScrollSpeed: Number(e.target.value) })} className="w-28 sm:w-32" />
                </SettingRow>
                <SettingRow label="Default Zoom" desc={`${readerSettings.zoomLevel}%`}>
                  <input type="range" min={50} max={200} step={5} value={readerSettings.zoomLevel} onChange={e => updateReader({ zoomLevel: Number(e.target.value) })} className="w-28 sm:w-32" />
                </SettingRow>
              </div>
            )}

            {/* ──── AI & TRANSLATION ──── */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                {/* Global AI Master Switch */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1c1833] border border-[#9d86e9]/30 flex items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9] flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Enable AI Translation</span>
                        {aiTranslationEnabled ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-extrabold uppercase">
                            Disabled
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#7c779b]">
                        Master toggle to show or hide live AI manga page translation in the reader
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    active={aiTranslationEnabled}
                    onToggle={() => handleToggleAiTranslation(!aiTranslationEnabled)}
                  />
                </div>

                {!aiTranslationEnabled && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>AI Translation is disabled globally. Enable the toggle above to use live manga translation inside the reader.</span>
                  </div>
                )}

                <div className={!aiTranslationEnabled ? 'opacity-40 pointer-events-none transition-all space-y-6' : 'space-y-6 transition-all'}>
                  <div>
                    <SectionTitle title="Google Gemini Vision API Key" />
                    <p className="text-xs text-[#7c779b] mt-1 mb-3">
                      Neoko uses Google's Gemini Vision API for live manga text recognition and translation. Your API key is stored strictly on your device's local storage and sent directly to Google's API endpoint.
                    </p>
                    
                    <div className="p-4 rounded-2xl bg-[#1c1833] border border-[#2b2746] space-y-4">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[#161327] border border-[#2b2746] text-white text-sm focus:outline-none focus:border-[#9d86e9] pr-10 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c779b] hover:text-white transition-colors"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveGeminiKey(geminiApiKey)}
                            className="px-4 py-2.5 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-bold text-xs hover:bg-[#b09cf5] transition-all shadow-md shrink-0"
                          >
                            Save Key
                          </button>
                          <button
                            onClick={handleTestKey}
                            disabled={isTestingKey || !geminiApiKey.trim()}
                            className="px-4 py-2.5 rounded-xl bg-[#231f3d] text-white font-bold text-xs border border-[#2b2746] hover:bg-[#2b2746] disabled:opacity-50 transition-all flex items-center gap-2 shrink-0"
                          >
                            {isTestingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#9d86e9]" />}
                            <span>Test API Key</span>
                          </button>
                        </div>
                      </div>

                      {keyTestStatus && (
                        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                          keyTestStatus.success 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}>
                          {keyTestStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                          <span>{keyTestStatus.message}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-[#7c779b] flex items-center justify-between pt-1">
                        <span>Don't have an API key?</span>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#9d86e9] hover:underline flex items-center gap-1 font-semibold"
                        >
                          Get Free Gemini API Key <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="Target Translation Language" />
                    <p className="text-xs text-[#7c779b] mt-1 mb-3">
                      Select the target language to translate Japanese, Korean, or Chinese manga text into.
                    </p>
                    
                    <div className="p-4 rounded-2xl bg-[#1c1833] border border-[#2b2746]">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          'English', 'Spanish', 'French', 'German',
                          'Italian', 'Portuguese', 'Russian', 'Indonesian',
                          'Vietnamese', 'Thai', 'Arabic', 'Hindi',
                          'Turkish', 'Polish', 'Filipino', 'Chinese'
                        ].map(lang => (
                          <button
                            key={lang}
                            onClick={() => handleSaveTranslationLang(lang)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                              translationLang === lang
                                ? 'bg-[#9d86e9] text-[#0c0c14] border-[#9d86e9] shadow-md'
                                : 'bg-[#161327] text-white border-[#2b2746] hover:bg-[#231f3d]'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionTitle title="How to Use Live AI Translation" />
                    <div className="p-4 rounded-2xl bg-[#1c1833] border border-[#2b2746] space-y-3.5 mt-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          1
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-white">Enable Translation in Reader</h4>
                          <p className="text-[11px] text-[#7c779b]">
                            Open any manga chapter and tap the <span className="text-[#9d86e9] font-bold">Languages icon (文A)</span> in the top header or Reader Settings drawer to activate Live AI Translation.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-white">Tap Any Dialogue to Bring to Front</h4>
                          <p className="text-[11px] text-[#7c779b]">
                            If two speech bubbles overlap each other, simply <span className="text-white font-semibold">tap the dialogue bubble</span> you want to read. It will pop directly to the top layer (<code className="text-[#9d86e9] font-mono">z-50</code>) with a purple highlighted border.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          3
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-white">Immersive Full-Screen Reading</h4>
                          <p className="text-[11px] text-[#7c779b]">
                            Tap anywhere on the reader screen to hide controls. The floating translation badge automatically hides along with reader controls so you get distraction-free reading.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl bg-[#9d86e9]/20 text-[#9d86e9] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          4
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-white">Retranslate & Original Text Tooltips</h4>
                          <p className="text-[11px] text-[#7c779b]">
                            Tap <span className="text-[#9d86e9] font-semibold">Retranslate</span> in the floating pill to bypass cache and refresh page translations. Hover or long-press any speech bubble to view original text.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──── CONTENT & FILTERING ──── */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle title="Content Safety & Active Mode" />
                  <p className="font-sans text-xs text-[#7c779b] mb-3">
                    Select your active browsing mode. Switch between Normal mode and 18+ mode anytime.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        key: 'normal',
                        title: 'Normal Mode',
                        desc: 'Standard manga, manhwa & webtoons. All adult content is hidden.',
                        icon: ShieldCheck,
                        badge: 'Standard',
                      },
                      {
                        key: '18+',
                        title: '18+ Mode',
                        desc: 'Unlocks explicit 18+ adult content, erotica, and adult sources.',
                        icon: Flame,
                        badge: 'Adult (18+)',
                      },
                    ].map(r => {
                      const isSelected = contentSettings.contentRating === r.key;
                      const Icon = r.icon;
                      return (
                        <div
                          key={r.key}
                          onClick={() => {
                            if (r.key === '18+' && contentSettings.contentRating !== '18+') {
                              setShowAgeModal(true);
                            } else {
                              updateContent({ contentRating: r.key as any });
                            }
                          }}
                          className={`group p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? 'bg-[#9d86e9]/15 border-[#9d86e9] shadow-md'
                              : 'bg-[#1c1833] border-[#2b2746] hover:border-[#9d86e9]/40'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-[#9d86e9] text-[#0c0c14] font-bold' : 'bg-[#231f3d] text-[#7c779b]'
                          }`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold text-sm text-white">{r.title}</span>
                              {r.badge && <span className="px-2 py-0.5 rounded-md bg-[#9d86e9]/20 text-[#9d86e9] text-[10px] font-extrabold uppercase">{r.badge}</span>}
                            </div>
                            <p className="font-sans text-xs text-[#7c779b] mt-1">{r.desc}</p>
                          </div>
                          {isSelected && <div className="w-5 h-5 rounded-full bg-[#9d86e9] text-[#0c0c14] flex items-center justify-center shrink-0 mt-0.5"><Check className="w-3.5 h-3.5 stroke-[3]" /></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-extension management shortcut info banner */}
                <div className="p-3 sm:p-4 rounded-2xl bg-[#1c1833] border border-[#2b2746] flex flex-col gap-3 pt-3 sm:pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-sans text-xs font-bold text-white">Manage Individual Extensions & Modes</span>
                      <span className="font-sans text-xs text-[#7c779b] mt-0.5">
                        Enable/disable specific extension sources, or assign individual extensions to Normal or 18+ mode.
                      </span>
                    </div>
                    <button
                      onClick={() => changeTab('sources')}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#231f3d] hover:bg-[#2e294f] text-[#9d86e9] font-extrabold text-xs flex items-center justify-center gap-1.5 border border-[#39335a] transition-all shrink-0 shadow-sm"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Go to Sources & Providers</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ──── SOURCES & PROVIDERS ──── */}
            {activeTab === 'sources' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#2b2746]">
                  <div>
                    <SectionTitle title="Manga Sources & Providers" />
                    <p className="font-sans text-xs text-[#7c779b]">
                      Select which sources supply recommendations to your Home feed and Search catalog. Toggle enabled status or switch extension mode (Normal / 18+).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEnableAllSources}
                      className="px-3.5 py-2 rounded-xl bg-[#231f3d] hover:bg-[#2e294f] text-[#9d86e9] font-bold text-xs flex items-center gap-1.5 border border-[#39335a] transition-all shrink-0 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Enable All</span>
                    </button>
                  </div>
                </div>

                {loadingSources ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-2xl bg-[#1f1b36] animate-pulse" />
                    ))}
                  </div>
                ) : sources.length === 0 ? (
                  <div className="p-8 bg-[#1f1b36] rounded-2xl border border-[#2b2746] text-center text-[#7c779b] text-xs">
                    No sources available. Make sure your server is running.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {sources
                      .filter(src => src.lang === 'en' || src.lang === 'all')
                      .map(src => {
                        const isEnabled = !disabledSourceIds.includes(String(src.id));
                        const isFast = ['Asura Scans', 'Flame Comics', 'Bato.to', 'MangaReader', 'MANGA Plus by SHUEISHA'].some(n => src.name.includes(n));
                        const isDedicatedNsfw = isDedicatedNsfwName(src.name);
                        const currentMode = getExtensionMode(src.id, isDedicatedNsfw);

                        return (
                          <div
                            key={src.id}
                            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                              isEnabled
                                ? 'bg-[#1c1833] border-[#9d86e9]/40 shadow-sm'
                                : 'bg-[#161327] border-[#2b2746] opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isFast ? 'bg-[#9d86e9] text-[#0c0c14]' : 'bg-[#231f3d] text-white'
                              }`}>
                                {src.iconUrl ? (
                                  <img src={src.iconUrl} alt={src.name} className="w-full h-full rounded-xl object-cover" />
                                ) : (
                                  src.name.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-display font-bold text-sm text-white break-words leading-tight">
                                    {src.name}
                                  </span>
                                  {isFast && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#9d86e9]/20 text-[#9d86e9] text-[9px] font-extrabold uppercase shrink-0">
                                      FAST
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#7c779b] font-semibold uppercase mt-0.5">
                                  {src.lang} • {isEnabled ? (currentMode === '18+' ? '🔴 18+ Mode' : '🟢 Normal Mode') : '⚪ Disabled (OFF)'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2b2746]/60">
                              {/* Extension Mode Pills */}
                              <div className="flex items-center bg-[#120f23] p-1 rounded-xl border border-[#2b2746]">
                                <button
                                  type="button"
                                  onClick={() => handleToggleExtensionMode(src.id, src.name, 'normal')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentMode === 'normal'
                                      ? 'bg-[#9d86e9] text-[#0c0c14] shadow-sm'
                                      : 'text-[#7c779b] hover:text-white'
                                  }`}
                                  title="Normal Mode"
                                >
                                  Normal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleExtensionMode(src.id, src.name, '18+')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentMode === '18+'
                                      ? 'bg-[#ef4444] text-white shadow-sm'
                                      : 'text-[#7c779b] hover:text-white'
                                  }`}
                                  title="18+ Mode"
                                >
                                  18+
                                </button>
                              </div>

                              <ToggleSwitch
                                active={isEnabled}
                                onToggle={() => handleToggleSource(src.id)}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* ──── LIBRARY ──── */}
            {activeTab === 'library' && (
              <div className="space-y-4">
                <SectionTitle title="Categories" />
                <div className="space-y-2">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-surface-container-highest">
                      <div className="flex flex-col">
                        <span className="font-sans text-sm font-semibold text-on-surface">{cat.name}</span>
                        <span className="text-[11px] text-outline">{cat.mangaCount || 0} manga{cat.default ? ' • Default' : ''}</span>
                      </div>
                      {!cat.default && (
                        <button onClick={() => handleDeleteCategory(cat.id)} className="w-8 h-8 rounded-lg text-outline hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 glass-input rounded-xl px-4 py-2.5 text-on-surface font-sans text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button onClick={handleAddCategory} className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            )}

            {/* ──── TRACKING ──── */}
            {activeTab === 'tracking' && (
              <div className="space-y-4">
                <SectionTitle title="Manga Trackers" />
                <p className="font-sans text-xs text-outline">Connect your MyAnimeList and AniList accounts to automatically sync reading progress across devices.</p>
                <div className="space-y-3">
                  {trackers.map(tracker => (
                    <div key={tracker.id} className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      tracker.isLoggedIn ? 'bg-[#9d86e9]/10 border-[#9d86e9]/40' : 'bg-[#161327] border-[#2b2746]'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={tracker.icon} alt={tracker.name} className="w-10 h-10 rounded-xl bg-[#231f3d] object-cover" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-display font-bold text-sm text-white">{tracker.name}</span>
                          <span className="text-[11px] text-[#7c779b]">
                            {tracker.isLoggedIn ? `Connected • ${tracker.trackRecords.totalCount} tracked manga` : 'Not connected'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {tracker.isLoggedIn ? (
                          <button
                            onClick={async () => { await logoutTracker(tracker.id); await loadTrackers(); showToast(`Logged out of ${tracker.name}`, 'info'); }}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-xs flex items-center gap-1.5 hover:bg-rose-500/20 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Logout
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTrackerForLogin(tracker);
                              setTrackerLoginMode(tracker.authUrl ? 'oauth' : 'credentials');
                              setOAuthCallbackInput('');
                              setTrackerUsername('');
                              setTrackerPassword('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#8b70e5] transition-colors shadow-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {trackers.length === 0 && (
                    <div className="p-8 rounded-2xl bg-[#161327] border border-[#2b2746] text-center text-[#7c779b] text-xs">
                      No trackers available from Suwayomi server. Ensure backend server is connected.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ──── APPEARANCE ──── */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <SectionTitle title="App Theme" />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {[
                      { id: 'dark', name: 'Dark', bg: '#0c0c14', border: '#2b2746', text: '#e2e1ec' },
                      { id: 'amoled', name: 'AMOLED', bg: '#000000', border: '#222222', text: '#ffffff' },
                      { id: 'midnight', name: 'Midnight', bg: '#070b19', border: '#1e293b', text: '#e0e7ff' },
                      { id: 'light', name: 'Light', bg: '#f8fafc', border: '#cbd5e1', text: '#0f172a' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          updateApp({ theme: t.id as any });
                        }}
                        className={`p-3 rounded-2xl border flex flex-col gap-2.5 items-center justify-between text-left transition-all ${
                          appSettings.theme === t.id
                            ? 'ring-2 ring-[#9d86e9] border-[#9d86e9]'
                            : 'hover:border-white/20'
                        }`}
                        style={{ backgroundColor: t.bg, borderColor: t.border }}
                      >
                        <div className="w-full h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-inner" style={{ backgroundColor: t.border, color: t.text }}>
                          Preview
                        </div>
                        <span className="text-xs font-bold" style={{ color: t.text }}>
                          {t.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 divide-y divide-surface-container-high pt-2 border-t border-[#2b2746]">
                  <SettingRow label="Manga Card Size">
                    <SelectPills
                      options={[{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]}
                      value={appSettings.cardSize}
                      onChange={v => updateApp({ cardSize: v as any })}
                    />
                  </SettingRow>
                  <SettingRow label="Grid Columns" desc={`${appSettings.gridColumns} columns`}>
                    <input type="range" min={2} max={6} value={appSettings.gridColumns} onChange={e => updateApp({ gridColumns: Number(e.target.value) })} className="w-28 sm:w-32" />
                  </SettingRow>
                  <SettingRow label="Animations">
                    <ToggleSwitch active={appSettings.animationsEnabled} onToggle={() => updateApp({ animationsEnabled: !appSettings.animationsEnabled })} />
                  </SettingRow>
                  <SettingRow label="Reduced Motion">
                    <ToggleSwitch active={appSettings.reducedMotion} onToggle={() => updateApp({ reducedMotion: !appSettings.reducedMotion })} />
                  </SettingRow>
                </div>
              </div>
            )}

            {/* ──── DATA & PRIVACY ──── */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <SectionTitle title="512MB Cache Storage" />
                {(() => {
                  const stats = getCacheUsageStats();
                  return (
                    <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] space-y-2.5 shadow-lg">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white">Intelligent Cache Storage</span>
                        <span className="text-[#9d86e9]">{stats.usedMB} MB / 512 MB ({stats.percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[#231f3d] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#8b5cf6] via-[#9d86e9] to-[#ec4899] rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(2, stats.percent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#7c779b]">
                        <span>{stats.itemCount} items stored (Search results, Manga details, Chapters)</span>
                        <span>Max 512 MB</span>
                      </div>
                    </div>
                  );
                })()}

                <SectionTitle title="Export & Import" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={handleExportData} className="p-4 rounded-2xl bg-surface-container-high border border-surface-container-highest hover:border-primary/40 flex items-center gap-3 transition-all">
                    <FileDown className="w-5 h-5 text-primary" />
                    <div className="flex flex-col text-left">
                      <span className="font-sans text-sm font-bold text-on-surface">Export Data</span>
                      <span className="text-[11px] text-outline">Download all settings & bookmarks</span>
                    </div>
                  </button>
                  <button onClick={handleImportData} className="p-4 rounded-2xl bg-surface-container-high border border-surface-container-highest hover:border-primary/40 flex items-center gap-3 transition-all">
                    <Upload className="w-5 h-5 text-primary" />
                    <div className="flex flex-col text-left">
                      <span className="font-sans text-sm font-bold text-on-surface">Import Data</span>
                      <span className="text-[11px] text-outline">Restore from JSON backup</span>
                    </div>
                  </button>
                </div>

                <SectionTitle title="Clear Data" />
                <div className="space-y-2">
                  <button onClick={() => { clearHistory(); showToast('History cleared'); }} className="w-full p-3 rounded-xl bg-surface-container-high border border-surface-container-highest hover:border-error/40 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                      <RotateCcw className="w-4 h-4 text-outline" />
                      <span className="font-sans text-sm text-on-surface">Clear Reading History</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-outline" />
                  </button>
                  <button onClick={() => { clearApiCache(); showToast('Cache cleared'); setStorageInfo(getStorageUsage()); }} className="w-full p-3 rounded-xl bg-surface-container-high border border-surface-container-highest hover:border-error/40 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-4 h-4 text-outline" />
                      <span className="font-sans text-sm text-on-surface">Clear Cached Data</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-outline" />
                  </button>
                </div>

                <SectionTitle title="Danger Zone" />
                <button
                  onClick={() => {
                    if (confirm('Are you sure? This will delete ALL your data including bookmarks, history, and settings.')) {
                      clearAllData();
                      window.location.reload();
                    }
                  }}
                  className="w-full p-4 rounded-xl bg-error/10 border border-error/30 hover:bg-error/20 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-error" />
                    <div className="flex flex-col text-left">
                      <span className="font-sans text-sm font-bold text-error">Factory Reset</span>
                      <span className="text-[11px] text-error/70">Delete all data and start fresh</span>
                    </div>
                  </div>
                  <Trash2 className="w-4 h-4 text-error" />
                </button>
              </div>
            )}

            {/* ──── ABOUT ──── */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#9d86e9] to-[#7c5ce9] flex items-center justify-center shadow-lg mb-3">
                    <Flame className="w-8 h-8 text-white fill-current animate-pulse" />
                  </div>
                  <h2 className="font-display font-black text-2xl text-white">NEOKO</h2>
                  <p className="text-xs text-[#7c779b] mt-1">Next-Gen Ad-Free Manga Stream & Web Reader</p>
                </div>

                {/* Developer Profile Card */}
                <div className="p-5 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-3 shadow-xl">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80"
                      alt="Prathxm"
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-[#9d86e9]"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-base text-white">Prathxm</h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#9d86e9]/20 text-[#9d86e9] font-bold text-[10px]">
                          Creator & Developer
                        </span>
                      </div>
                      <span className="text-xs text-[#7c779b]">Lead Developer of NEOKO</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed border-t border-[#2b2746] pt-3">
                    Hey! I'm <strong>Prathxm</strong>. I built <strong>NEOKO</strong> for the cleanest manga experience. Currently, NEOKO is hosted locally on my personal laptop (which is why it may feel a bit slow at times). I am raising funds to move it to a 24/7 dedicated high-speed cloud server!
                  </p>
                </div>

                <SectionTitle title="Connect & Support" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <RazorpayDonateButton />

                  <a
                    href="https://discord.gg/bcw3dV6Jnt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] hover:border-[#5865f2]/50 flex items-center gap-3 transition-all group"
                  >
                    <MessageSquare className="w-5 h-5 text-[#5865f2] group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-xs text-white">Discord Community & Feedback</span>
                      <span className="text-[10px] text-[#7c779b]">Join our Discord server for updates & feedback</span>
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>

        <AgeVerificationModal
          isOpen={showAgeModal}
          onConfirm={() => {
            updateContent({ contentRating: '18+' });
            setShowAgeModal(false);
          }}
          onCancel={() => {
            setShowAgeModal(false);
          }}
        />

        {/* Tracker Login & OAuth Authorization Modal */}
        {selectedTrackerForLogin && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[#161327] border border-[#2b2746] rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2b2746]">
                <div className="flex items-center gap-3">
                  <img src={selectedTrackerForLogin.icon} alt={selectedTrackerForLogin.name} className="w-8 h-8 rounded-lg object-cover bg-[#231f3d]" />
                  <h3 className="font-bold text-sm text-white">Connect {selectedTrackerForLogin.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedTrackerForLogin(null)}
                  className="p-1 text-[#7c779b] hover:text-white rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center bg-[#1c1833] p-1 rounded-xl border border-[#2b2746]">
                {selectedTrackerForLogin.authUrl && (
                  <button
                    onClick={() => setTrackerLoginMode('oauth')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      trackerLoginMode === 'oauth' ? 'bg-[#9d86e9] text-[#0c0c14]' : 'text-[#7c779b] hover:text-white'
                    }`}
                  >
                    OAuth Browser Login
                  </button>
                )}
                <button
                  onClick={() => setTrackerLoginMode('credentials')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    trackerLoginMode === 'credentials' ? 'bg-[#9d86e9] text-[#0c0c14]' : 'text-[#7c779b] hover:text-white'
                  }`}
                >
                  Username & Password
                </button>
              </div>

              {trackerLoginMode === 'oauth' && selectedTrackerForLogin.authUrl && (
                <div className="space-y-4 pt-1">
                  <div className="p-3 rounded-xl bg-[#1c1833] border border-[#2b2746] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Step 1: Authorize in Browser</span>
                      <a
                        href={selectedTrackerForLogin.authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#9d86e9] text-[#0c0c14] font-extrabold text-[11px] hover:bg-[#8b70e5] flex items-center gap-1 shrink-0"
                      >
                        <span>Open {selectedTrackerForLogin.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-[#7c779b]">
                      Log in to your account and approve access. If the browser redirects to a blank page or error (e.g. <code className="text-[#9d86e9] font-mono">localhost:4567</code>), copy the entire address bar URL.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#9d86e9] uppercase tracking-wider">
                      Step 2: Paste Redirected URL or Code
                    </label>
                    <textarea
                      rows={2}
                      value={oAuthCallbackInput}
                      onChange={(e) => setOAuthCallbackInput(e.target.value)}
                      placeholder="Paste address bar URL (e.g. http://localhost:4567/api/v1/tracker/login/2?code=...) or authorization code"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1c1833] border border-[#2b2746] text-white text-xs focus:outline-none focus:border-[#9d86e9] font-mono"
                    />
                  </div>

                  <button
                    onClick={handleCompleteOAuthLogin}
                    disabled={trackerLoginLoading || !oAuthCallbackInput.trim()}
                    className="w-full py-3 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-extrabold text-xs hover:bg-[#8b70e5] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#9d86e9]/20 cursor-pointer"
                  >
                    {trackerLoginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Verify & Complete Login</span>
                  </button>
                </div>
              )}

              {trackerLoginMode === 'credentials' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#7c779b]">Username / Email</label>
                    <input
                      type="text"
                      value={trackerUsername}
                      onChange={(e) => setTrackerUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1c1833] border border-[#2b2746] text-white text-xs focus:outline-none focus:border-[#9d86e9]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#7c779b]">Password</label>
                    <input
                      type="password"
                      value={trackerPassword}
                      onChange={(e) => setTrackerPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1c1833] border border-[#2b2746] text-white text-xs focus:outline-none focus:border-[#9d86e9]"
                    />
                  </div>
                  <button
                    onClick={handleCompleteCredentialLogin}
                    disabled={trackerLoginLoading || !trackerUsername.trim() || !trackerPassword.trim()}
                    className="w-full py-3 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-extrabold text-xs hover:bg-[#8b70e5] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#9d86e9]/20 cursor-pointer"
                  >
                    {trackerLoginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                    <span>Login to {selectedTrackerForLogin.name}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
  );
};

export default SettingsPage;

