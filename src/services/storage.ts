import { BookmarkItem, HistoryItem, Manga, ReaderSettings, ContentFilterSettings, AppSettings, UserProfile, ReadingStats, MangaCollection, ChapterNote, Chapter } from '../types/manga';
import { isDefault18Plus } from '../config/extensionRules';

const BOOKMARKS_KEY = 'neoko_manga_bookmarks';
const HISTORY_KEY = 'neoko_manga_history';
const ENABLED_SOURCES_KEY = 'neoko_enabled_sources_v2';
const READ_CHAPTERS_KEY = 'neoko_read_chapters';
const READER_SETTINGS_KEY = 'neoko_reader_settings';
const CONTENT_FILTER_KEY = 'neoko_content_filter';
const APP_SETTINGS_KEY = 'neoko_app_settings';
const USER_PROFILE_KEY = 'neoko_user_profile';
const STATS_KEY = 'neoko_reading_stats';
const COLLECTIONS_KEY = 'neoko_manga_collections';
const NOTES_KEY = 'neoko_chapter_notes';
const GEMINI_API_KEY = 'neoko_gemini_api_key';
const TRANSLATION_LANG_KEY = 'neoko_translation_language';
const AI_TRANSLATION_ENABLED_KEY = 'neoko_ai_translation_enabled';
const API_CACHE_PREFIX = 'neoko_cache_';

import { getAppCache, setAppCache, clearAppCache } from './cacheManager';

// ──────────────── Safe LocalStorage Helper ────────────────

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      console.warn(`[Storage] QuotaExceededError writing key "${key}". Clearing API cache and retrying...`);
      clearApiCache();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.error(`[Storage] Failed to set "${key}" even after clearing cache:`, retryErr);
        return false;
      }
    }
    return false;
  }
}

// ──────────────── Client-side Intelligent Cache ────────────────

export function getCachedData<T>(key: string): T | null {
  return getAppCache<T>(API_CACHE_PREFIX + key);
}

export function setCachedData<T>(key: string, data: T, ttlMinutes: number = 60 * 24 * 30) {
  setAppCache<T>(API_CACHE_PREFIX + key, data, ttlMinutes);
}

export function clearApiCache() {
  if (typeof localStorage !== 'undefined') {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(API_CACHE_PREFIX) || key.startsWith('neoko_cache_') || key.startsWith('neoko_anilist_')) {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    });
  }
}

// ──────────────── Bookmarks ────────────────

export function getBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmark(manga: Manga, category: BookmarkItem['category'] = 'Reading'): BookmarkItem[] {
  const bookmarks = getBookmarks();
  const existingIdx = bookmarks.findIndex(b => String(b.manga.id) === String(manga.id));

  if (existingIdx >= 0) {
    bookmarks[existingIdx].category = category;
  } else {
    bookmarks.push({
      manga,
      addedAt: Date.now(),
      category,
    });
  }

  safeSetItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_bookmarks_changed'));
  }
  return bookmarks;
}

export function removeBookmark(mangaId: string | number): BookmarkItem[] {
  const bookmarks = getBookmarks().filter(b => String(b.manga.id) !== String(mangaId));
  safeSetItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_bookmarks_changed'));
  }
  return bookmarks;
}

export function isBookmarked(mangaId: string | number): boolean {
  return getBookmarks().some(b => String(b.manga.id) === String(mangaId));
}

export function getBookmarkCategory(mangaId: string | number): BookmarkItem['category'] | null {
  const item = getBookmarks().find(b => String(b.manga.id) === String(mangaId));
  return item ? item.category : null;
}

// ──────────────── Incognito Mode ────────────────

let isIncognitoActive = false;

export function getIncognitoMode(): boolean {
  return isIncognitoActive;
}

export function setIncognitoMode(enabled: boolean): boolean {
  isIncognitoActive = enabled;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_incognito_changed'));
  }
  return isIncognitoActive;
}

export function toggleIncognitoMode(): boolean {
  return setIncognitoMode(!isIncognitoActive);
}

