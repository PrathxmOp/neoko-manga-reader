import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  getReaderSettings, saveReaderSettings, getContentFilterSettings, saveContentFilterSettings,
  getAppSettings, saveAppSettings, clearApiCache, clearHistory, getBookmarks,
  exportAllData, importAllData, clearAllData, getStorageUsage,
  getDisabledSourceIds, isSourceEnabled, toggleSourceEnabled
} from '../services/storage';
import { getTrackers, loginTrackerCredentials, logoutTracker, getServerInfo, clearCachedImages, getCategories, createCategory, deleteCategory, getSources } from '../services/suwayomiApi';
import { getCacheUsageStats } from '../services/cacheManager';
import { ReaderSettings, ContentFilterSettings, AppSettings, TrackerInfo, Category, ServerInfo, Source } from '../types/manga';
import {
  Settings, BookOpen, Eye, Library, Download, Bell, Palette, Database, Info,
  ChevronRight, Check, ShieldCheck, Heart, Sparkles, Flame, Monitor, Moon, Sun,
  RotateCcw, Trash2, Upload, FileDown, ExternalLink, Github, MessageCircle,
  RefreshCw, Plus, X, LogOut, AlertCircle, HardDrive, Radio, Send, Edit3
} from 'lucide-react';

const AVATARS = ['🔮', '⚡', '🔥', '🌸', '🎭', '🐉', '🌙', '💎', '🎨', '🦊', '🌊', '⭐'];

type SettingsTab = 'general' | 'reader' | 'content' | 'sources' | 'library' | 'tracking' | 'appearance' | 'data' | 'about';

