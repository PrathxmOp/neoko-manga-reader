import { Manga, Chapter, Source, Extension, TrackerInfo, TrackRecord, TrackSearchResult, Category, DownloadStatus, ServerSettings, ServerInfo, SiteStats } from '../types/manga';
export type { Manga, Chapter, Source, Extension, TrackerInfo, TrackRecord, TrackSearchResult, Category, DownloadStatus, ServerSettings, ServerInfo, SiteStats };
import { getCachedData, setCachedData, getContentFilterSettings, isSourceEnabled, getExtensionMode, getEnabledSourceIds } from './storage';
import { isDefault18Plus } from '../config/extensionRules';

const GRAPHQL_ENDPOINT = '/api/graphql';

export function getImageUrl(relativePath?: string): string {
  if (!relativePath) return '';

  // Transform Suwayomi API paths (even if absolute http://127.0.0.1:4567/api/v1/...) to relative /api/...
  // so browser sends requests through Vite proxy with Basic Authorization headers!
  if (relativePath.includes('/api/')) {
    const idx = relativePath.indexOf('/api/');
    return relativePath.substring(idx);
  }

  if (relativePath.startsWith('http')) return relativePath;
  return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
}

export async function fetchAuthenticatedImageBlob(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    const headers: Record<string, string> = {};
    const authUser = import.meta.env.VITE_SUWAYOMI_AUTH_USER;
    const authPass = import.meta.env.VITE_SUWAYOMI_AUTH_PASS;
    if (authUser && authPass) {
      headers['Authorization'] = `Basic ${btoa(`${authUser}:${authPass}`)}`;
    }

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    if (blob && blob.size > 200) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (e) {
    console.error('Failed to fetch authenticated image blob for:', imageUrl, e);
    return null;
  }
}

export async function queryGraphQL(query: string, variables: Record<string, any> = {}, timeoutMs: number = 15000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Attach basic auth header if configured in environment variables
    const authUser = import.meta.env.VITE_SUWAYOMI_AUTH_USER;
    const authPass = import.meta.env.VITE_SUWAYOMI_AUTH_PASS;
    if (authUser && authPass) {
      headers['Authorization'] = `Basic ${btoa(`${authUser}:${authPass}`)}`;
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      console.warn('GraphQL Notice:', json.errors[0]?.message);
    }
    return json;
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      console.warn(`GraphQL query timed out after ${timeoutMs}ms`);
    } else {
      console.error('GraphQL Network Error:', error);
    }
    return null;
  }
}

