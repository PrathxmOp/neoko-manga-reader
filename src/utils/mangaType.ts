export type ComicType = 'Manga' | 'Manhwa' | 'Manhua' | 'Comic';

export const getComicType = (manga?: {
  title?: string;
  lang?: string;
  genre?: string[] | string;
  sourceName?: string;
  description?: string;
}): ComicType => {
  if (!manga) return 'Manga';

  const genres = Array.isArray(manga.genre)
    ? manga.genre.map(g => g.toLowerCase().trim())
    : (manga.genre || '').toLowerCase().split(/[,·\s]+/);

  const lang = (manga.lang || '').toLowerCase().trim();
  const title = (manga.title || '').toLowerCase().trim();
  const source = (manga.sourceName || '').toLowerCase().trim();
  const desc = (manga.description || '').toLowerCase().trim();

  // 1. Explicit Genre / Tag Check
  if (genres.some(g => g === 'manhwa' || g.includes('manhwa') || g.includes('webtoon'))) return 'Manhwa';
  if (genres.some(g => g === 'manhua' || g.includes('manhua'))) return 'Manhua';

  // 2. Language Check
  if (lang === 'ko' || lang.startsWith('ko-') || lang === 'kr') return 'Manhwa';
  if (lang === 'zh' || lang.startsWith('zh-') || lang === 'cn') return 'Manhua';
  if (lang === 'ja' || lang.startsWith('ja-') || lang === 'jp') return 'Manga';

  // 3. Known Sources Specialization
  if (
    source.includes('asura') || 
    source.includes('flame') || 
    source.includes('reaper') || 
    source.includes('luminous') || 
    source.includes('drake') ||
    source.includes('realm') ||
    source.includes('void') ||
    source.includes('zero')
  ) {
    return 'Manhwa';
  }

  if (source.includes('manhua') || source.includes('bilibili') || source.includes('baozi')) {
    return 'Manhua';
  }

  // 4. Keywords in Title / Description
  if (title.includes('manhwa') || desc.includes('manhwa') || desc.includes('korean webtoon')) return 'Manhwa';
  if (title.includes('manhua') || desc.includes('manhua') || desc.includes('chinese comic')) return 'Manhua';

  return 'Manga';
};

export const getComicTypeColor = (type: ComicType): string => {
  switch (type) {
    case 'Manhwa':
      return 'bg-[#7c3aed]/30 text-[#c4b5fd] border border-[#7c3aed]/50';
    case 'Manhua':
      return 'bg-[#059669]/30 text-[#6ee7b7] border border-[#059669]/50';
    case 'Comic':
      return 'bg-[#d97706]/30 text-[#fde047] border border-[#d97706]/50';
    case 'Manga':
    default:
      return 'bg-[#2563eb]/30 text-[#93c5fd] border border-[#2563eb]/50';
  }
};