// ──────────────── History ────────────────

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistoryItem(item: Omit<HistoryItem, 'readAt'>): HistoryItem[] {
  if (isIncognitoActive) {
    // In incognito mode: do not save history or auto-bookmark, but do mark chapter read
    markChapterRead(item.chapterId);
    return getHistory();
  }

  const history = getHistory().filter(h => String(h.mangaId) !== String(item.mangaId) || String(h.chapterId) !== String(item.chapterId));
  const newItem: HistoryItem = {
    ...item,
    readAt: Date.now(),
  };
  const updated = [newItem, ...history].slice(0, 100);
  safeSetItem(HISTORY_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_history_changed'));
  }

  markChapterRead(item.chapterId);

  // Automatically add manga to "Reading" category in Library if not bookmarked yet (or if currently in "Plan to Read")
  if (item.mangaId && item.mangaTitle) {
    const currentCat = getBookmarkCategory(item.mangaId);
    if (!currentCat || currentCat === 'Plan to Read') {
      const manga: Manga = {
        id: String(item.mangaId),
        title: item.mangaTitle,
        thumbnailUrl: item.thumbnailUrl,
        sourceId: '',
        sourceName: '',
      };
      saveBookmark(manga, 'Reading');
    }
  }

  return updated;
}

export function removeHistoryItem(mangaId: string | number, chapterId?: string | number): HistoryItem[] {
  const history = getHistory().filter(h => {
    if (chapterId !== undefined) {
      return !(String(h.mangaId) === String(mangaId) && String(h.chapterId) === String(chapterId));
    }
    return String(h.mangaId) !== String(mangaId);
  });
  safeSetItem(HISTORY_KEY, JSON.stringify(history));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_history_changed'));
  }
  return history;
}

export function clearHistory(): void {
  safeSetItem(HISTORY_KEY, JSON.stringify([]));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_history_changed'));
  }
}

// ──────────────── Read Chapters ────────────────

