// Service to fetch real live Manga ratings and details directly from public AniList GraphQL API

export interface AniListMangaData {
  chapters?: number;
  volumes?: number;
  averageScore?: number; // e.g. 85 -> 8.5
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

const cache = new Map<string, AniListMangaData | null>();

export async function fetchAniListRating(title: string): Promise<AniListMangaData | null> {
  if (!title) return null;

  // Clean title for accurate AniList search matching
  const cleanTitle = title
    .replace(/[\(\[\{\\\/].*?[\)\]\}]/g, '') // remove brackets e.g. (Color), [Official]
    .replace(/\b(?:vol(?:ume)?|ch(?:apter)?|raw|digital|colored|webtoon|comic)\b.*/gi, '') // remove chapter/volume tags
    .replace(/[^\w\s\-\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanTitle) return null;

  if (cache.has(cleanTitle)) {
    return cache.get(cleanTitle) || null;
  }

  // Check localStorage cache first
  const cacheKey = `neoko_anilist_${cleanTitle.toLowerCase()}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      cache.set(cleanTitle, parsed);
      return parsed;
    }
  } catch {}

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: MANGA, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
          id
          title {
            romaji
            english
            native
          }
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
          coverImage {
            extraLarge
            large
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { search: cleanTitle },
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const mediaList = json?.data?.Page?.media || [];

    if (mediaList && mediaList.length > 0) {
      // Pick the media item with the highest popularity among top matches
      const targetLower = cleanTitle.toLowerCase();
      let bestMedia = mediaList[0];

      // If an exact title match exists, prioritize it
      for (const item of mediaList) {
        const romaji = (item.title?.romaji || '').toLowerCase();
        const english = (item.title?.english || '').toLowerCase();
        if (romaji === targetLower || english === targetLower) {
          bestMedia = item;
          break;
        }
      }

      const cleanDesc = bestMedia.description
        ? bestMedia.description.replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
        : undefined;

      const result: AniListMangaData = {
        chapters: bestMedia.chapters || undefined,
        volumes: bestMedia.volumes || undefined,
        averageScore: bestMedia.averageScore ? Number((bestMedia.averageScore / 10).toFixed(1)) : undefined,
        meanScore: bestMedia.meanScore ? Number((bestMedia.meanScore / 10).toFixed(1)) : undefined,
        popularity: bestMedia.popularity,
        favourites: bestMedia.favourites,
        siteUrl: bestMedia.siteUrl,
        coverImage: bestMedia.coverImage?.extraLarge || bestMedia.coverImage?.large,
        bannerImage: bestMedia.bannerImage || undefined,
        description: cleanDesc,
        genres: bestMedia.genres || [],
        status: bestMedia.status,
      };

      cache.set(cleanTitle, result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {}

      return result;
    }
  } catch (err) {
    console.warn('Failed to fetch AniList rating for:', cleanTitle, err);
  }

  cache.set(cleanTitle, null);
  return null;
}