export function parseVolumeNumber(name?: string): number | undefined {
  if (!name) return undefined;
  const volMatch = name.match(/(?:vol(?:ume)?|v)\.?\s*(\d+(\.\d+)?)/i);
  if (volMatch && volMatch[1]) {
    const parsed = parseFloat(volMatch[1]);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

export function normalizeMangaStatus(status?: string, aniListStatus?: string): string {
  if (aniListStatus) {
    const ani = aniListStatus.toUpperCase().trim();
    if (ani === 'RELEASING') return 'ONGOING';
    if (ani === 'FINISHED' || ani === 'COMPLETED') return 'COMPLETED';
    if (ani === 'HIATUS') return 'HIATUS';
    if (ani === 'CANCELLED') return 'CANCELLED';
    if (ani === 'NOT_YET_RELEASED') return 'UPCOMING';
  }

  if (!status) return 'ONGOING';

  const str = String(status).toUpperCase().trim();
  if (str === 'UNKNOWN' || str === 'UNKNOWN_STATUS' || str === '0' || str === 'NULL' || str === 'UNDEFINED' || str === '') {
    return 'ONGOING';
  }

  if (str === '1' || str.includes('ONGOING') || str.includes('RELEASING') || str.includes('PUBLISHING')) {
    return 'ONGOING';
  }
  if (str === '2' || str.includes('COMPLETED') || str.includes('FINISHED') || str.includes('LICENSED')) {
    return 'COMPLETED';
  }
  if (str === '3' || str.includes('CANCEL')) {
    return 'CANCELLED';
  }
  if (str === '4' || str.includes('HIATUS')) {
    return 'HIATUS';
  }

  return str;
}

export function cleanSynopsisText(desc?: string): { cleanText: string; sourceRating?: number } {
  if (!desc) return { cleanText: '' };

  let text = desc;
  let sourceRating: number | undefined = undefined;

  // Extract source rating if embedded in header text (e.g. "Rating: 9.39")
  const ratingMatch = text.match(/Rating:\s*(\d+(\.\d+)?)/i);
  if (ratingMatch && ratingMatch[1]) {
    const parsed = parseFloat(ratingMatch[1]);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
      sourceRating = Number(parsed.toFixed(1));
    }
  }

  // Strip scraper header junk lines from top of description
  text = text
    .replace(/^[\s\S]*?(?:Rank:\s*#?\d+|Rating:\s*\d|Bookmarks:\s*[\d\.\,]+[KkMm]?)[^\n]*\n?/gmi, '')
    .replace(/^(?:Alternative(?:s| Names)?:.*(?:\n|$))+/gi, '')
    .replace(/^Rating:\s*\d+(\.\d+)?.*$/gmi, '')
    .replace(/^Rank:\s*#?\d+.*$/gmi, '')
    .trim();

  if (!text) {
    text = desc.replace(/^(?:Rank|Rating|Bookmarks):.*$/gmi, '').trim();
  }

  return { cleanText: text || desc, sourceRating };
}

// ──────────────── SOURCES ────────────────

const sourceLookupMap: Record<string, Source> = {};

try {
  const cachedSources = getCachedData<Source[]>('sources_list');
  if (cachedSources && Array.isArray(cachedSources)) {
    cachedSources.forEach(s => {
      sourceLookupMap[String(s.id)] = s;
    });
  }
} catch {
  // ignore
}

export function isBrokenSource(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  return (
    lower.includes('flamescans.lol') ||
    lower.includes('read comic online') ||
    lower.includes('readcomiconline') ||
    lower.includes('obsolete') ||
    lower.includes('deprecated') ||
    lower.includes('allporncomics') ||
    lower.includes('local source') ||
    lower.includes('local storage')
  );
}

export function isRecommendedSource(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return (
    lower.includes('mangadex') ||
    lower.includes('asura') ||
    lower.includes('flame comics') ||
    lower.includes('comick') ||
    lower.includes('weeb central') ||
    lower.includes('mangafire') ||
    lower.includes('manga plus') ||
    lower.includes('bato.to') ||
    lower.includes('mangareader') ||
    lower.includes('manga demon')
  );
}

export async function getSources(forceRefresh: boolean = false, ignoreRatingFilter: boolean = false): Promise<Source[]> {
  const cacheKey = `sources_list_raw_v3`;
  const cached = getCachedData<Source[]>(cacheKey);

  if (cached && cached.length > 0) {
    cached.forEach(s => { sourceLookupMap[String(s.id)] = s; });
    if (!forceRefresh) {
      return ignoreRatingFilter ? cached : filterSourcesByContentRating(cached.filter(s => !isBrokenSource(s.name)));
    }
  }

  const query = `
    query GetSources {
      sources {
        nodes {
          id
          name
          lang
          iconUrl
          supportsLatest
          isNsfw
        }
      }
    }
  `;
  try {
    const res = await queryGraphQL(query);
    const nodes = res?.data?.sources?.nodes || res?.data?.sources || [];
    const formatted: Source[] = nodes
      .filter((s: any) => !isBrokenSource(s.name))
      .map((s: any) => ({
        id: String(s.id),
        name: s.name,
        lang: (s.lang || 'en').toLowerCase(),
        iconUrl: s.iconUrl ? getImageUrl(s.iconUrl) : undefined,
        supportsLatest: s.supportsLatest ?? true,
        isNsfw: isDedicatedNsfwName(s.name),
        status: 'online',
      }));

    formatted.forEach(s => {
      sourceLookupMap[s.id] = s;
    });

    const sorted = formatted.sort((a, b) => {
      const aRec = isRecommendedSource(a.name) ? 0 : 1;
      const bRec = isRecommendedSource(b.name) ? 0 : 1;
      if (aRec !== bRec) return aRec - bRec;

      const aIsEn = a.lang === 'en' || a.lang === 'all' ? 0 : 1;
      const bIsEn = b.lang === 'en' || b.lang === 'all' ? 0 : 1;
      if (aIsEn !== bIsEn) return aIsEn - bIsEn;
      return a.name.localeCompare(b.name);
    });

    setCachedData(cacheKey, sorted, 30);
    return ignoreRatingFilter ? sorted : filterSourcesByContentRating(sorted);
  } catch (e) {
    console.error('Failed to fetch sources:', e);
    return [];
  }
}

export function isDedicatedNsfwName(name: string): boolean {
  if (!name) return false;
  return isDefault18Plus(name);
}

export function isNsfwSource(source: Source): boolean {
  return isDedicatedNsfwName(source.name);
}

export function isNsfwManga(manga: Manga): boolean {
  const sId = String(manga.sourceId || '');
  const srcObj = sourceLookupMap[sId];
  if (srcObj && isNsfwSource(srcObj)) return true;

  const titleLower = (manga.title || '').toLowerCase();
  const genreStr = Array.isArray(manga.genre) ? manga.genre.join(' ').toLowerCase() : (manga.genre || '').toLowerCase();
  const sourceNameLower = (manga.sourceName || '').toLowerCase();

  if (isDedicatedNsfwName(sourceNameLower)) {
    return true;
  }

  return (
    titleLower.includes('hentai') ||
    titleLower.includes('18+') ||
    titleLower.includes('erotica') ||
    genreStr.includes('hentai') ||
    genreStr.includes('erotica') ||
    genreStr.includes('adult') ||
    genreStr.includes('18+') ||
    genreStr.includes('smut') ||
    genreStr.includes('doujinshi')
  );
}

export function filterSourcesByContentRating(sources: Source[]): Source[] {
  const settings = getContentFilterSettings();
  const rating = settings.contentRating;

  if (rating === 'normal') {
    return sources.filter(s => {
      const mode = getExtensionMode(s.id, isNsfwSource(s));
      const modeByName = getExtensionMode(s.name, isNsfwSource(s));
      return mode === 'normal' && modeByName === 'normal';
    });
  } else {
    // 18+ mode: includes 18+ sources and standard sources
    const nsfw = sources.filter(s => getExtensionMode(s.id, isNsfwSource(s)) === '18+' || getExtensionMode(s.name, isNsfwSource(s)) === '18+');
    const sfw = sources.filter(s => getExtensionMode(s.id, isNsfwSource(s)) === 'normal' && getExtensionMode(s.name, isNsfwSource(s)) === 'normal');
    return [...nsfw, ...sfw];
  }
}

export function getSourceName(sourceId?: string, sourceName?: string): string {
  if (sourceName && sourceName !== 'Source' && sourceName !== 'Unknown') {
    return sourceName;
  }
  if (sourceId) {
    const sId = String(sourceId);
    const found = sourceLookupMap[sId];
    if (found?.name) return found.name;
    if (sId === '2499283573021220255') return 'MangaDex';
    if (sId === '6247824327199706550') return 'Asura Scans';
    if (sId === '8531542650987673943') return 'Flame Comics';
    if (sId === '1061544757733451419') return 'Read One Piece';
    if (sId === '789561949979941461') return 'MangaReader';
  }
  return 'NEOKO';
}

// ──────────────── SOURCE MANGA ────────────────

export async function fetchSourceManga(
  sourceId: string,
  queryText: string = '',
  page: number = 1,
  type: 'SEARCH' | 'POPULAR' | 'LATEST' = 'POPULAR',
  forceRefresh: boolean = false
): Promise<{ mangas: Manga[]; hasNextPage: boolean; error?: string }> {
  const fetchType = queryText.trim() ? 'SEARCH' : type;
  const cacheKey = `source_manga_${sourceId}_${queryText}_${page}_${fetchType}`;

  if (!forceRefresh) {
    const cached = getCachedData<{ mangas: Manga[]; hasNextPage: boolean }>(cacheKey);
    if (cached && cached.mangas) {
      const enriched = cached.mangas.map(m => ({
        ...m,
        sourceName: getSourceName(m.sourceId || sourceId, m.sourceName),
      }));
      return {
        mangas: filterMangaByContentRating(enriched),
        hasNextPage: cached.hasNextPage,
      };
    }
  }

  const mutation = `
    mutation SearchManga($sourceId: LongString!, $query: String, $page: Int!) {
      fetchSourceManga(
        input: {
          source: $sourceId
          query: $query
          page: $page
          type: ${fetchType}
        }
      ) {
        hasNextPage
        mangas {
          id
          title
          thumbnailUrl
          url
          inLibrary
        }
      }
    }
  `;

  try {
    const res = await queryGraphQL(mutation, {
      sourceId,
      query: queryText.trim() || undefined,
      page,
    });

    if (res?.errors && res.errors.length > 0) {
      const errMsg = res.errors[0].message || 'Error fetching source';
      if (errMsg.includes('NullPointerException')) {
        return { mangas: [], hasNextPage: false, error: 'Extension outdated on Suwayomi server' };
      }
      return { mangas: [], hasNextPage: false, error: errMsg };
    }

    const result = res?.data?.fetchSourceManga;
    if (!result || !result.mangas) return { mangas: [], hasNextPage: false };

    const sourceObj = sourceLookupMap[String(sourceId)];
    const resolvedSourceName = sourceObj?.name || getSourceName(sourceId);
    const resolvedLang = (sourceObj?.lang || 'en').toLowerCase();

    const mangas: Manga[] = (result.mangas || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      thumbnailUrl: getImageUrl(m.thumbnailUrl),
      url: m.url,
      sourceId,
      sourceName: resolvedSourceName,
      lang: resolvedLang,
      inLibrary: m.inLibrary,
    }));

    const responseObj = {
      mangas,
      hasNextPage: Boolean(result.hasNextPage),
    };

    setCachedData(cacheKey, responseObj, 15);
    return {
      mangas: filterMangaByContentRating(mangas),
      hasNextPage: responseObj.hasNextPage,
    };
  } catch (e) {
    console.error(`Failed to fetch source manga for source ${sourceId}:`, e);
    return { mangas: [], hasNextPage: false, error: String(e) };
  }
}

export function filterMangaByContentRating(mangas: Manga[]): Manga[] {
  const settings = getContentFilterSettings();
  const rating = settings.contentRating;

  if (rating === '18+') {
    // In 18+ mode: Return all mangas intact so normal and 18+ titles are both visible together
    return mangas;
  }

  return mangas.filter(m => {
    const isAdult = isNsfwManga(m);
    const sIdMode = m.sourceId ? getExtensionMode(m.sourceId, isAdult) : 'normal';
    const sNameMode = m.sourceName ? getExtensionMode(m.sourceName, isAdult) : 'normal';
    return !isAdult && sIdMode === 'normal' && sNameMode === 'normal';
  });
}

// ──────────────── MULTI-SOURCE SEARCH ────────────────

export async function searchMultiSource(
  sourceIds: string[] = [],
  queryText: string = '',
  page: number = 1,
  forceRefresh: boolean = false,
  type: 'SEARCH' | 'POPULAR' | 'LATEST' = 'POPULAR'
): Promise<{ mangas: Manga[]; sourceResultsCount: Record<string, number>; sourceErrors: Record<string, string> }> {
  if (Object.keys(sourceLookupMap).length === 0) {
    try {
      await getSources(false);
    } catch {
      // ignore
    }
  }

  const settings = getContentFilterSettings();
  const rating = settings.contentRating;

  let validSourceIds = sourceIds;
  if (!validSourceIds || validSourceIds.length === 0) {
    try {
      const allSources = await getSources(false);
      const userLangs = (settings.languages && settings.languages.length > 0) ? settings.languages : ['en'];

      const langSources = allSources.filter(s => {
        if (!isSourceEnabled(s.id, s.name)) return false;
        if (userLangs.includes('all')) return true;
        return userLangs.includes(s.lang.toLowerCase()) || s.lang.toLowerCase() === 'all';
      });

      const pool = langSources.length > 0 ? langSources : allSources.filter(s => isSourceEnabled(s.id, s.name));

      if (rating === '18+') {
        const nsfw = pool.filter(s => getExtensionMode(s.id, isNsfwSource(s)) === '18+' || getExtensionMode(s.name, isNsfwSource(s)) === '18+');
        const sfw = pool.filter(s => getExtensionMode(s.id, isNsfwSource(s)) === 'normal' && getExtensionMode(s.name, isNsfwSource(s)) === 'normal');
        validSourceIds = [...sfw.map(s => s.id), ...nsfw.map(s => s.id)];
      } else {
        const safe = pool.filter(s => getExtensionMode(s.id, isNsfwSource(s)) === 'normal' && getExtensionMode(s.name, isNsfwSource(s)) === 'normal');
        validSourceIds = safe.length > 0 ? safe.map(s => s.id) : pool.map(s => s.id);
      }
    } catch (e) {
      console.error('Failed to resolve sources dynamically:', e);
      validSourceIds = [];
    }
    validSourceIds = validSourceIds.filter(sId => {
      const sObj = sourceLookupMap[String(sId)];
      return isSourceEnabled(sId, sObj?.name) && !isBrokenSource(sObj?.name || '');
    });
  }

  // Sort target sources to prioritize top recommended extensions (MangaDex, Asura, Flame, ComicK, Weeb Central, etc.)
  validSourceIds.sort((aId, bId) => {
    const aObj = sourceLookupMap[String(aId)];
    const bObj = sourceLookupMap[String(bId)];
    const aRec = aObj && isRecommendedSource(aObj.name) ? 0 : 1;
    const bRec = bObj && isRecommendedSource(bObj.name) ? 0 : 1;
    return aRec - bRec;
  });

  // Cap max concurrent sources queried at once (top 16 prioritized sources for title search)
  const maxLimit = queryText.trim() ? Math.min(16, validSourceIds.length) : (sourceIds && sourceIds.length > 0 ? sourceIds.length : 12);
  const targetSourceIds = validSourceIds.slice(0, maxLimit);
  const fetchType = queryText.trim() ? 'SEARCH' : type;

  const cacheKey = `search_${queryText.trim().toLowerCase()}_p${page}_type_${fetchType}_src_${targetSourceIds.join('_')}`;
  if (!forceRefresh) {
    const cached = getCachedData<{ mangas: Manga[]; sourceResultsCount: Record<string, number>; sourceErrors: Record<string, string> }>(cacheKey);
    if (cached && cached.mangas && cached.mangas.length > 0) return cached;
  }

  // Set fast 1.5s timeout for home catalog browse and 6s for explicit title search
  const timeoutMs = queryText.trim() ? 6000 : 1500;

  const fetchWithTimeout = (sId: string) =>
    Promise.race([
      fetchSourceManga(sId, queryText, page, fetchType, forceRefresh),
      new Promise<{ mangas: Manga[]; hasNextPage: boolean; error?: string }>((resolve) =>
        setTimeout(() => resolve({ mangas: [], hasNextPage: false, error: 'Source Timeout' }), timeoutMs)
      ),
    ]);

  // Execute sources in parallel chunks of 8 to prevent socket/thread starvation on backend
  const chunkSize = 8;
  const results: PromiseSettledResult<{ mangas: Manga[]; hasNextPage: boolean; error?: string }>[] = [];
  for (let i = 0; i < targetSourceIds.length; i += chunkSize) {
    const chunk = targetSourceIds.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map(sId => fetchWithTimeout(sId)));
    results.push(...chunkResults);

    // For home catalog browse (no search query), if we already got 6+ items from top sources, early exit to avoid waiting for slow tail sources
    if (!queryText.trim() && i + chunkSize < targetSourceIds.length) {
      let currentItemsCount = 0;
      chunkResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.mangas) {
          currentItemsCount += r.value.mangas.length;
        }
      });
      if (currentItemsCount >= 6) {
        break;
      }
    }
  }

  const combined: Manga[] = [];
  const sourceResultsCount: Record<string, number> = {};
  const sourceErrors: Record<string, string> = {};
  const perSourceMangaLists: Manga[][] = [];

  results.forEach((res, idx) => {
    const sId = targetSourceIds[idx];
    if (res.status === 'fulfilled' && res.value) {
      if (res.value.error) {
        sourceErrors[sId] = res.value.error;
        sourceResultsCount[sId] = 0;
      } else {
        sourceResultsCount[sId] = res.value.mangas?.length || 0;
        if (res.value.mangas && res.value.mangas.length > 0) {
          perSourceMangaLists.push(res.value.mangas);
        }
      }
    } else {
      sourceResultsCount[sId] = 0;
      sourceErrors[sId] = 'Failed to connect to source';
    }
  });

  // Interleave round-robin across sources so home catalog gets a rich, balanced mix from all active extensions
  let maxListLength = 0;
  perSourceMangaLists.forEach(l => { if (l.length > maxListLength) maxListLength = l.length; });

  for (let i = 0; i < maxListLength; i++) {
    for (let listIdx = 0; listIdx < perSourceMangaLists.length; listIdx++) {
      if (i < perSourceMangaLists[listIdx].length) {
        combined.push(perSourceMangaLists[listIdx][i]);
      }
    }
  }

  // Prioritize dedicated full-chapter sources before MangaDex when sorting titles
  combined.sort((a, b) => {
    const aIsMangaDex = a.sourceId === '2499283573021220255' ? 1 : 0;
    const bIsMangaDex = b.sourceId === '2499283573021220255' ? 1 : 0;
    return aIsMangaDex - bIsMangaDex;
  });

  const seenKeys = new Set<string>();
  const isSearchQuery = Boolean(queryText.trim());
  const deduplicated = combined.filter(m => {
    if (!isSourceEnabled(m.sourceId, m.sourceName)) return false;
    const norm = m.title.toLowerCase().trim();
    // Key by sourceId + title for title search queries so every extension source is included
    const key = isSearchQuery ? `${m.sourceId}_${norm}` : norm;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const output = {
    mangas: deduplicated,
    sourceResultsCount,
    sourceErrors,
  };
  if (deduplicated && deduplicated.length > 0) {
    setCachedData(cacheKey, output, 15);
  }
  return output;
}

// ────────────── LATEST MANGA UPDATES ──────────────

export async function getLatestUpdates(limit: number = 20, forceRefresh: boolean = false): Promise<Manga[]> {
  const cacheKey = `latest_updates_${limit}`;
  if (!forceRefresh) {
    const cached = getCachedData<Manga[]>(cacheKey);
    if (cached && cached.length > 0) return cached;
  }

  try {
    // 1. Query recently uploaded chapters from Suwayomi GraphQL backend
    const query = `{
      chapters(orderBy: UPLOAD_DATE, orderByFilter: DESC, first: 40) {
        nodes {
          manga {
            id
            title
            thumbnailUrl
            inLibrary
            source { id name }
          }
        }
      }
    }`;
    const res = await queryGraphQL(query);
    const nodes = res?.data?.chapters?.nodes || [];
    const uniqueMangas: Manga[] = [];
    const seenIds = new Set<string>();

    for (const node of nodes) {
      const m = node?.manga;
      if (m && m.id && !seenIds.has(String(m.id))) {
        seenIds.add(String(m.id));
        uniqueMangas.push({
          id: String(m.id),
          title: m.title || 'Untitled',
          thumbnailUrl: getImageUrl(m.thumbnailUrl || ''),
          sourceId: m.source?.id ? String(m.source.id) : '',
          sourceName: m.source?.name ? String(m.source.name) : '',
          inLibrary: !!m.inLibrary,
        });
      }
      if (uniqueMangas.length >= limit) break;
    }

    if (uniqueMangas.length > 0) {
      setCachedData(cacheKey, uniqueMangas, 10);
      return filterMangaByContentRating(uniqueMangas);
    }
  } catch (e) {
    console.warn('GraphQL latest chapters query failed, falling back to LATEST source fetch:', e);
  }

  // 2. Fallback: Query active sources directly with fetch type 'LATEST'
  try {
    const activeIds = getEnabledSourceIds();
    const res = await searchMultiSource(activeIds, '', 1, forceRefresh, 'LATEST');
    if (res.mangas && res.mangas.length > 0) {
      const result = res.mangas.slice(0, limit);
      setCachedData(cacheKey, result, 10);
      return result;
    }
  } catch (e) {
    console.error('Failed to fetch latest source manga:', e);
  }

  return [];
}

// Helper to resolve an AniList title to a real Suwayomi source manga with chapters
export async function resolveMangaFromSourceByTitle(
  title: string,
  alternateTitles: string[] = [],
  onProgress?: (statusMsg: string) => void
): Promise<Manga | null> {
  if (!title) return null;

  const cleanMain = title.replace(/[\(\[\{\\\/].*?[\)\]\}]/g, '').trim();
  const cacheKey = `resolved_title_${cleanMain.toLowerCase()}`;

  onProgress?.('Checking cached source resolutions...');
  const cached = getCachedData<Manga>(cacheKey);
  if (cached && cached.chapters && cached.chapters.length > 0) {
    onProgress?.(`Loaded from cache! (${cached.chapters.length} chapters)`);
    return cached;
  }

  const candidateTitles = [cleanMain, title, ...alternateTitles]
    .map(t => t ? t.replace(/[\(\[\{\\\/].*?[\)\]\}]/g, '').trim() : '')
    .filter((t, idx, self) => t.length > 0 && self.indexOf(t) === idx);

  // Helper with 4.5s max timeout per chapter fetch so slow/hanging sources never block resolution
  const getMangaDetailsWithTimeout = (mId: string | number, force: boolean) =>
    Promise.race([
      getMangaDetails(mId, force),
      new Promise<Manga | null>((resolve) =>
        setTimeout(() => resolve(null), 4500)
      ),
    ]);

  for (let i = 0; i < candidateTitles.length; i++) {
    const queryTerm = candidateTitles[i];
    onProgress?.(`Searching active sources for "${queryTerm}"...`);
    try {
      const searchRes = await searchMultiSource([], queryTerm, 1, false);
      if (searchRes.mangas && searchRes.mangas.length > 0) {
        // Sort matches: exact title match first
        const queryLower = queryTerm.toLowerCase();
        const sortedMatches = [...searchRes.mangas].sort((a, b) => {
          const aExact = a.title.toLowerCase().trim() === queryLower ? 0 : 1;
          const bExact = b.title.toLowerCase().trim() === queryLower ? 0 : 1;
          return aExact - bExact;
        });

        // Try top candidate matches (up to 3) in order
        for (let mIdx = 0; mIdx < Math.min(3, sortedMatches.length); mIdx++) {
          const candidateMatch = sortedMatches[mIdx];
          if (!candidateMatch || !candidateMatch.id) continue;

          const srcName = candidateMatch.sourceName || 'extension';
          onProgress?.(`Match found on ${srcName}! Fetching chapter list...`);

          // Fast DB query first
          let fullDetails = await getMangaDetailsWithTimeout(candidateMatch.id, false);
          if (!fullDetails || !fullDetails.chapters || fullDetails.chapters.length === 0) {
            onProgress?.(`Scraping live chapters from ${srcName}...`);
            fullDetails = await getMangaDetailsWithTimeout(candidateMatch.id, true);
          }

          if (fullDetails && fullDetails.chapters && fullDetails.chapters.length > 0) {
            onProgress?.(`Success! Found ${fullDetails.chapters.length} chapters on ${fullDetails.sourceName}.`);
            setCachedData(cacheKey, fullDetails, 60);
            return fullDetails;
          }
        }
      }
    } catch (e) {
      console.warn('Failed resolving title candidate:', queryTerm, e);
    }
  }

  onProgress?.('No active source scrapers found chapters for this title.');
  return null;
}

// ──────────────── MANGA DETAILS ────────────────

export async function getMangaDetails(mangaId: number | string, forceRefresh: boolean = false): Promise<Manga | null> {
  const numericId = typeof mangaId === 'string' ? parseInt(mangaId, 10) : mangaId;
  if (isNaN(numericId)) return null;

  const cacheKey = `manga_detail_${numericId}`;

  if (!forceRefresh) {
    const cached = getCachedData<Manga>(cacheKey);
    if (cached && cached.chapters && cached.chapters.length > 0) return cached;

    // Fast path: Query Suwayomi local DB first (takes ~15ms instead of 4000ms live network scraping!)
    try {
      const directQuery = `
        query DirectManga($id: Int!) {
          manga(id: $id) {
            id
            title
            author
            artist
            description
            genre
            status
            thumbnailUrl
            inLibrary
            inLibraryAt
            lastFetchedAt
            source {
              id
              name
              lang
            }
            chapters {
              nodes {
                id
                name
                chapterNumber
                uploadDate
                scanlator
                isRead
                isDownloaded
                isBookmarked
                pageCount
                lastPageRead
              }
            }
          }
        }
      `;
      const directData = await queryGraphQL(directQuery, { id: numericId });
      const dbManga = directData?.data?.manga;
      if (dbManga) {
        const chaptersRaw = dbManga.chapters?.nodes || dbManga.chapters || [];
        if (chaptersRaw.length > 0) {
          const chapters: Chapter[] = chaptersRaw.map((c: any) => {
            const nameStr = c.name || `Chapter ${c.chapterNumber || ''}`;
            return {
              id: c.id,
              name: nameStr,
              chapterNumber: c.chapterNumber,
              volumeNumber: parseVolumeNumber(nameStr),
              uploadDate: c.uploadDate,
              scanlator: c.scanlator,
              mangaId: dbManga.id,
              read: c.isRead,
              isRead: c.isRead,
              isDownloaded: c.isDownloaded,
              isBookmarked: c.isBookmarked,
              pageCount: c.pageCount,
              lastPageRead: c.lastPageRead,
            };
          });

          const sObj = dbManga.source || (dbManga.sourceId ? sourceLookupMap[String(dbManga.sourceId)] : null);
          const resultManga: Manga = {
            id: dbManga.id,
            title: dbManga.title,
            author: dbManga.author,
            artist: dbManga.artist,
            description: dbManga.description,
            genre: typeof dbManga.genre === 'string' ? dbManga.genre.split(',').map((g: string) => g.trim()) : dbManga.genre || [],
            status: normalizeMangaStatus(dbManga.status),
            thumbnailUrl: getImageUrl(dbManga.thumbnailUrl),
            sourceId: sObj?.id ? String(sObj.id) : (dbManga.sourceId ? String(dbManga.sourceId) : undefined),
            sourceName: sObj?.name || getSourceName(dbManga.sourceId),
            lang: (sObj?.lang || 'en').toLowerCase(),
            chapters,
            chapterCount: chapters.length,
            inLibrary: dbManga.inLibrary,
            inLibraryAt: dbManga.inLibraryAt,
            lastFetchedAt: dbManga.lastFetchedAt,
          };

          setCachedData(cacheKey, resultManga, 15);
          return resultManga;
        }
      }
    } catch (e) {
      console.warn('Fast DB query skipped, falling back to network mutation:', e);
    }
  }

  // Slow network path: Fetch fresh details & chapters live from external source via Suwayomi server
  const mutation = `
    mutation GetMangaDetails($mangaId: Int!) {
      fetchMangaAndChapters(
        input: {
          id: $mangaId
          fetchManga: true
          fetchChapters: true
        }
      ) {
        manga {
          id
          title
          author
          artist
          description
          genre
          status
          thumbnailUrl
          inLibrary
          inLibraryAt
          lastFetchedAt
          source {
            id
            name
            lang
          }
          chapters {
            nodes {
              id
              name
              chapterNumber
              uploadDate
              scanlator
              isRead
              isDownloaded
              isBookmarked
              pageCount
              lastPageRead
            }
          }
        }
      }
    }
  `;

  try {
    const res = await queryGraphQL(mutation, { mangaId: numericId });
    let m = res?.data?.fetchMangaAndChapters?.manga;

    if (!m) {
      const directQuery = `
        query DirectManga($id: Int!) {
          manga(id: $id) {
            id
            title
            author
            artist
            description
            genre
            status
            thumbnailUrl
            inLibrary
            inLibraryAt
            lastFetchedAt
            source {
              id
              name
              lang
            }
            chapters {
              nodes {
                id
                name
                chapterNumber
                uploadDate
                scanlator
                isRead
                isDownloaded
                isBookmarked
                pageCount
                lastPageRead
              }
            }
          }
        }
      `;
      const directData = await queryGraphQL(directQuery, { id: numericId });
      m = directData?.data?.manga;
    }

    if (!m) {
      const fallback = getFallbackManga(numericId);
      if (fallback) return fallback;
      return null;
    }

    const chaptersRaw = m.chapters?.nodes || m.chapters || [];
    const chapters: Chapter[] = chaptersRaw.map((c: any) => {
      const nameStr = c.name || `Chapter ${c.chapterNumber || ''}`;
      return {
        id: c.id,
        name: nameStr,
        chapterNumber: c.chapterNumber,
        volumeNumber: parseVolumeNumber(nameStr),
        uploadDate: c.uploadDate,
        scanlator: c.scanlator,
        mangaId: m.id,
        read: c.isRead,
        isRead: c.isRead,
        isDownloaded: c.isDownloaded,
        isBookmarked: c.isBookmarked,
        pageCount: c.pageCount,
        lastPageRead: c.lastPageRead,
      };
    });

    const sObj = m.source || (m.sourceId ? sourceLookupMap[String(m.sourceId)] : null);
    const resultManga: Manga = {
      id: m.id,
      title: m.title,
      author: m.author,
      artist: m.artist,
      description: m.description,
      genre: typeof m.genre === 'string' ? m.genre.split(',').map((g: string) => g.trim()) : m.genre || [],
      status: normalizeMangaStatus(m.status),
      thumbnailUrl: getImageUrl(m.thumbnailUrl),
      sourceId: sObj?.id ? String(sObj.id) : (m.sourceId ? String(m.sourceId) : undefined),
      sourceName: sObj?.name || getSourceName(m.sourceId),
      lang: (sObj?.lang || 'en').toLowerCase(),
      chapters,
      chapterCount: chapters.length,
      inLibrary: m.inLibrary,
      inLibraryAt: m.inLibraryAt,
      lastFetchedAt: m.lastFetchedAt,
    };

    // Only cache details if chapters were successfully loaded
    if (resultManga.chapters && resultManga.chapters.length > 0) {
      setCachedData(cacheKey, resultManga);
    }

    return resultManga;
  } catch (e) {
    console.error('Failed to get manga details:', e);
    const cachedDetail = getCachedData<Manga>(cacheKey);
    if (cachedDetail) return cachedDetail;
    return getFallbackManga(numericId);
  }
}

export function getFallbackManga(mangaId: string | number): Manga | null {
  const idStr = String(mangaId);
  const demoList: Manga[] = [
    {
      id: '101',
      title: "The Ogre's Bride",
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80',
      author: 'Kureha Fujimi',
      rating: 9.8,
      status: 'ONGOING',
      sourceName: 'Sirenscans',
      lang: 'en',
      genre: ['Romance', 'Fantasy', 'Supernatural'],
      description: 'A thrilling supernatural romance about a human bride pledged to a noble Ogre lord.',
      chapters: [
        { id: 'ch_101_1', name: 'Chapter 1: The Promise', chapterNumber: 1, mangaId: '101' },
        { id: 'ch_101_2', name: 'Chapter 2: Into the Realm', chapterNumber: 2, mangaId: '101' },
        { id: 'ch_101_3', name: 'Chapter 3: The Ogre Palace', chapterNumber: 3, mangaId: '101' },
      ],
    },
    {
      id: '102',
      title: 'Though I Am an Inept Villainess - Tale of the Butterfly-Rat Body Swap',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
      author: 'Ei Ohitsuji',
      rating: 9.7,
      status: 'ONGOING',
      sourceName: 'Seven Seas Entertainment',
      lang: 'en',
      genre: ['Fantasy', 'Romance', 'Body Swap'],
      description: 'An imperial court drama featuring body swapping and intrigue.',
      chapters: [
        { id: 'ch_102_1', name: 'Chapter 1: The Body Swap', chapterNumber: 1, mangaId: '102' },
        { id: 'ch_102_2', name: 'Chapter 2: Court Intrigue', chapterNumber: 2, mangaId: '102' },
      ],
    },
    {
      id: '103',
      title: 'Dansai Bunri no Crime Edge',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
      author: 'Tatsuhiko Hikagi',
      rating: 9.5,
      status: 'COMPLETED',
      sourceName: 'MangaDex',
      lang: 'en',
      genre: ['Action', 'Mystery', 'Romance'],
      description: 'A boy obsessed with cutting hair finds a cursed girl whose hair cannot be cut.',
      chapters: [
        { id: 'ch_103_1', name: 'Chapter 1: The Cursed Hair', chapterNumber: 1, mangaId: '103' },
        { id: 'ch_103_2', name: 'Chapter 2: The Scissors of Fate', chapterNumber: 2, mangaId: '103' },
      ],
    },
    {
      id: '104',
      title: 'Detroit Metal City',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80',
      author: 'Kiminori Wakasugi',
      rating: 9.6,
      status: 'COMPLETED',
      sourceName: 'MangaDex',
      lang: 'en',
      genre: ['Comedy', 'Music'],
      description: 'A mild-mannered pop musician secretly leads an infamous death metal band.',
      chapters: [
        { id: 'ch_104_1', name: 'Chapter 1: Krauser II', chapterNumber: 1, mangaId: '104' },
      ],
    },
    {
      id: '105',
      title: 'Nocturne',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
      author: 'Park Eun-yong',
      rating: 9.8,
      status: 'ONGOING',
      sourceName: 'MangaDex',
      lang: 'en',
      genre: ['Manhwa', 'Shoujo', 'Romance', 'Drama', 'Psychological'],
      description: 'A deep psychological romance manhwa.',
      chapters: [
        { id: 'ch_105_1', name: 'Chapter 1: Shadows', chapterNumber: 1, mangaId: '105' },
      ],
    },
    {
      id: '106',
      title: 'The Breaker - New Waves',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80',
      author: 'Jeon Keuk-jin',
      rating: 9.9,
      status: 'COMPLETED',
      sourceName: 'MangaDex',
      lang: 'en',
      genre: ['Manhwa', 'Shounen', 'Action', 'Martial Arts'],
      description: 'A high school martial arts action manhwa saga.',
      chapters: [
        { id: 'ch_106_1', name: 'Chapter 1: The Murim World', chapterNumber: 1, mangaId: '106' },
      ],
    },
  ];

  const foundDemo = demoList.find(d => String(d.id) === idStr);
  if (foundDemo) return foundDemo;

  // Search localStorage cache for any cached manga item with this ID
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('neoko_cache_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const val = parsed.data || parsed.mangas || parsed;
          if (Array.isArray(val)) {
            const hit = val.find((m: any) => String(m?.id) === idStr);
            if (hit) {
              return {
                ...hit,
                chapters: hit.chapters && hit.chapters.length > 0 ? hit.chapters : [
                  { id: `ch_${hit.id}_1`, name: 'Chapter 1', chapterNumber: '1', mangaId: hit.id }
                ],
              };
            }
          }
        }
      }
    }
  } catch { }

  return null;
}