export function getReadChapters(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_CHAPTERS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markChapterRead(chapterId: string | number, genres: string[] = []) {
  const set = getReadChapters();
  const idStr = String(chapterId);
  const wasAlreadyRead = set.has(idStr);
  set.add(idStr);
  safeSetItem(READ_CHAPTERS_KEY, JSON.stringify(Array.from(set)));
  if (!wasAlreadyRead) {
    updateReadingStats(1, 3, genres);
  }
}

export function markChapterUnread(chapterId: string | number) {
  const set = getReadChapters();
  set.delete(String(chapterId));
  safeSetItem(READ_CHAPTERS_KEY, JSON.stringify(Array.from(set)));
}

export function markAllChaptersRead(chapterIds: (string | number)[], genres: string[] = []) {
  const set = getReadChapters();
  let newlyReadCount = 0;
  chapterIds.forEach(id => {
    const idStr = String(id);
    if (!set.has(idStr)) {
      set.add(idStr);
      newlyReadCount++;
    }
  });
  safeSetItem(READ_CHAPTERS_KEY, JSON.stringify(Array.from(set)));
  if (newlyReadCount > 0) {
    updateReadingStats(newlyReadCount, newlyReadCount * 3, genres);
  }
}

export function markAllChaptersUnread(chapterIds: (string | number)[]) {
  const set = getReadChapters();
  chapterIds.forEach(id => {
    set.delete(String(id));
  });
  safeSetItem(READ_CHAPTERS_KEY, JSON.stringify(Array.from(set)));
}

export function toggleChapterRead(chapterId: string | number, genres: string[] = []): boolean {
  const set = getReadChapters();
  const idStr = String(chapterId);
  let isNowRead = false;
  if (set.has(idStr)) {
    set.delete(idStr);
  } else {
    set.add(idStr);
    isNowRead = true;
  }
  safeSetItem(READ_CHAPTERS_KEY, JSON.stringify(Array.from(set)));
  if (isNowRead) {
    updateReadingStats(1, 3, genres);
  }
  return set.has(idStr);
}

export function isChapterRead(chapterId: string | number): boolean {
  return getReadChapters().has(String(chapterId));
}

// ──────────────── Downloaded Chapters ────────────────

const DOWNLOADED_CHAPTERS_KEY = 'neoko_downloaded_chapters_v1';

export function getDownloadedChapters(): Set<string> {
  try {
    const raw = localStorage.getItem(DOWNLOADED_CHAPTERS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markChapterDownloaded(chapterId: string | number) {
  const set = getDownloadedChapters();
  set.add(String(chapterId));
  safeSetItem(DOWNLOADED_CHAPTERS_KEY, JSON.stringify(Array.from(set)));
}

export function isChapterDownloaded(chapterId: string | number): boolean {
  return getDownloadedChapters().has(String(chapterId));
}

// ──────────────── Source Selection ────────────────

const DISABLED_SOURCES_KEY = 'neoko_disabled_sources_v1';

export function getDisabledSourceIds(): string[] {
  try {
    const raw = localStorage.getItem(DISABLED_SOURCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

export function isSourceEnabled(sourceId?: string | number, sourceName?: string): boolean {
  const disabled = getDisabledSourceIds();
  if (disabled.length === 0) return true;

  if (sourceId && disabled.includes(String(sourceId))) {
    return false;
  }
  if (sourceName) {
    const sNameLower = sourceName.toLowerCase().trim();
    const isNameDisabled = disabled.some(d => d.toLowerCase().trim() === sNameLower);
    if (isNameDisabled) return false;
  }
  return true;
}

export function toggleSourceEnabled(sourceId: string | number, sourceName?: string): boolean {
  const disabled = getDisabledSourceIds();
  const idStr = String(sourceId);
  const nameStr = sourceName ? String(sourceName).trim() : undefined;

  const isCurrentlyDisabled = disabled.includes(idStr) || (nameStr && disabled.some(d => d.toLowerCase().trim() === nameStr.toLowerCase()));

  let updated: string[];
  if (isCurrentlyDisabled) {
    // Enable by removing both idStr and nameStr
    updated = disabled.filter(d => {
      const dLower = d.toLowerCase().trim();
      if (d === idStr) return false;
      if (nameStr && dLower === nameStr.toLowerCase()) return false;
      return true;
    });
  } else {
    // Disable by adding idStr and nameStr
    updated = [...disabled, idStr];
    if (nameStr && !updated.includes(nameStr)) {
      updated.push(nameStr);
    }
  }

  safeSetItem(DISABLED_SOURCES_KEY, JSON.stringify(updated));
  clearApiCache();
  window.dispatchEvent(new Event('neoko_content_filter_changed'));
  return !updated.includes(idStr); // returns true if now enabled
}

export function getEnabledSourceIds(allSourceIds?: string[]): string[] {
  const disabled = getDisabledSourceIds();
  if (allSourceIds && allSourceIds.length > 0) {
    return allSourceIds.filter(id => !disabled.includes(String(id)));
  }
  return [];
}

export function setEnabledSourceIds(sourceIds: string[]) {
  // Legacy support
  safeSetItem(ENABLED_SOURCES_KEY, JSON.stringify(sourceIds));
}

// ──────────────── Content Filter ────────────────

export function getContentFilterSettings(): ContentFilterSettings {
  try {
    const raw = localStorage.getItem(CONTENT_FILTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let contentRating: 'normal' | '18+' = 'normal';
      if (parsed.contentRating === '18+' || parsed.contentRating === 'All' || parsed.contentRating === 'Erotica') {
        contentRating = '18+';
      } else {
        contentRating = 'normal';
      }
      return {
        contentRating,
        languages: ['en'],
        extensionModes: parsed.extensionModes || {},
      };
    }
  } catch {
    // fallback
  }
  return { contentRating: 'normal', languages: ['en'], extensionModes: {} };
}

export function saveContentFilterSettings(settings: Partial<ContentFilterSettings>): ContentFilterSettings {
  const current = getContentFilterSettings();
  const updated = { ...current, ...settings };
  safeSetItem(CONTENT_FILTER_KEY, JSON.stringify(updated));
  clearApiCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_content_filter_changed'));
  }
  return updated;
}

export function getExtensionModes(): Record<string, 'normal' | '18+'> {
  return getContentFilterSettings().extensionModes || {};
}

export function getExtensionMode(sourceIdOrName: string | number, isNsfwDefault: boolean = false): 'normal' | '18+' {
  const modes = getExtensionModes();
  const key = String(sourceIdOrName).trim();
  const lowerKey = key.toLowerCase();

  // Look for exact key or case-insensitive match
  if (modes[key]) return modes[key];
  const matchedKey = Object.keys(modes).find(k => k.toLowerCase() === lowerKey);
  if (matchedKey && modes[matchedKey]) return modes[matchedKey];

  // Check centralized default rules
  if (isDefault18Plus(key)) return '18+';

  // Default assignment: if porno/erotica/nsfw -> '18+', else -> 'normal'
  return isNsfwDefault ? '18+' : 'normal';
}

export function setExtensionMode(sourceIdOrName: string | number, mode: 'normal' | '18+'): Record<string, 'normal' | '18+'> {
  const settings = getContentFilterSettings();
  const key = String(sourceIdOrName).trim();
  const extensionModes = { ...(settings.extensionModes || {}), [key]: mode };
  saveContentFilterSettings({ extensionModes });
  return extensionModes;
}

// ──────────────── Reader Settings ────────────────

export function getReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(READER_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : getDefaultReaderSettings();
  } catch {
    return getDefaultReaderSettings();
  }
}

function getDefaultReaderSettings(): ReaderSettings {
  return {
    mode: 'webtoon',
    fitMode: 'width',
    zoomLevel: 100,
    gapSize: 0,
    autoLoadNextChapter: true,
    readingDirection: 'ltr',
    backgroundColor: 'black',
    showPageNumber: true,
    autoScrollSpeed: 2,
    colorFilter: 'normal',
    preloadPages: true,
  };
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  const current = getReaderSettings();
  const updated = { ...current, ...settings };
  safeSetItem(READER_SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

// ──────────────── App Settings ────────────────

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : getDefaultAppSettings();
  } catch {
    return getDefaultAppSettings();
  }
}

function getDefaultAppSettings(): AppSettings {
  return {
    theme: 'dark',
    defaultStartPage: '/',
    cardSize: 'medium',
    gridColumns: 5,
    animationsEnabled: true,
    reducedMotion: false,
  };
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const updated = { ...current, ...settings };
  safeSetItem(APP_SETTINGS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('neoko_app_settings_changed'));
  return updated;
}

// ──────────────── User Profile ────────────────

export function getUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getUserProfile() || {
    username: 'Reader',
    avatar: '🔮',
    role: 'user' as const,
    isPro: false,
    createdAt: Date.now(),
  };
  const updated = { ...current, ...profile };
  safeSetItem(USER_PROFILE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('neoko_profile_changed'));
  return updated;
}

export function clearUserProfile(): void {
  localStorage.removeItem(USER_PROFILE_KEY);
}

// ──────────────── Ad Settings ────────────────

export interface AdSettings {
  adsEnabledGlobally: boolean;
  disableAdsForProUsers: boolean;
  isProUser: boolean;
  adNetwork: 'adsterra' | 'propeller' | 'exoclick' | 'custom';
  customAdScript: string;
}

const AD_SETTINGS_KEY = 'neoko_ad_settings';

export function getAdSettings(): AdSettings {
  try {
    const raw = localStorage.getItem(AD_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      adsEnabledGlobally: true,
      disableAdsForProUsers: true,
      isProUser: false,
      adNetwork: 'adsterra',
      customAdScript: '',
    };
  } catch {
    return {
      adsEnabledGlobally: true,
      disableAdsForProUsers: true,
      isProUser: false,
      adNetwork: 'adsterra',
      customAdScript: '',
    };
  }
}

export function saveAdSettings(settings: Partial<AdSettings>): AdSettings {
  const current = getAdSettings();
  const updated = { ...current, ...settings };
  safeSetItem(AD_SETTINGS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('neoko_ad_settings_changed'));
  return updated;
}

// ──────────────── Data Management ────────────────

export function exportAllData(): string {
  const data: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('neoko_')) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || '');
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  }
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('neoko_')) {
        safeSetItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    });
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('neoko_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export function getStorageUsage(): { used: number; items: number } {
  let totalSize = 0;
  let totalItems = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('neoko_')) {
      totalSize += (localStorage.getItem(key) || '').length * 2;
      totalItems++;
    }
  }
  return { used: totalSize, items: totalItems };
}

