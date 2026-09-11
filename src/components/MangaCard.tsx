import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Manga } from '../types/manga';
import { BookOpen, Info, Sparkles } from 'lucide-react';
import { getSourceName, getImageUrl } from '../services/suwayomiApi';
import { getComicType, getComicTypeColor } from '../utils/mangaType';
import { DEFAULT_MANGA_COVER, handleImageError } from '../utils/imageUtils';

interface MangaCardProps {
  manga: Manga;
  rankBadge?: string;
  progressPercent?: number;
  onInfoClick?: (manga: Manga, e: React.MouseEvent) => void;
}

export const MangaCard: React.FC<MangaCardProps> = React.memo(({ manga, rankBadge, progressPercent, onInfoClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/manga/${manga.id}`);
  };

  const getLangFlag = (lang?: string) => {
    switch (lang?.toLowerCase()) {
      case 'fr': return '🇫🇷 FR';
      case 'ja': return '🇯🇵 JP';
      case 'ko': return '🇰🇷 KO';
      case 'es': return '🇪🇸 ES';
      case 'pl': return '🇵🇱 PL';
      default: return '🇬🇧 EN';
    }
  };

  const getSourceBadgeColor = (sourceName?: string) => {
    const s = (sourceName || manga.sourceName || '').toLowerCase();
    if (s.includes('mangadex')) return 'bg-[#ea580c] text-white';
    if (s.includes('seven seas')) return 'bg-white text-black font-bold';
    if (s.includes('siren')) return 'bg-[#475569] text-white';
    if (s.includes('sg')) return 'bg-[#2563eb] text-white';
    return 'bg-[#2b2746] text-[#cbbcf6] border border-[#443e6b]';
  };

  return (
    <div
      onClick={handleClick}
      className="group flex flex-col gap-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1.5"
    >
      {/* Poster Artwork Box */}
      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#161327] shadow-lg border border-[#2b2746] group-hover:border-[#9d86e9]/60 group-hover:shadow-[0_0_24px_rgba(157,134,233,0.3)] transition-all">
        <img
          src={getImageUrl(manga.thumbnailUrl) || DEFAULT_MANGA_COVER}
          alt={manga.title}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={handleImageError}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/40 to-transparent opacity-90 group-hover:opacity-75 transition-opacity" />

        {/* Top-Left Language & Format Type Pill */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none z-10">
          <span className={`px-2 py-0.5 rounded-md backdrop-blur-md font-sans text-[10px] font-extrabold uppercase shadow-md ${getComicTypeColor(getComicType(manga))}`}>
            {getComicType(manga)}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#120f23]/90 backdrop-blur-md text-white font-sans text-[10px] font-bold border border-white/10 shadow-md flex items-center gap-1">
            {getLangFlag(manga.lang)}
          </span>
          {rankBadge && (
            <span className="px-2 py-0.5 rounded-md bg-[#f59e0b] backdrop-blur-md text-black font-sans text-[10px] font-extrabold uppercase shadow-sm">
              {rankBadge}
            </span>
          )}
        </div>

        {/* Top-Right Action Controls (Info button & Progress Badge) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
          {onInfoClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInfoClick(manga, e);
              }}
              className="p-1.5 rounded-full bg-[#120f23]/90 hover:bg-[#9d86e9] text-white/80 hover:text-black border border-white/10 hover:border-[#9d86e9] backdrop-blur-md transition-all shadow-md active:scale-90"
              title="Quick Info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
          {typeof manga.unreadCount === 'number' && manga.unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-[#9d86e9] text-[#0c0c14] font-sans text-[10px] font-black shadow-lg border border-white/20 pointer-events-none flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 fill-current" />
              {manga.unreadCount} new
            </span>
          )}
          {typeof progressPercent === 'number' && progressPercent > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-[#9d86e9]/90 backdrop-blur-md text-white font-sans text-[10px] font-extrabold shadow-md border border-[#9d86e9]/40 pointer-events-none">
              {Math.round(progressPercent)}%
            </span>
          )}
        </div>

        {/* Kagane Bottom Poster Overlay Info */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-col gap-1.5 pointer-events-none z-10">
          {/* Title on Poster */}
          <h3 className="font-display font-bold text-xs sm:text-sm text-white line-clamp-2 leading-tight group-hover:text-[#9d86e9] transition-colors drop-shadow-md">
            {manga.title}
          </h3>

          {/* Chapter count & Provider pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold text-white/90">
            {(manga.chapterCount || manga.chapters?.length || manga.unreadCount || manga.status) ? (
              <span className="flex items-center gap-1 bg-[#120f23]/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 text-[10px] font-bold">
                <BookOpen className="w-3 h-3 text-[#9d86e9]" />
                {manga.chapterCount
                  ? `${manga.chapterCount} Ch`
                  : (manga.chapters?.length
                    ? `${manga.chapters.length} Ch`
                    : (manga.unreadCount ? `${manga.unreadCount} Ch` : manga.status))}
              </span>
            ) : null}
            <span className={`px-2 py-0.5 rounded-full text-[10px] truncate max-w-[110px] shadow-sm ${getSourceBadgeColor(manga.sourceName)}`}>
              {getSourceName(manga.sourceId, manga.sourceName)}
            </span>
          </div>
        </div>

        {/* Reading Progress Line */}
        {typeof progressPercent === 'number' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2b2746] z-10">
            <div
              className="h-full bg-[#9d86e9] shadow-[0_0_8px_rgba(157,134,233,0.8)]"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
});