// ──────────────── CHAPTER PAGES ────────────────

export async function getChapterPages(chapterId: number | string, forceRefresh: boolean = false): Promise<string[]> {
  const numericId = typeof chapterId === 'string' ? parseInt(chapterId, 10) : chapterId;
  if (isNaN(numericId)) return [];

  const cacheKey = `chapter_pages_${numericId}`;

  if (!forceRefresh) {
    const cached = getCachedData<string[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  }

  const mutation = `
    mutation GetChapterPages($chapterId: Int!) {
      fetchChapterPages(input: { chapterId: $chapterId }) {
        pages
      }
    }
  `;

  try {
    let res = await queryGraphQL(mutation, { chapterId: numericId });
    let pages: string[] = res?.data?.fetchChapterPages?.pages || [];

    // Retry up to 2 times if pages return empty on initial request (extension live scraping)
    if (pages.length === 0) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        await new Promise(r => setTimeout(r, 800 * attempt));
        res = await queryGraphQL(mutation, { chapterId: numericId });
        pages = res?.data?.fetchChapterPages?.pages || [];
        if (pages.length > 0) break;
      }
    }

    const formattedPages = pages.map(p => getImageUrl(p)).filter(Boolean);

    if (formattedPages.length > 0) {
      setCachedData(cacheKey, formattedPages, 60);
      return formattedPages;
    }

    // Fallback to cache if response empty (e.g. offline)
    const cachedFallback = getCachedData<string[]>(cacheKey);
    return (cachedFallback && Array.isArray(cachedFallback) && cachedFallback.length > 0) ? cachedFallback : [];
  } catch (e) {
    console.error('Failed to get chapter pages:', e);
    const cachedFallback = getCachedData<string[]>(cacheKey);
    return (cachedFallback && Array.isArray(cachedFallback) && cachedFallback.length > 0) ? cachedFallback : [];
  }
}