// ──────────────── Reading Stats ────────────────

export function getReadingStats(): ReadingStats {
  const actualReadChaptersCount = getReadChapters().size;
  let stats: ReadingStats = {
    totalChaptersRead: actualReadChaptersCount,
    totalReadingTimeMinutes: actualReadChaptersCount * 3,
    genresRead: {},
    dailyStreak: actualReadChaptersCount > 0 ? 1 : 0,
    lastReadDate: new Date().toISOString().split('T')[0],
    historyByDate: {},
  };

  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      stats = {
        ...parsed,
        totalChaptersRead: Math.max(parsed.totalChaptersRead || 0, actualReadChaptersCount),
      };
    }
  } catch {}

  return stats;
}

export function resetReadingStats(): ReadingStats {
  const actualReadChaptersCount = getReadChapters().size;
  const today = new Date().toISOString().split('T')[0];
  const resetStats: ReadingStats = {
    totalChaptersRead: actualReadChaptersCount,
    totalReadingTimeMinutes: actualReadChaptersCount * 3,
    genresRead: {},
    dailyStreak: actualReadChaptersCount > 0 ? 1 : 0,
    lastReadDate: today,
    historyByDate: { [today]: actualReadChaptersCount },
  };
  safeSetItem(STATS_KEY, JSON.stringify(resetStats));
  window.dispatchEvent(new Event('neoko_stats_changed'));
  return resetStats;
}

