// 2.5MB Intelligent Fail-Safe Cache Manager for NEOKO Manga Web App

const ESSENTIAL_KEYS = new Set([
  'neoko_manga_bookmarks',
  'neoko_manga_history',
  'neoko_enabled_sources_v2',
  'neoko_disabled_sources_v1',
  'neoko_read_chapters',
  'neoko_reader_settings',
  'neoko_content_filter',
  'neoko_app_settings',
  'neoko_user_profile',
  'neoko_reading_stats',
  'neoko_manga_collections',
  'neoko_chapter_notes',
  'neoko_gemini_api_key',
  'neoko_translation_language',
  'neoko_ai_translation_enabled',
  'neoko_recent_searches',
  'neoko_downloaded_chapters_v1',
  'neoko_ad_settings',
  'neoko_accounts',
  'neoko_admin_password',
]);

export function isCacheKey(key: string): boolean {
  if (ESSENTIAL_KEYS.has(key)) return false;
  return (
    key.startsWith('neoko_cache_') ||
    key.startsWith('neoko_anilist_') ||
    key.includes('chapter_pages_')
  );
}

// Purge legacy SW graphql cache, unregister old SWs, and clear old chapter page cache entries
if (typeof window !== 'undefined') {
  try {
    Object.keys(localStorage).forEach(key => {
      if (isCacheKey(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch {}

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then(names => {
      for (const name of names) {
        caches.delete(name).catch(() => {});
      }
    }).catch(() => {});
  }
}

// Browser localStorage limit is ~5MB total. We cap API cache at 2.5MB to reserve space for user data.
const CACHE_LIMIT_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const INDEX_KEY = 'neoko_cache_index_v1';

interface CacheMeta {
  key: string;
  size: number;
  updatedAt: number;
  expiresAt?: number;
}

const memoryCache = new Map<string, { data: any; size: number; updatedAt: number; expiresAt?: number }>();

function getIndex(): CacheMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndex(index: CacheMeta[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {}
}

function calculateSize(data: any): number {
  try {
    const str = JSON.stringify(data);
    return str.length * 2;
  } catch {
    return 2048;
  }
}

function enforceCacheLimit(incomingSize: number) {
  try {
    let index = getIndex();
    let currentTotal = index.reduce((acc, item) => acc + item.size, 0);

    if (currentTotal + incomingSize > CACHE_LIMIT_BYTES && index.length > 0) {
      index.sort((a, b) => a.updatedAt - b.updatedAt);
      while (currentTotal + incomingSize > CACHE_LIMIT_BYTES && index.length > 0) {
        const oldest = index.shift();
        if (oldest) {
          try {
            localStorage.removeItem(oldest.key);
            memoryCache.delete(oldest.key);
            currentTotal -= oldest.size;
          } catch {}
        }
      }
      saveIndex(index);
    }
  } catch {}
}

export function setAppCache<T>(key: string, data: T, ttlMinutes?: number): void {
  if (!key || data === undefined || data === null) return;

  try {
    const size = calculateSize(data);
    enforceCacheLimit(size);

    const expiresAt = ttlMinutes && ttlMinutes > 0 ? Date.now() + ttlMinutes * 60 * 1000 : undefined;
    const meta: CacheMeta = { key, size, updatedAt: Date.now(), expiresAt };

    let index = getIndex().filter(i => i.key !== key);
    index.push(meta);
    saveIndex(index);

    memoryCache.set(key, { data, size, updatedAt: Date.now(), expiresAt });

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
        // Evict older cache items aggressively if quota is exceeded
        enforceCacheLimit(size * 2 + 1024 * 512);
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Cache write bypassed for key:', key, err);
  }
}

export function getAppCache<T>(key: string): T | null {
  if (!key) return null;

  try {
    const index = getIndex();
    const meta = index.find(i => i.key === key);
    if (meta?.expiresAt && Date.now() > meta.expiresAt) {
      memoryCache.delete(key);
      try {
        localStorage.removeItem(key);
        saveIndex(index.filter(i => i.key !== key));
      } catch {}
      return null;
    }

    if (memoryCache.has(key)) {
      const item = memoryCache.get(key)!;
      if (item.expiresAt && Date.now() > item.expiresAt) {
        memoryCache.delete(key);
        try { localStorage.removeItem(key); } catch {}
        return null;
      }
      item.updatedAt = Date.now();
      return item.data as T;
    }

    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (data !== undefined && data !== null) {
        const size = calculateSize(data);
        memoryCache.set(key, { data, size, updatedAt: Date.now(), expiresAt: meta?.expiresAt });
        return data as T;
      }
    }
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  return null;
}

export function clearAppCache(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (isCacheKey(key)) {
          try {
            localStorage.removeItem(key);
          } catch {}
        }
      });
    }
    localStorage.removeItem(INDEX_KEY);
    memoryCache.clear();
  } catch {}
}

export function getCacheUsageStats() {
  try {
    const index = getIndex();
    const usedBytes = index.reduce((acc, item) => acc + item.size, 0);
    return {
      usedBytes,
      usedMB: (usedBytes / (1024 * 1024)).toFixed(1),
      limitMB: (CACHE_LIMIT_BYTES / (1024 * 1024)).toFixed(1),
      percent: Math.min(100, Math.round((usedBytes / CACHE_LIMIT_BYTES) * 100)),
      itemCount: index.length,
    };
  } catch {
    return { usedBytes: 0, usedMB: '0.0', limitMB: '2.5', percent: 0, itemCount: 0 };
  }
}