export async function getChapterDetails(chapterId: number | string): Promise<{
  id: string | number;
  name: string;
  chapterNumber?: number;
  mangaId?: string | number;
  mangaTitle?: string;
  thumbnailUrl?: string;
} | null> {
  const numericId = typeof chapterId === 'string' ? parseInt(chapterId, 10) : chapterId;
  const cacheKey = `chapter_detail_${numericId}`;

  const cached = getCachedData<any>(cacheKey);
  if (cached) return cached;

  const query = `
    query GetChapterDetails($id: Int!) {
      chapter(id: $id) {
        id
        name
        chapterNumber
        manga {
          id
          title
          thumbnailUrl
        }
      }
    }
  `;

  try {
    const res = await queryGraphQL(query, { id: numericId });
    const c = res?.data?.chapter;
    if (!c) return null;
    const detail = {
      id: c.id,
      name: c.name || `Chapter ${c.chapterNumber || numericId}`,
      chapterNumber: c.chapterNumber,
      mangaId: c.manga?.id || '1',
      mangaTitle: c.manga?.title || 'Unknown Manga',
      thumbnailUrl: c.manga?.thumbnailUrl ? getImageUrl(c.manga.thumbnailUrl) : undefined,
    };
    setCachedData(cacheKey, detail, 60);
    return detail;
  } catch (e) {
    console.error('Failed to get chapter details:', e);
    return null;
  }
}

