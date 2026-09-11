import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Manga } from '../types/manga';
import { Clock, Info } from 'lucide-react';
import { getSourceName, getImageUrl } from '../services/suwayomiApi';
import { getComicType, getComicTypeColor } from '../utils/mangaType';

interface MangaListItemProps {
  manga: Manga;
  latestChapter?: string;
  updatedTime?: string;
  onInfoClick?: (e: React.MouseEvent) => void;
}

export const MangaListItem: React.FC<MangaListItemProps> = React.memo(({
  manga,
  latestChapter,
  updatedTime,
  onInfoClick,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/manga/${manga.id}`);
  };

  const getSourceBadgeColor = (sourceName?: string) => {
    const s = (sourceName || manga.sourceName || '').toLowerCase();
    if (s.includes('mangadex')) return 'bg-[#ea580c] text-white';
    if (s.includes('inkr')) return 'bg-[#eab308] text-black font-bold';
    if (s.includes('seven seas')) return 'bg-white text-black font-bold';
    if (s.includes('sg')) return 'bg-[#2563eb] text-white';
    return 'bg-[#9d86e9] text-black font-bold';
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

  const genresString = Array.isArray(manga.genre) 
    ? manga.genre.slice(0, 4).join(' · ') 
    : manga.genre || 'Manga';

  return (
    <div
      onClick={handleClick}
      className="group relative flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-[#161327] hover:bg-[#1f1b36] border border-[#2b2746] hover:border-[#9d86e9]/40 cursor-pointer transition-all duration-200 shadow-sm"
    >
      {/* Cover Image Thumbnail */}
      <div className="relative w-14 h-20 sm:w-16 sm:h-22 rounded-xl overflow-hidden shrink-0 bg-[#0c0c14] border border-[#2b2746]">
        <img
          src={getImageUrl(manga.thumbnailUrl) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80'}
          alt={manga.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80';
          }}
        />
      </div>

      {/* Content Details */}
      <div className="flex flex-col justify-between flex-1 min-w-0 min-h-[5rem] py-0.5 gap-1.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display font-bold text-sm sm:text-base text-white truncate group-hover:text-[#9d86e9] transition-colors leading-snug">
              {manga.title}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onInfoClick) onInfoClick(e);
                else navigate(`/manga/${manga.id}`);
              }}
              className="text-[#7c779b] hover:text-white p-1 rounded-full hover:bg-[#2b2746] transition-colors shrink-0"
              title="Manga Details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-[#7c779b] truncate font-sans">
            {genresString}
          </p>
        </div>

        {/* Bottom Metadata Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-[#9e9ab8] mt-auto pt-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#9e9ab8] min-w-0 truncate">
            <Clock className="w-3.5 h-3.5 text-[#9d86e9] shrink-0" />
            <span className="truncate">{latestChapter || (manga.chapters?.[0]?.name ? manga.chapters[0].name : 'Ch. 1')}</span>
            {updatedTime && <span className="shrink-0 text-[#7c779b]">· {updatedTime}</span>}
          </span>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${getComicTypeColor(getComicType(manga))}`}>
              {getComicType(manga)}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-[#25213b] text-[10px] font-bold text-white border border-[#3b365d]">
              {getLangFlag(manga.lang)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] truncate max-w-[100px] ${getSourceBadgeColor(manga.sourceName)}`}>
              {getSourceName(manga.sourceId, manga.sourceName)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