const TABS: { id: SettingsTab; label: string; icon: any }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'reader', label: 'Reader', icon: BookOpen },
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

  // Tracker credential modal state
  const [selectedTrackerForLogin, setSelectedTrackerForLogin] = useState<TrackerInfo | null>(null);
  const [trackerUsername, setTrackerUsername] = useState('');
  const [trackerPassword, setTrackerPassword] = useState('');
  const [trackerLoginLoading, setTrackerLoginLoading] = useState(false);

  useEffect(() => {
    loadTrackers();
    loadCategories();
    loadServerInfo();
    loadMangaSources();
  }, []);

  const loadTrackers = async () => { setTrackers(await getTrackers()); };
  const loadCategories = async () => { setCategories(await getCategories()); };
  const loadServerInfo = async () => { setServerInfo(await getServerInfo()); };
  const loadMangaSources = async () => {
    setLoadingSources(true);
    try {
      const list = await getSources();
      setSources(list);
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
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[#2b2746]/60 last:border-none">
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
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
        {showSavedBadge && (
          <span className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 animate-fade-in shrink-0 shadow-sm">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Saved</span>
          </span>
        )}
      </div>

      {/* 2. Kagane Horizontal Category Pill Tabs */}
      <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-[#9d86e9] text-[#0c0c14] shadow-md'
                  : 'bg-[#161327] text-white hover:bg-[#231f3d] border border-[#2b2746]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Kagane Settings Section Container */}
      <div className="bg-[#161327] rounded-2xl border border-[#2b2746] p-5 shadow-xl animate-fade-in-up" key={activeTab}>
            {/* ──── GENERAL ──── */}
            {activeTab === 'general' && (
              <div className="space-y-5">
                <div>
                  <SectionTitle title="Reader Profile Identity" />
                  <div className="p-4 rounded-2xl bg-[#1c1833] border border-[#2b2746] flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-[#231f3d] flex items-center justify-center text-3xl border border-[#9d86e9]/30 shadow-md shrink-0">
                        {user?.avatar || '🔮'}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
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
                      className="px-4 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#8b70e5] transition-colors shadow-sm shrink-0"
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
                  <input type="range" min={1} max={5} value={readerSettings.autoScrollSpeed} onChange={e => updateReader({ autoScrollSpeed: Number(e.target.value) })} className="w-32" />
                </SettingRow>
                <SettingRow label="Default Zoom" desc={`${readerSettings.zoomLevel}%`}>
                  <input type="range" min={50} max={200} step={5} value={readerSettings.zoomLevel} onChange={e => updateReader({ zoomLevel: Number(e.target.value) })} className="w-32" />
                </SettingRow>
              </div>
            )}

            {/* ──── CONTENT & FILTERING ──── */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                <SectionTitle title="Content Safety & Rating" />
                <p className="font-sans text-xs text-[#7c779b] mb-3">
                  Choose content filters for search results, browse catalog, and home recommendations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'Safe', title: 'Safe', desc: 'Family-friendly content. No mature themes.', icon: ShieldCheck },
                    { key: 'Suggestive', title: 'Suggestive', desc: 'Mild fan service and romantic themes.', icon: Heart, badge: 'Recommended' },
                    { key: 'Erotica', title: 'Erotica', desc: 'Sexual content and mature themes.', icon: Sparkles },
                    { key: 'All', title: 'All Content (18+)', desc: 'All content including explicit material.', icon: Flame },
                  ].map(r => {
                    const isSelected = contentSettings.contentRating === r.key;
                    const Icon = r.icon;
                    return (
                      <div
                        key={r.key}
                        onClick={() => {
                          updateContent({ contentRating: r.key as any });
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
            )}

            {/* ──── SOURCES & PROVIDERS ──── */}
            {activeTab === 'sources' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#2b2746]">
                  <div>
                    <SectionTitle title="Manga Sources & Providers" />
                    <p className="font-sans text-xs text-[#7c779b]">
                      Select which sources supply recommendations to your Home feed and Search catalog. All sources are ON by default — toggle off any source you wish to disable.
                    </p>
                  </div>
                  <button
                    onClick={handleEnableAllSources}
                    className="px-3.5 py-2 rounded-xl bg-[#231f3d] hover:bg-[#2e294f] text-[#9d86e9] font-bold text-xs flex items-center gap-1.5 border border-[#39335a] transition-all shrink-0 self-start sm:self-auto shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enable All Sources</span>
                  </button>
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

                        return (
                          <div
                            key={src.id}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                              isEnabled
                                ? 'bg-[#1c1833] border-[#9d86e9]/40 shadow-sm'
                                : 'bg-[#161327] border-[#2b2746] opacity-75'
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
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-display font-bold text-sm text-white truncate">
                                    {src.name}
                                  </span>
                                  {isFast && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#9d86e9]/20 text-[#9d86e9] text-[9px] font-extrabold uppercase shrink-0">
                                      FAST
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#7c779b] font-semibold uppercase">
                                  {src.lang} {isEnabled ? '• Enabled' : '• Disabled'}
                                </span>
                              </div>
                            </div>

                            <ToggleSwitch
                              active={isEnabled}
                              onToggle={() => handleToggleSource(src.id)}
                            />
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
                <p className="font-sans text-xs text-outline">Connect your MyAnimeList, AniList, and other manga tracking accounts to automatically sync reading progress across devices.</p>
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
                        ) : tracker.authUrl ? (
                          <a
                            href={tracker.authUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#8b70e5] transition-colors shadow-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Connect
                          </a>
                        ) : (
                          <span className="text-[11px] text-[#7c779b] italic">Not available</span>
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
                    <input type="range" min={2} max={6} value={appSettings.gridColumns} onChange={e => updateApp({ gridColumns: Number(e.target.value) })} className="w-32" />
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
                    Hey! I'm <strong>Prathxm</strong>. I built <strong>NEOKO</strong> to create the cleanest, fastest, and most modern manga reading experience — completely free from intrusive ads or bloatware.
                  </p>
                </div>

                <SectionTitle title="Connect & Support" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://buymeachai.in/prathxm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] hover:border-[#ec4899]/50 flex items-center gap-3 transition-all group"
                  >
                    <Heart className="w-5 h-5 text-[#ec4899] fill-current group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-xs text-white">Server & Domain Fund ($30 / ₹2,500)</span>
                      <span className="text-[10px] text-[#7c779b]">Donate to buy custom domain & dedicated server</span>
                    </div>
                  </a>

                  <a
                    href="https://telegram.me/NEOKO_OFFICIAL"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] hover:border-[#38bdf8]/50 flex items-center gap-3 transition-all group"
                  >
                    <Send className="w-5 h-5 text-[#38bdf8] group-hover:scale-110 transition-transform" />
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-xs text-white">Telegram Community & Feedback</span>
                      <span className="text-[10px] text-[#7c779b]">Join @NEOKO_OFFICIAL for updates & feedback</span>
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>
    </main>
  );
};