// ──────────────── EXTENSIONS ────────────────

export async function getExtensions(forceRefresh: boolean = false): Promise<Extension[]> {
  const cacheKey = 'extensions_list';

  if (!forceRefresh) {
    const cached = getCachedData<Extension[]>(cacheKey);
    if (cached) return cached;
  }

  const query = `
    query GetExtensions {
      extensions {
        nodes {
          pkgName
          name
          versionName
          lang
          isInstalled
          isNsfw
          hasUpdate
          isObsolete
        }
      }
    }
  `;

  try {
    const res = await queryGraphQL(query);
    const nodes = res?.data?.extensions?.nodes || res?.data?.extensions || [];
    const formatted: Extension[] = nodes.map((e: any) => ({
      pkgName: e.pkgName,
      name: e.name,
      versionName: e.versionName,
      lang: e.lang,
      isInstalled: Boolean(e.isInstalled),
      isNsfw: isDedicatedNsfwName(e.name),
      hasUpdate: Boolean(e.hasUpdate),
      isObsolete: Boolean(e.isObsolete),
    }));

    setCachedData(cacheKey, formatted, 60);
    return formatted;
  } catch (e) {
    console.error('Failed to get extensions:', e);
    return [];
  }
}

export async function installExtension(pkgName: string): Promise<boolean> {
  const mutation = `
    mutation InstallExt($pkgName: String!) {
      updateExtension(input: { id: $pkgName, patch: { install: true } }) {
        extension {
          name
          pkgName
          isInstalled
        }
      }
    }
  `;

  try {
    const res = await queryGraphQL(mutation, { pkgName });
    const success = Boolean(res?.data?.updateExtension?.extension?.isInstalled);
    if (success) {
      setCachedData('extensions_list', null, 0);
      setCachedData('sources_list', null, 0);
    }
    return success;
  } catch (e) {
    console.error('Failed to install extension:', e);
    return false;
  }
}