export function updateReadingStats(chaptersCount = 1, minutesSpent = 1, genres: string[] = []): ReadingStats {
  const current = getReadingStats();
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate daily streak
  let streak = current.dailyStreak;
  if (current.lastReadDate) {
    const lastDate = new Date(current.lastReadDate);
    const currDate = new Date(today);
    const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1;
    }
  } else {
    streak = 1;
  }

  // Genres breakdown
  const updatedGenres = { ...current.genresRead };
  genres.forEach(g => {
    if (g && typeof g === 'string') {
      const cleanGenre = g.trim();
      updatedGenres[cleanGenre] = (updatedGenres[cleanGenre] || 0) + chaptersCount;
    }
  });

  // History by date
  const updatedHistoryByDate = { ...current.historyByDate };
  updatedHistoryByDate[today] = (updatedHistoryByDate[today] || 0) + chaptersCount;

  const updated: ReadingStats = {
    totalChaptersRead: current.totalChaptersRead + chaptersCount,
    totalReadingTimeMinutes: current.totalReadingTimeMinutes + minutesSpent,
    genresRead: updatedGenres,
    dailyStreak: streak,
    lastReadDate: today,
    historyByDate: updatedHistoryByDate,
  };

  safeSetItem(STATS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('neoko_stats_changed'));
  return updated;
}

// ──────────────── Manga Collections ────────────────

export function getCollections(): MangaCollection[] {
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: 'default_favorites',
      name: '⭐ Must Read',
      description: 'Top priority manga to complete',
      color: '#9d86e9',
      mangaIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  ];
}

