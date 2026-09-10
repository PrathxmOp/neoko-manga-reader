export interface Manga {
  id: string | number;
  title: string;
  thumbnailUrl?: string;
  url?: string;
  author?: string;
  artist?: string;
  description?: string;
  genre?: string[] | string;
  status?: string;
  sourceId?: string;
  sourceName?: string;
  chapters?: Chapter[];
  chapterCount?: number;
  unreadCount?: number;
  rating?: number;
  viewCount?: string;
  lang?: string;
  contentRating?: 'Safe' | 'Suggestive' | 'Erotica' | 'Pornographic';
  inLibrary?: boolean;
  inLibraryAt?: number;
  lastFetchedAt?: number;
}

export interface Chapter {
  id: string | number;
  name: string;
  chapterNumber?: number;
  volumeNumber?: number;
  uploadDate?: string | number;
  scanlator?: string;
  mangaId?: string | number;
  read?: boolean;
  isRead?: boolean;
  isDownloaded?: boolean;
  isBookmarked?: boolean;
  pageCount?: number;
  lastPageRead?: number;
}

export interface Source {
  id: string;
  name: string;
  lang: string;
  iconUrl?: string;
  supportsLatest?: boolean;
  isNsfw?: boolean;
  enabled?: boolean;
  status?: 'online' | 'error' | 'cloudflare';
}

export interface Extension {
  pkgName: string;
  name: string;
  versionName?: string;
  lang: string;
  isInstalled: boolean;
  isNsfw?: boolean;
  iconUrl?: string;
  hasUpdate?: boolean;
  isObsolete?: boolean;
}

export interface BookmarkItem {
  manga: Manga;
  addedAt: number;
  category: 'Reading' | 'Plan to Read' | 'Completed' | 'Favorite';
  lastReadChapterId?: string | number;
  lastReadChapterName?: string;
  progressPercent?: number;
}

export interface HistoryItem {
  mangaId: string | number;
  mangaTitle: string;
  thumbnailUrl?: string;
  chapterId: string | number;
  chapterName: string;
  readAt: number;
  sourceId?: string;
  pageIndex?: number;
  totalPages?: number;
}

export interface ContentFilterSettings {
  contentRating: 'normal' | '18+';
  languages: string[];
  extensionModes?: Record<string, 'normal' | '18+'>;
}

export interface ReaderSettings {
  mode: 'webtoon' | 'single' | 'double';
  fitMode: 'width' | 'height' | 'original';
  zoomLevel: number;
  gapSize: number;
  autoLoadNextChapter: boolean;
  readingDirection: 'ltr' | 'rtl';
  backgroundColor: 'black' | 'dark-grey' | 'white';
  showPageNumber: boolean;
  autoScrollSpeed: number;
  colorFilter: 'normal' | 'sepia' | 'dark' | 'invert';
  preloadPages: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'amoled' | 'midnight' | 'light';
  defaultStartPage: '/' | '/browse' | '/library' | '/updates';
  cardSize: 'small' | 'medium' | 'large';
  gridColumns: number;
  animationsEnabled: boolean;
  reducedMotion: boolean;
}

export interface ReadingStats {
  totalChaptersRead: number;
  totalReadingTimeMinutes: number;
  genresRead: Record<string, number>;
  dailyStreak: number;
  lastReadDate: string; // YYYY-MM-DD
  historyByDate: Record<string, number>; // date string -> chapter count
}

export interface MangaCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  mangaIds: (string | number)[];
  createdAt: number;
  updatedAt: number;
}

export interface ChapterNote {
  id: string;
  mangaId: string | number;
  mangaTitle: string;
  chapterId: string | number;
  chapterName: string;
  pageIndex: number;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  username: string;
  avatar: string;
  role: 'user' | 'pro' | 'admin';
  isPro: boolean;
  createdAt: number;
}

export interface TrackerInfo {
  id: number;
  name: string;
  icon: string;
  isLoggedIn: boolean;
  isTokenExpired: boolean;
  authUrl: string | null;
  trackRecords: { totalCount: number };
}

export interface TrackRecord {
  id: number;
  trackerId: number;
  remoteId: string;
  title?: string;
  status: number; // 1: Reading, 2: Completed, 3: On Hold, 4: Dropped, 6: Plan to Read
  score: number;
  lastChapterRead: number;
  totalChapters: number;
  remoteUrl?: string;
  startDate?: string;
  finishDate?: string;
}

export interface TrackSearchResult {
  id: number;
  trackerId: number;
  remoteId: string;
  title: string;
  coverUrl?: string;
  summary?: string;
  totalChapters: number;
  status: number;
  score: number;
  lastChapterRead: number;
  trackingUrl?: string;
}


export interface Category {
  id: number;
  name: string;
  order: number;
  default: boolean;
  mangaCount?: number;
}

export interface DownloadStatus {
  state: 'STARTED' | 'STOPPED';
  queue: DownloadQueueItem[];
}

export interface DownloadQueueItem {
  chapterIndex: number;
  mangaId: number;
  state: string;
  progress: number;
  tries: number;
  chapter?: {
    id: number;
    name: string;
    manga?: {
      title: string;
      thumbnailUrl: string;
    };
  };
}

export interface ServerSettings {
  ip: string;
  port: number;
  autoDownloadNewChapters: boolean;
  autoDownloadNewChaptersLimit: number;
  excludeEntryWithUnreadChapters: boolean;
  globalUpdateInterval: number;
  updateMangas: boolean;
  flareSolverrEnabled: boolean;
  flareSolverrUrl: string;
  flareSolverrSessionName?: string;
  flareSolverrTimeout?: number;
  basicAuthEnabled: boolean;
  basicAuthUsername: string;
  debugLogsEnabled: boolean;
  downloadAsCbz: boolean;
  downloadsPath?: string;
  localSourcePath?: string;
  socksProxyEnabled: boolean;
  socksProxyHost?: string;
  socksProxyPort?: string;
  extensionRepos: string[];
  backupInterval?: number;
  backupPath?: string;
  backupTTL?: number;
  backupTime?: string;
  maxSourcesInParallel?: number;
}

export interface ServerInfo {
  name: string;
  version: string;
  revision: string;
  buildType: string;
  buildTime: string;
  github: string;
  discord: string;
}