export async function uninstallExtension(pkgName: string): Promise<boolean> {
  const mutation = `
    mutation UninstallExt($pkgName: String!) {
      updateExtension(input: { id: $pkgName, patch: { uninstall: true } }) {
        extension {
          name
          isInstalled
        }
      }
    }
  `;
  try {
    const res = await queryGraphQL(mutation, { pkgName });
    const ext = res?.data?.updateExtension?.extension;
    if (ext && !ext.isInstalled) {
      setCachedData('extensions_list', null, 0);
      setCachedData('sources_list', null, 0);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to uninstall extension:', e);
    return false;
  }
}

// ──────────────── DOWNLOADS (REAL API) ────────────────

export async function downloadChapter(chapterId: number | string): Promise<boolean> {
  const numericId = typeof chapterId === 'string' ? parseInt(chapterId, 10) : chapterId;
  try {
    await queryGraphQL(
      'mutation ($id: Int!) { enqueueChapterDownload(input: { id: $id }) { clientMutationId } }',
      { id: numericId }
    );
    await queryGraphQL('mutation { startDownloader(input: {}) { downloadStatus { state } } }');
    return true;
  } catch (e) {
    console.error('Failed to download chapter:', e);
    return false;
  }
}

export async function downloadChapters(chapterIds: number[]): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($ids: [Int!]!) { enqueueChapterDownloads(input: { ids: $ids }) { clientMutationId } }',
      { ids: chapterIds }
    );
    await queryGraphQL('mutation { startDownloader(input: {}) { downloadStatus { state } } }');
    return true;
  } catch (e) {
    console.error('Failed to download chapters:', e);
    return false;
  }
}

export async function getDownloadStatus(): Promise<DownloadStatus | null> {
  try {
    const res = await queryGraphQL('{ downloadStatus { state queue { chapter { id name manga { title thumbnailUrl } } state progress tries } } }');
    return res?.data?.downloadStatus || null;
  } catch (e) {
    console.error('Failed to get download status:', e);
    return null;
  }
}

export async function startDownloader(): Promise<boolean> {
  try {
    await queryGraphQL('mutation { startDownloader(input: {}) { downloadStatus { state } } }');
    return true;
  } catch { return false; }
}

export async function stopDownloader(): Promise<boolean> {
  try {
    await queryGraphQL('mutation { stopDownloader(input: {}) { downloadStatus { state } } }');
    return true;
  } catch { return false; }
}

export async function clearDownloader(): Promise<boolean> {
  try {
    await queryGraphQL('mutation { clearDownloader(input: {}) { downloadStatus { state } } }');
    return true;
  } catch { return false; }
}

export async function deleteDownloadedChapter(chapterId: number): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($id: Int!) { deleteDownloadedChapter(input: { id: $id }) { chapters { id isDownloaded } } }',
      { id: chapterId }
    );
    return true;
  } catch { return false; }
}

// ──────────────── MANGA LIBRARY (REAL API) ────────────────

export async function updateMangaInLibrary(mangaId: number | string, inLibrary: boolean): Promise<boolean> {
  const numericId = typeof mangaId === 'string' ? parseInt(mangaId, 10) : mangaId;
  try {
    await queryGraphQL(
      'mutation ($id: Int!, $inLibrary: Boolean!) { updateManga(input: { id: $id, patch: { inLibrary: $inLibrary } }) { manga { id inLibrary } } }',
      { id: numericId, inLibrary }
    );
    return true;
  } catch { return false; }
}

