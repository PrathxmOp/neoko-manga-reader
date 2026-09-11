/**
 * Centralized Extension Categorization Rules
 * 
 * Edit this file anytime to add or remove default 18+ (Adult/NSFW) and SFW (Normal) extensions.
 */

// 1. Extensions that should be classified as 18+ / Adult by default
export const DEFAULT_18PLUS_EXTENSIONS: string[] = [
  'comick (unoriginal)',
  'hentai',
  'nhentai',
  '3hentai',
  'e-hentai',
  'exhentai',
  'porno',
  'porn',
  'allporncomics',
  'pururin',
  'multporn',
  'hitomi',
  'luscious',
  '8muses',
  'hbrowse',
  'tsumino',
  'manhwa18',
  'toonily18',
  'manga18',
  'webtoonxyz',
  '18comic',
  'erotica',
  'doujin',
];

// 2. Extensions that are General SFW Manga/Manhwa sources by default
export const DEFAULT_SFW_EXTENSIONS: string[] = [
  'mangadex',
  'bato',
  'mangareader',
  'mangafire',
  'weeb central',
  'pocket comics',
  'asura',
  'flame',
  'manga plus',
  'manga demon',
  'read comic',
  'mangasee',
  'mangalife',
  'mangapark',
  'mangakakalot',
  'manganato',
  'tapas',
  'webtoons',
  'rawdevart',
  'mangaraw',
  'klmanga',
  'mangaowl',
];

/**
 * Checks whether an extension name or ID is 18+ by default.
 */
export function isDefault18Plus(extensionNameOrId?: string): boolean {
  if (!extensionNameOrId) return false;
  const nameLower = String(extensionNameOrId).toLowerCase().trim();

  // 1. Check if it matches any explicit 18+ extension rule
  const is18Plus = DEFAULT_18PLUS_EXTENSIONS.some(keyword => nameLower.includes(keyword.toLowerCase()));
  if (is18Plus) return true;

  return false;
}

/**
 * Checks whether an extension is explicitly whitelisted as SFW.
 */
export function isDefaultSfw(extensionNameOrId?: string): boolean {
  if (!extensionNameOrId) return false;
  const nameLower = String(extensionNameOrId).toLowerCase().trim();

  if (nameLower.includes('comick') && !nameLower.includes('unoriginal')) {
    return true;
  }

  return DEFAULT_SFW_EXTENSIONS.some(keyword => nameLower.includes(keyword.toLowerCase()));
}