export function saveCollection(collection: { id?: string; name: string; description?: string; color?: string; mangaIds?: (string | number)[] }): MangaCollection[] {
  const collections = getCollections();
  const now = Date.now();

  if (collection.id) {
    const idx = collections.findIndex(c => c.id === collection.id);
    if (idx !== -1) {
      collections[idx] = {
        ...collections[idx],
        name: collection.name,
        description: collection.description,
        color: collection.color || collections[idx].color,
        mangaIds: collection.mangaIds || collections[idx].mangaIds,
        updatedAt: now,
      };
    }
  } else {
    const newCol: MangaCollection = {
      id: 'col_' + Math.random().toString(36).substring(2, 9),
      name: collection.name,
      description: collection.description || '',
      color: collection.color || '#9d86e9',
      mangaIds: collection.mangaIds || [],
      createdAt: now,
      updatedAt: now,
    };
    collections.push(newCol);
  }

  safeSetItem(COLLECTIONS_KEY, JSON.stringify(collections));
  window.dispatchEvent(new Event('neoko_collections_changed'));
  return collections;
}

export function deleteCollection(id: string): MangaCollection[] {
  const collections = getCollections().filter(c => c.id !== id);
  safeSetItem(COLLECTIONS_KEY, JSON.stringify(collections));
  window.dispatchEvent(new Event('neoko_collections_changed'));
  return collections;
}

export function toggleMangaInCollection(collectionId: string, mangaId: string | number): MangaCollection[] {
  const collections = getCollections();
  const idx = collections.findIndex(c => c.id === collectionId);
  if (idx !== -1) {
    const exists = collections[idx].mangaIds.some(id => String(id) === String(mangaId));
    if (exists) {
      collections[idx].mangaIds = collections[idx].mangaIds.filter(id => String(id) !== String(mangaId));
    } else {
      collections[idx].mangaIds.push(mangaId);
    }
    collections[idx].updatedAt = Date.now();
    safeSetItem(COLLECTIONS_KEY, JSON.stringify(collections));
    window.dispatchEvent(new Event('neoko_collections_changed'));
  }
  return collections;
}

// ──────────────── Chapter Notes ────────────────

export function getChapterNotes(mangaId?: string | number): ChapterNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) {
      const notes: ChapterNote[] = JSON.parse(raw);
      if (mangaId !== undefined) {
        return notes.filter(n => String(n.mangaId) === String(mangaId));
      }
      return notes;
    }
  } catch {}
  return [];
}

export function saveChapterNote(note: {
  id?: string;
  mangaId: string | number;
  mangaTitle: string;
  chapterId: string | number;
  chapterName: string;
  pageIndex: number;
  content: string;
}): ChapterNote[] {
  const notes = getChapterNotes();
  const now = Date.now();

  if (note.id) {
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      notes[idx] = { ...notes[idx], content: note.content, updatedAt: now };
    }
  } else {
    const newNote: ChapterNote = {
      id: 'note_' + Math.random().toString(36).substring(2, 9),
      mangaId: note.mangaId,
      mangaTitle: note.mangaTitle,
      chapterId: note.chapterId,
      chapterName: note.chapterName,
      pageIndex: note.pageIndex,
      content: note.content,
      createdAt: now,
      updatedAt: now,
    };
    notes.push(newNote);
  }

  safeSetItem(NOTES_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event('neoko_notes_changed'));
  return notes;
}

export function deleteChapterNote(id: string): ChapterNote[] {
  const notes = getChapterNotes().filter(n => n.id !== id);
  safeSetItem(NOTES_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event('neoko_notes_changed'));
  return notes;
}

// ──────────────── Continue Reading & Recommendations Helper ────────────────

