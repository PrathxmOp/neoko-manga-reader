// 512MB Intelligent Fail-Safe Cache Manager for NEOKO Manga Web App

// Purge legacy SW graphql cache, unregister old SWs, and clear old chapter page cache entries
if (typeof window !== 'undefined') {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.includes('chapter_pages_')) {
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

const CACHE_LIMIT_BYTES = 512 * 1024 * 1024; // 512 MB
const INDEX_KEY = 'neoko_cache_index_v1';

interface CacheMeta {
  key: string;
  size: number;
  updatedAt: number;
}

const memoryCache = new Map<string, { data: any; size: number; updatedAt: number }>();

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

export function setAppCache<T>(key: string, data: T): void {
  if (!key || data === undefined || data === null) return;

  try {
    const size = calculateSize(data);
    enforceCacheLimit(size);

    const meta: CacheMeta = { key, size, updatedAt: Date.now() };

    let index = getIndex().filter(i => i.key !== key);
    index.push(meta);
    saveIndex(index);

    memoryCache.set(key, { data, size, updatedAt: Date.now() });

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {}
  } catch (err) {
    console.warn('Cache write bypassed for key:', key, err);
  }
}

export function getAppCache<T>(key: string): T | null {
  if (!key) return null;

  try {
    if (memoryCache.has(key)) {
      const item = memoryCache.get(key)!;
      item.updatedAt = Date.now();
      return item.data as T;
    }

    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      if (data !== undefined && data !== null) {
        const size = calculateSize(data);
        memoryCache.set(key, { data, size, updatedAt: Date.now() });
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
    const index = getIndex();
    index.forEach(item => {
      try {
        localStorage.removeItem(item.key);
      } catch {}
    });
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
      limitMB: 512,
      percent: Math.min(100, Math.round((usedBytes / CACHE_LIMIT_BYTES) * 100)),
      itemCount: index.length,
    };
  } catch {
    return { usedBytes: 0, usedMB: '0.0', limitMB: 512, percent: 0, itemCount: 0 };
  }
}