export async function updateMangaCategories(mangaId: number, categoryIds: number[]): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($id: Int!, $addTo: [Int!]!) { updateMangaCategories(input: { id: $id, patch: { addToCategories: $addTo, clearCategories: true } }) { manga { id } } }',
      { id: mangaId, addTo: categoryIds }
    );
    return true;
  } catch { return false; }
}

export async function updateChapterRead(chapterId: number, isRead: boolean): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($id: Int!, $isRead: Boolean!) { updateChapter(input: { id: $id, patch: { isRead: $isRead } }) { chapter { id isRead } } }',
      { id: chapterId, isRead }
    );
    return true;
  } catch { return false; }
}

export async function updateLibrary(): Promise<boolean> {
  try {
    await queryGraphQL('mutation { updateLibrary(input: {}) { updateStatus { isRunning } } }');
    return true;
  } catch { return false; }
}

export async function stopLibraryUpdate(): Promise<boolean> {
  try {
    await queryGraphQL('mutation { updateStop(input: {}) { clientMutationId } }');
    return true;
  } catch { return false; }
}

export async function getLibraryUpdateStatus(): Promise<{ isRunning: boolean; completeJobs: any; failedJobs: any; pendingJobs: any } | null> {
  try {
    const res = await queryGraphQL('{ libraryUpdateStatus { isRunning completeJobs { mangas { totalCount } } failedJobs { mangas { totalCount } } pendingJobs { mangas { totalCount } } } }');
    return res?.data?.libraryUpdateStatus || null;
  } catch { return null; }
}

export async function getLastUpdateTimestamp(): Promise<string | null> {
  try {
    const res = await queryGraphQL('{ lastUpdateTimestamp { timestamp } }');
    return res?.data?.lastUpdateTimestamp?.timestamp || null;
  } catch { return null; }
}

// ──────────────── CATEGORIES (REAL API) ────────────────

export async function getCategories(): Promise<Category[]> {
  try {
    const res = await queryGraphQL('{ categories { nodes { id name order default mangas { totalCount } } } }');
    const nodes = res?.data?.categories?.nodes || [];
    return nodes.map((c: any) => ({
      id: c.id,
      name: c.name,
      order: c.order,
      default: c.default,
      mangaCount: c.mangas?.totalCount || 0,
    }));
  } catch { return []; }
}

export async function createCategory(name: string): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($name: String!) { createCategory(input: { name: $name }) { category { id name } } }',
      { name }
    );
    return true;
  } catch { return false; }
}

export async function deleteCategory(categoryId: number): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($id: Int!) { deleteCategory(input: { categoryId: $id }) { category { id } } }',
      { id: categoryId }
    );
    return true;
  } catch { return false; }
}

export async function updateCategoryName(categoryId: number, name: string): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($id: Int!, $name: String!) { updateCategory(input: { id: $id, patch: { name: $name } }) { category { id name } } }',
      { id: categoryId, name }
    );
    return true;
  } catch { return false; }
}

// ──────────────── TRACKERS (REAL API) ────────────────

export async function getTrackers(): Promise<TrackerInfo[]> {
  try {
    const res = await queryGraphQL(
      '{ trackers { nodes { id name icon isLoggedIn isTokenExpired authUrl supportsPrivateTracking supportsReadingDates supportsTrackDeletion scores statuses { name value } trackRecords { totalCount } } } }'
    );
    const nodes = res?.data?.trackers?.nodes || [];
    return nodes.map((t: any) => ({
      id: t.id,
      name: t.name,
      icon: getImageUrl(t.icon),
      isLoggedIn: t.isLoggedIn,
      isTokenExpired: t.isTokenExpired,
      authUrl: t.authUrl,
      supportsPrivateTracking: t.supportsPrivateTracking ?? false,
      supportsReadingDates: t.supportsReadingDates ?? false,
      supportsTrackDeletion: t.supportsTrackDeletion ?? false,
      scores: t.scores || [],
      statuses: t.statuses || [],
      trackRecords: t.trackRecords || { totalCount: 0 },
    }));
  } catch { return []; }
}

export async function loginTrackerCredentials(trackerId: number, username: string, password: string): Promise<boolean> {
  try {
    const res = await queryGraphQL(
      'mutation ($id: Int!, $username: String!, $password: String!) { loginTrackerCredentials(input: { trackerId: $id, username: $username, password: $password }) { isLoggedIn } }',
      { id: trackerId, username, password }
    );
    return res?.data?.loginTrackerCredentials?.isLoggedIn ?? false;
  } catch { return false; }
}

export async function loginTrackerOAuth(trackerId: number, callbackUrl: string): Promise<boolean> {
  try {
    const res = await queryGraphQL(
      'mutation ($id: Int!, $callbackUrl: String!) { loginTrackerOAuth(input: { trackerId: $id, callbackUrl: $callbackUrl }) { isLoggedIn } }',
      { id: trackerId, callbackUrl }
    );
    return res?.data?.loginTrackerOAuth?.isLoggedIn ?? false;
  } catch { return false; }
}

export async function logoutTracker(trackerId: number): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($id: Int!) { logoutTracker(input: { trackerId: $id }) { tracker { isLoggedIn } } }',
      { id: trackerId }
    );
    return true;
  } catch { return false; }
}

export async function getMangaTrackRecords(mangaId: number | string): Promise<TrackRecord[]> {
  try {
    const numericId = typeof mangaId === 'number' ? mangaId : parseInt(mangaId, 10);
    if (isNaN(numericId)) return [];
    const res = await queryGraphQL(
      'query ($id: Int!) { manga(id: $id) { trackRecords { nodes { id trackerId remoteId status score displayScore lastChapterRead totalChapters remoteUrl startDate finishDate private } } } }',
      { id: numericId }
    );
    return res?.data?.manga?.trackRecords?.nodes || [];
  } catch { return []; }
}

export async function searchTracker(trackerId: number, query: string): Promise<TrackSearchResult[]> {
  try {
    const res = await queryGraphQL(
      'query ($tId: Int!, $q: String!) { searchTracker(input: { trackerId: $tId, query: $q }) { trackSearches { id trackerId remoteId title coverUrl summary totalChapters status score displayScore lastChapterRead trackingUrl } } }',
      { tId: trackerId, q: query }
    );
    return res?.data?.searchTracker?.trackSearches || [];
  } catch { return []; }
}

export async function bindTrack(mangaId: number | string, trackerId: number, remoteId: string): Promise<TrackRecord | null> {
  try {
    const numericId = typeof mangaId === 'number' ? mangaId : parseInt(mangaId, 10);
    if (isNaN(numericId)) return null;
    const res = await queryGraphQL(
      'mutation ($mId: Int!, $tId: Int!, $rId: LongString!) { bindTrack(input: { mangaId: $mId, trackerId: $tId, remoteId: $rId }) { trackRecord { id trackerId remoteId status score displayScore lastChapterRead totalChapters remoteUrl private } } }',
      { mId: numericId, tId: trackerId, rId: String(remoteId) }
    );
    const rec = res?.data?.bindTrack?.trackRecord || null;
    if (rec) {
      // Auto trigger progress sync to tracker
      await trackProgress(numericId);
    }
    return rec;
  } catch { return null; }
}

export async function unbindTrack(recordId: number): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($recId: Int!) { unbindTrack(input: { recordId: $recId }) { clientMutationId } }',
      { recId: recordId }
    );
    return true;
  } catch { return false; }
}

export async function fetchTrack(recordId: number): Promise<TrackRecord | null> {
  try {
    const res = await queryGraphQL(
      'mutation ($recId: Int!) { fetchTrack(input: { recordId: $recId }) { trackRecord { id trackerId remoteId status score displayScore lastChapterRead totalChapters remoteUrl startDate finishDate private } } }',
      { recId: recordId }
    );
    return res?.data?.fetchTrack?.trackRecord || null;
  } catch { return null; }
}

