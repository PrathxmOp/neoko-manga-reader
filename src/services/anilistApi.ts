import { Manga } from '../types/manga';

export interface AniListMangaData {
  chapters?: number;
  volumes?: number;
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  siteUrl?: string;
  coverImage?: string;
  bannerImage?: string;
  description?: string;
  genres?: string[];
  status?: string;
}

export interface AniListMediaItem {
  id: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
    userPreferred?: string;
  };
  synonyms?: string[];
  chapters?: number;
  volumes?: number;
  averageScore?: number; // e.g. 85 -> 8.5
  meanScore?: number;
  popularity?: number;
  favourites?: number;
  siteUrl?: string;
  coverImage?: {
    extraLarge?: string;
    large?: string;
    medium?: string;
  };
  bannerImage?: string;
  description?: string;
  genres?: string[];
  status?: string;
  format?: string;
}

export interface AniListSearchResult {
  mangas: Manga[];
  rawMedia: AniListMediaItem[];
  hasNextPage: boolean;
  total?: number;
}

export function aniListMediaToManga(item: AniListMediaItem): Manga {
  const primaryTitle = item.title?.english || item.title?.userPreferred || item.title?.romaji || item.title?.native || 'Untitled';
  const cleanDesc = item.description
    ? item.description.replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
    : '';

  // AniList score is 0-100, convert to 0.0-10.0 scale
  const ratingScore = item.averageScore ? Number((item.averageScore / 10).toFixed(1)) : (item.meanScore ? Number((item.meanScore / 10).toFixed(1)) : undefined);

  let statusStr = 'ONGOING';
  if (item.status === 'FINISHED' || item.status === 'COMPLETED') statusStr = 'COMPLETED';
  else if (item.status === 'HIATUS') statusStr = 'HIATUS';
  else if (item.status === 'CANCELLED') statusStr = 'CANCELLED';
  else if (item.status === 'NOT_YET_RELEASED') statusStr = 'UPCOMING';

  return {
    id: `anilist-${item.id}`,
    title: primaryTitle,
    thumbnailUrl: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium,
    description: cleanDesc,
    rating: ratingScore,
    status: statusStr,
    sourceId: 'anilist',
    sourceName: 'AniList',
    genre: item.genres || [],
    chapterCount: item.chapters || undefined,
    lang: 'en',
  };
}