export function getContinueReadingList(): HistoryItem[] {
  const history = getHistory(); // returns HistoryItem[] sorted by readAt desc
  // Return unique manga from history with their latest read chapter
  const map = new Map<string, HistoryItem>();
  history.forEach(item => {
    const key = String(item.mangaId);
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values()).slice(0, 10);
}

export interface ResumeTarget {
  chapterId: string | number;
  pageIndex: number;
  pageOffsetRatio?: number;
  chapterName?: string;
  chapterNumber?: number;
  isCompleted?: boolean;
}

export function getMangaResumeTarget(
  mangaId: string | number,
  chapters: Chapter[] = []
): ResumeTarget | null {
  const history = getHistory();
  const historyItem = history.find(h => String(h.mangaId) === String(mangaId));

  const sortedChapters = [...chapters].sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));

  if (historyItem) {
    const chIdx = sortedChapters.findIndex(c => String(c.id) === String(historyItem.chapterId));
    const ch = chIdx !== -1 ? sortedChapters[chIdx] : null;

    return {
      chapterId: historyItem.chapterId,
      pageIndex: historyItem.pageIndex || 1,
      pageOffsetRatio: historyItem.pageOffsetRatio || 0,
      chapterName: historyItem.chapterName,
      chapterNumber: ch?.chapterNumber,
      isCompleted: false,
    };
  }

  if (sortedChapters.length > 0) {
    const inProgress = sortedChapters.find(c => Boolean(c.lastPageRead && c.lastPageRead > 0 && !(c.read || c.isRead || isChapterRead(c.id))));
    if (inProgress) {
      return {
        chapterId: inProgress.id,
        pageIndex: inProgress.lastPageRead || 1,
        chapterName: inProgress.name,
        chapterNumber: inProgress.chapterNumber,
        isCompleted: false,
      };
    }

    const firstUnread = sortedChapters.find(c => !(c.read || c.isRead || isChapterRead(c.id)));
    if (firstUnread) {
      return {
        chapterId: firstUnread.id,
        pageIndex: 1,
        chapterName: firstUnread.name,
        chapterNumber: firstUnread.chapterNumber,
        isCompleted: false,
      };
    }

    const firstCh = sortedChapters[0];
    return {
      chapterId: firstCh.id,
      pageIndex: 1,
      chapterName: firstCh.name,
      chapterNumber: firstCh.chapterNumber,
      isCompleted: Boolean(firstCh.read || firstCh.isRead || isChapterRead(firstCh.id)),
    };
  }

  return null;
}

export function getTopGenres(): { genre: string; count: number }[] {
  const stats = getReadingStats();
  const entries = Object.entries(stats.genresRead);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([genre, count]) => ({ genre, count })).slice(0, 5);
}

// ──────────────── Recent Searches ────────────────

const RECENT_SEARCHES_KEY = 'neoko_recent_searches_v1';

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  if (!query || !query.trim()) return getRecentSearches();
  const clean = query.trim();
  const current = getRecentSearches().filter(q => q.toLowerCase() !== clean.toLowerCase());
  const updated = [clean, ...current].slice(0, 8);
  safeSetItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  return updated;
}

export function removeRecentSearch(query: string): string[] {
  const current = getRecentSearches().filter(q => q.toLowerCase() !== query.trim().toLowerCase());
  safeSetItem(RECENT_SEARCHES_KEY, JSON.stringify(current));
  return current;
}

export function clearRecentSearches(): string[] {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {}
  return [];
}

// ──────────────── Gemini AI & Translation Settings ────────────────

export function getGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGeminiApiKey(key: string): void {
  safeSetItem(GEMINI_API_KEY, key.trim());
}

export function getTranslationLanguage(): string {
  try {
    return localStorage.getItem(TRANSLATION_LANG_KEY) || 'English';
  } catch {
    return 'English';
  }
}

export function saveTranslationLanguage(lang: string): void {
  safeSetItem(TRANSLATION_LANG_KEY, lang);
}

export function getAiTranslationEnabled(): boolean {
  try {
    const val = localStorage.getItem(AI_TRANSLATION_ENABLED_KEY);
    return val !== null ? val === 'true' : false;
  } catch {
    return false;
  }
}

export function saveAiTranslationEnabled(enabled: boolean): void {
  safeSetItem(AI_TRANSLATION_ENABLED_KEY, String(enabled));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('neoko_ai_translation_enabled_changed'));
  }
}