export async function updateTrack(
  recordId: number,
  status?: number,
  score?: number | string,
  lastChapterRead?: number,
  privateStatus?: boolean
): Promise<boolean> {
  try {
    const variables: Record<string, any> = { recId: recordId };
    if (status !== undefined) variables.st = status;
    if (score !== undefined && score !== null) variables.sc = String(score);
    if (lastChapterRead !== undefined) variables.ch = lastChapterRead;
    if (privateStatus !== undefined) variables.pr = privateStatus;

    await queryGraphQL(
      'mutation ($recId: Int!, $st: Int, $sc: String, $ch: Float, $pr: Boolean) { updateTrack(input: { recordId: $recId, status: $st, scoreString: $sc, lastChapterRead: $ch, private: $pr }) { trackRecord { id status score displayScore lastChapterRead private } } }',
      variables
    );
    return true;
  } catch { return false; }
}

export async function trackProgress(mangaId: number | string): Promise<boolean> {
  try {
    const numericId = typeof mangaId === 'number' ? mangaId : parseInt(mangaId, 10);
    if (isNaN(numericId)) return false;
    await queryGraphQL(
      'mutation ($mId: Int!) { trackProgress(input: { mangaId: $mId }) { clientMutationId } }',
      { mId: numericId }
    );
    return true;
  } catch { return false; }
}

export async function autoBindTrackers(mangaId: number | string, mangaTitle: string): Promise<TrackRecord[]> {
  try {
    const numericId = typeof mangaId === 'number' ? mangaId : parseInt(mangaId, 10);
    if (isNaN(numericId) || !mangaTitle) return [];

    const [trackers, existingRecords] = await Promise.all([
      getTrackers(),
      getMangaTrackRecords(numericId),
    ]);

    const loggedInTrackers = trackers.filter(t => t.isLoggedIn);
    if (loggedInTrackers.length === 0) return existingRecords;

    const boundTrackerIds = new Set(existingRecords.map(r => r.trackerId));

    for (const tracker of loggedInTrackers) {
      if (!boundTrackerIds.has(tracker.id)) {
        // Auto search for matching title
        const searchResults = await searchTracker(tracker.id, mangaTitle);
        if (searchResults && searchResults.length > 0) {
          const cleanMangaTitle = mangaTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
          // Only auto-bind if there is an exact or very strong title match
          const exactMatch = searchResults.find(r => {
            const cleanResultTitle = r.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanResultTitle === cleanMangaTitle;
          });
          if (exactMatch) {
            await bindTrack(numericId, tracker.id, exactMatch.remoteId);
          }
        }
      }
    }
    return await getMangaTrackRecords(numericId);
  } catch (e) {
    console.error('Auto bind trackers error:', e);
    return [];
  }
}


// ──────────────── BACKUP & RESTORE (REAL API) ────────────────

export async function createBackup(): Promise<string | null> {
  try {
    const res = await queryGraphQL('mutation { createBackup(input: {}) { url } }');
    return res?.data?.createBackup?.url || null;
  } catch { return null; }
}

export async function restoreBackup(backupFile: File): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('operations', JSON.stringify({
      query: 'mutation ($file: Upload!) { restoreBackup(input: { backup: $file }) { status { state } } }',
      variables: { file: null },
    }));
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', backupFile);

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
    const json = await response.json();
    return !json.errors;
  } catch { return false; }
}

// ──────────────── SERVER SETTINGS (REAL API) ────────────────

export async function getServerSettings(): Promise<ServerSettings | null> {
  try {
    const res = await queryGraphQL(`{
      settings {
        ip port autoDownloadNewChapters autoDownloadNewChaptersLimit
        excludeEntryWithUnreadChapters globalUpdateInterval updateMangas
        flareSolverrEnabled flareSolverrUrl flareSolverrSessionName flareSolverrTimeout
        basicAuthEnabled basicAuthUsername debugLogsEnabled downloadAsCbz
        downloadsPath localSourcePath
        socksProxyEnabled socksProxyHost socksProxyPort
        extensionRepos backupInterval backupPath backupTTL backupTime
        maxSourcesInParallel
      }
    }`);
    return res?.data?.settings || null;
  } catch { return null; }
}

export async function updateServerSettings(patch: Record<string, any>): Promise<boolean> {
  const setParts = Object.entries(patch)
    .map(([key, value]) => {
      if (typeof value === 'string') return `${key}: "${value}"`;
      if (typeof value === 'boolean') return `${key}: ${value}`;
      if (typeof value === 'number') return `${key}: ${value}`;
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join(', ');

  try {
    await queryGraphQL(`mutation { setSettings(input: { settings: { ${setParts} } }) { settings { ip } } }`);
    return true;
  } catch { return false; }
}

export async function getServerInfo(): Promise<ServerInfo | null> {
  try {
    const res = await queryGraphQL('{ aboutServer { name version revision buildType buildTime github discord } }');
    return res?.data?.aboutServer || null;
  } catch { return null; }
}

export async function clearCachedImages(): Promise<boolean> {
  try {
    await queryGraphQL('mutation { clearCachedImages(input: {}) { clientMutationId } }');
    return true;
  } catch { return false; }
}

// ──────────────── SITE STATS ────────────────

export async function getSiteStats(): Promise<SiteStats> {
  const cacheKey = 'site_stats_v1';
  const cached = getCachedData<SiteStats>(cacheKey);
  if (cached) return cached;

  const defaults: SiteStats = {
    totalManga: 0,
    totalChapters: 0,
    activeSources: 0,
    librarySize: 0,
    recentChapters7d: 0,
  };

  try {
    // Query total counts from Suwayomi GraphQL
    const [countRes, sourcesRes] = await Promise.all([
      queryGraphQL(`{
        mangas { totalCount }
        chapters { totalCount }
      }`),
      getSources(false, true),
    ]);

    const totalManga = countRes?.data?.mangas?.totalCount ?? 0;
    const totalChapters = countRes?.data?.chapters?.totalCount ?? 0;
    const activeSources = sourcesRes?.length ?? 0;

    // Query library count
    let librarySize = 0;
    try {
      const libRes = await queryGraphQL(`{
        mangas(condition: { inLibrary: true }) { totalCount }
      }`);
      librarySize = libRes?.data?.mangas?.totalCount ?? 0;
    } catch {
      // Some Suwayomi versions may not support condition filter
    }

    // Estimate recent chapter updates from last 7 days
    // Query the most recent chapters and count those within 7 days
    let recentChapters7d = 0;
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentRes = await queryGraphQL(`{
        chapters(orderBy: UPLOAD_DATE, orderByFilter: DESC, first: 200) {
          nodes {
            uploadDate
          }
        }
      }`);
      const nodes = recentRes?.data?.chapters?.nodes || [];
      recentChapters7d = nodes.filter((c: any) => {
        if (!c.uploadDate) return false;
        const uploadTs = typeof c.uploadDate === 'number' ? c.uploadDate : new Date(c.uploadDate).getTime();
        return uploadTs >= sevenDaysAgo;
      }).length;
    } catch {
      // Ordering may not be supported on all Suwayomi versions
    }

    const stats: SiteStats = {
      totalManga,
      totalChapters,
      activeSources,
      librarySize,
      recentChapters7d,
    };

    setCachedData(cacheKey, stats, 10); // Cache for 10 minutes
    return stats;
  } catch (e) {
    console.error('Failed to fetch site stats:', e);
    return defaults;
  }
}

// ──────────────── EXTENSION STORES ────────────────

export async function addExtensionStore(indexUrl: string): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($url: String!) { addExtensionStore(input: { indexUrl: $url }) { extensionStore { name } } }',
      { url: indexUrl }
    );
    return true;
  } catch { return false; }
}

export async function removeExtensionStore(indexUrl: string): Promise<boolean> {
  try {
    await queryGraphQL(
      'mutation ($url: String!) { removeExtensionStore(input: { indexUrl: $url }) { extensionStore { name } } }',
      { url: indexUrl }
    );
    return true;
  } catch { return false; }
}

export async function getExtensionStores(): Promise<string[]> {
  try {
    const res = await queryGraphQL('{ extensionStores { nodes { indexUrl name } } }');
    const nodes = res?.data?.extensionStores?.nodes || [];
    return nodes.map((s: any) => s.indexUrl);
  } catch { return []; }
}