export async function searchAniList(
  searchQueryText: string = '',
  page: number = 1,
  perPage: number = 24
): Promise<AniListSearchResult> {
  const cleanQuery = searchQueryText.trim();
  const cacheKey = `anilist_search_${cleanQuery.toLowerCase()}_p${page}`;
  
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.rawMedia) {
        return {
          mangas: parsed.rawMedia.map(aniListMediaToManga),
          rawMedia: parsed.rawMedia,
          hasNextPage: parsed.hasNextPage,
          total: parsed.total
        };
      }
    }
  } catch {}

  const hasQuery = cleanQuery.length > 0;

  const query = hasQuery ? `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          hasNextPage
        }
        media(search: $search, type: MANGA, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
          id
          title {
            romaji
            english
            native
            userPreferred
          }
          synonyms
          chapters
          volumes
          averageScore
          meanScore
          popularity
          favourites
          siteUrl
          description(asHtml: false)
          bannerImage
          genres
          status
          format
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    }
  ` : `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          hasNextPage
        }
        media(type: MANGA, sort: [POPULARITY_DESC]) {
          id
          title {
            romaji
            english
            native
            userPreferred
          }
          synonyms
          chapters
          volumes
          averageScore
          meanScore
          popularity
          favourites
          siteUrl
          description(asHtml: false)
          bannerImage
          genres
          status
          format
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    }
  `;

  try {
    const variables: Record<string, any> = { page, perPage };
    if (hasQuery) {
      variables.search = cleanQuery;
    }

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      return { mangas: [], rawMedia: [], hasNextPage: false };
    }

    const json = await res.json();
    const pageData = json?.data?.Page;
    let mediaList: AniListMediaItem[] = pageData?.media || [];
    let hasNextPage = Boolean(pageData?.pageInfo?.hasNextPage);
    let total = pageData?.pageInfo?.total;

    // Typo Correction Fallback: If 0 results returned, retry with deduplicated letters (e.g. "Prommise" -> "Promise")
    if (hasQuery && mediaList.length === 0 && cleanQuery.length > 3) {
      const typoFixed = cleanQuery.replace(/([^r])\1+/gi, '$1').trim(); // e.g. mm -> m
      if (typoFixed !== cleanQuery) {
        const fallbackRes = await searchAniList(typoFixed, page, perPage);
        if (fallbackRes.rawMedia && fallbackRes.rawMedia.length > 0) {
          return fallbackRes;
        }
      }
      
      // Secondary Fallback: Try searching the longest word in the query (e.g. "Neverland")
      const words = cleanQuery.split(/\s+/).filter(w => w.length > 3);
      if (words.length > 1) {
        words.sort((a, b) => b.length - a.length);
        const fallbackRes = await searchAniList(words[0], page, perPage);
        if (fallbackRes.rawMedia && fallbackRes.rawMedia.length > 0) {
          return fallbackRes;
        }
      }
    }

    const mangas = mediaList.map(aniListMediaToManga);

    const result: AniListSearchResult = {
      mangas,
      rawMedia: mediaList,
      hasNextPage,
      total
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ rawMedia: mediaList, hasNextPage, total }));
    } catch {}

    return result;
  } catch (err) {
    console.error('Failed to search AniList:', err);
    return { mangas: [], rawMedia: [], hasNextPage: false };
  }
}

const ratingCache = new Map<string, AniListMangaData | null>();

export async function fetchAniListRating(title: string): Promise<AniListMangaData | null> {
  if (!title) return null;

  const cleanTitle = title
    .replace(/[\(\[\{\\\/].*?[\)\]\}]/g, '')
    .replace(/\b(?:vol(?:ume)?|ch(?:apter)?|raw|digital|colored|webtoon|comic)\b.*/gi, '')
    .replace(/[^\w\s\-\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle) return null;

  if (ratingCache.has(cleanTitle)) {
    return ratingCache.get(cleanTitle) || null;
  }

  const cacheKey = `neoko_anilist_${cleanTitle.toLowerCase()}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      ratingCache.set(cleanTitle, parsed);
      return parsed;
    }
  } catch {}

  try {
    const searchRes = await searchAniList(cleanTitle, 1, 5);
    if (searchRes.rawMedia && searchRes.rawMedia.length > 0) {
      const targetLower = cleanTitle.toLowerCase();
      let best = searchRes.rawMedia[0];
      for (const item of searchRes.rawMedia) {
        const rom = (item.title?.romaji || '').toLowerCase();
        const eng = (item.title?.english || '').toLowerCase();
        if (rom === targetLower || eng === targetLower) {
          best = item;
          break;
        }
      }

      const cleanDesc = best.description
        ? best.description.replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
        : undefined;

      const result: AniListMangaData = {
        chapters: best.chapters || undefined,
        volumes: best.volumes || undefined,
        averageScore: best.averageScore ? Number((best.averageScore / 10).toFixed(1)) : undefined,
        meanScore: best.meanScore ? Number((best.meanScore / 10).toFixed(1)) : undefined,
        popularity: best.popularity,
        favourites: best.favourites,
        siteUrl: best.siteUrl,
        coverImage: best.coverImage?.extraLarge || best.coverImage?.large,
        bannerImage: best.bannerImage || undefined,
        description: cleanDesc,
        genres: best.genres || [],
        status: best.status,
      };

      ratingCache.set(cleanTitle, result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {}
      return result;
    }
  } catch (err) {
    console.warn('Failed to fetch AniList rating for:', cleanTitle, err);
  }

  ratingCache.set(cleanTitle, null);
  return null;
}


