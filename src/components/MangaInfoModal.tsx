import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Manga, BookmarkItem } from '../types/manga';
import { isBookmarked, getBookmarkCategory, saveBookmark, removeBookmark } from '../services/storage';
import { getMangaDetails, getSourceName, getImageUrl, normalizeMangaStatus, cleanSynopsisText } from '../services/suwayomiApi';
import { fetchAniListRating, AniListMangaData } from '../services/anilistApi';
import { getComicType, getComicTypeColor } from '../utils/mangaType';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';
import { X, Play, BookmarkCheck, BookmarkPlus, ExternalLink, Star, BookOpen, Clock, Loader2, Globe, ChevronRight } from 'lucide-react';

interface MangaInfoModalProps {
  manga: Manga | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MangaInfoModal: React.FC<MangaInfoModalProps> = ({ manga, isOpen, onClose }) => {
  const navigate = useNavigate();
  useBodyScrollLock(isOpen);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BookmarkItem['category']>('Plan to Read');
  const [details, setDetails] = useState<Manga | null>(null);
  const [loading, setLoading] = useState(false);
  const [aniListData, setAniListData] = useState<AniListMangaData | null>(null);

  const { ref: dismissRef, offsetY, isDragging } = useSwipeDismiss<HTMLDivElement>({
    onDismiss: onClose,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!manga || !isOpen) return;

    setDetails(manga);
    fetchAniListRating(manga.title).then(res => setAniListData(res));

    const saved = isBookmarked(manga.id);
    setIsSaved(saved);
    if (saved) {
      const cat = getBookmarkCategory(manga.id);
      setSelectedCategory(cat || 'Plan to Read');
    } else {
      setSelectedCategory('Plan to Read');
    }

    // If chapters or detailed description missing, auto fetch details silently
    if (!manga.description || !manga.chapters || manga.chapters.length === 0) {
      setLoading(true);
      getMangaDetails(manga.id)
        .then((res) => {
          if (res) {
            setDetails(res);
          }
        })
        .catch((err) => console.error('Failed to load popup details:', err))
        .finally(() => setLoading(false));
    }
  }, [manga, isOpen]);

  if (!isOpen || !manga) return null;

  const currentManga = details || manga;

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      removeBookmark(currentManga.id);
      setIsSaved(false);
    } else {
      saveBookmark(currentManga, selectedCategory);
      setIsSaved(true);
    }
  };

  const handleCategorySelectChange = (newCat: BookmarkItem['category']) => {
    setSelectedCategory(newCat);
    saveBookmark(currentManga, newCat);
    setIsSaved(true);
  };

  const handleReadNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    if (currentManga.chapters && currentManga.chapters.length > 0) {
      const sorted = [...currentManga.chapters].sort((a, b) => {
        const numA = parseFloat(String(a.chapterNumber || '0'));
        const numB = parseFloat(String(b.chapterNumber || '0'));
        return numA - numB;
      });
      const firstCh = sorted[0] || currentManga.chapters[0];
      navigate(`/read/${firstCh.id}`);
    } else {
      navigate(`/manga/${currentManga.id}`);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    navigate(`/manga/${currentManga.id}`);
  };

  const genres = Array.isArray(currentManga.genre)
    ? currentManga.genre
    : (currentManga.genre?.split(',') || []);

  const ratingVal = aniListData?.averageScore 
    ? aniListData.averageScore.toFixed(1) 
    : (currentManga.rating ? currentManga.rating.toFixed(1) : 'N/A');

  const comicType = getComicType(currentManga);
  const statusStr = normalizeMangaStatus(currentManga.status);
  const chapterCountStr = currentManga.chapters?.length
    ? `${currentManga.chapters.length} ch`
    : (currentManga.chapterCount ? `${currentManga.chapterCount} ch` : 'Chapters available');

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[64px] sm:pb-0 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container Sheet */}
      <div 
        ref={dismissRef}
        style={{
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : 'none',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative w-full max-w-lg bg-[#141126] border-t sm:border border-[#2b2746] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-slide-up sm:animate-scale-up max-h-[78vh] sm:max-h-[85vh] my-0 sm:my-auto touch-pan-y"
      >
        
        {/* Drag handle pill at top center */}
        <div className="w-12 h-1.5 rounded-full bg-[#2b2746] active:bg-primary/70 mx-auto mt-2.5 shrink-0 cursor-grab active:cursor-grabbing" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-3 right-3 p-1.5 rounded-full bg-[#231f3d] hover:bg-[#2b2746] text-[#7c779b] hover:text-white border border-[#2b2746] transition-colors z-20 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Card (Poster Image + Info Metadata) */}
        <div className="flex items-start gap-3.5 p-4 pb-3 shrink-0">
          {/* Poster Image */}
          <div className="relative w-20 h-28 sm:w-24 sm:h-34 rounded-2xl overflow-hidden shadow-xl border border-[#2b2746] bg-[#0c0c14] shrink-0">
            <img
              src={getImageUrl(currentManga.thumbnailUrl) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80'}
              alt={currentManga.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Quick Titles & Badges */}
          <div className="flex flex-col justify-start min-w-0 flex-1 pr-6 space-y-2">
            <h2 className="font-display font-extrabold text-sm sm:text-lg text-white line-clamp-2 leading-tight">
              {currentManga.title}
            </h2>

            {/* Badges Row (Ongoing, Manhwa, etc.) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#2563eb]/20 text-[#60a5fa] text-[11px] font-extrabold border border-[#2563eb]/30">
                {statusStr}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase ${getComicTypeColor(comicType)}`}>
                {comicType}
              </span>
              {ratingVal !== 'N/A' && (
                <span className="px-2.5 py-0.5 rounded-lg bg-[#9d86e9]/20 text-[#9d86e9] text-[11px] font-extrabold border border-[#9d86e9]/30 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {ratingVal}
                </span>
              )}
            </div>

            {/* Details Stats Row */}
            <div className="flex items-center gap-3 text-xs font-bold text-[#a5a3c2] flex-wrap">
              <div className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#9d86e9]" />
                <span>{chapterCountStr}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#9d86e9]" />
                <span>{currentManga.lang ? currentManga.lang.toUpperCase() : 'Korean'}</span>
              </div>
            </div>

            {currentManga.author && (
              <p className="text-[11px] text-[#7c779b] truncate font-medium">
                By {currentManga.author}
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#2b2746]/60 w-full shrink-0" />

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-[#2b2746]">
          {/* Synopsis Description */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-[#7c779b] py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#9d86e9]" />
              Loading description...
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              {cleanSynopsisText(currentManga.description).cleanText
                ? cleanSynopsisText(currentManga.description).cleanText.replace(/<[^>]*>?/gm, '')
                : 'No detailed synopsis available for this title.'}
            </p>
          )}

          {/* Divider */}
          <div className="h-px bg-[#2b2746]/40 w-full" />

          {/* Genre Tags (Pills matching screenshot) */}
          {genres.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {genres.map((g) => (
                <span
                  key={g}
                  className="px-3 py-1 rounded-xl bg-[#1c1833] text-[#cbbcf6] text-xs font-semibold border border-[#2b2746] hover:bg-[#231f3d] transition-colors"
                >
                  {g.trim()}
                </span>
              ))}
            </div>
          )}

          {/* External Source Links */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#7c779b] pt-1">
            <span className="font-bold text-[11px] uppercase tracking-wider text-[#7c779b]">Source:</span>
            <span className="px-2 py-0.5 rounded-md bg-[#1c1833] text-blue-400 font-semibold border border-[#2b2746] flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              {getSourceName(currentManga.sourceId, currentManga.sourceName)}
            </span>
          </div>
        </div>

        {/* Action Footer Buttons — Pinned strictly at bottom above BottomDock */}
        <div className="p-3.5 sm:p-4 bg-[#0f0c1d] border-t border-[#2b2746] flex flex-col gap-2.5 shrink-0 z-20 shadow-2xl">
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              onClick={handleReadNow}
              className="h-11 px-4 rounded-2xl bg-gradient-to-r from-[#9d86e9] to-[#7c5cdb] hover:from-[#b19cf5] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#9d86e9]/20 active:scale-[0.98] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Read Now</span>
            </button>

            <button
              onClick={handleViewDetails}
              className="h-11 px-4 rounded-2xl bg-[#1c1833] hover:bg-[#252044] text-white border border-[#2b2746] font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] cursor-pointer"
            >
              <span>Full Details</span>
              <ChevronRight className="w-4 h-4 text-[#9d86e9]" />
            </button>
          </div>

          <div className="flex items-center w-full">
            <button
              onClick={handleToggleBookmark}
              className={`flex-1 h-10 px-3.5 rounded-l-2xl text-xs font-extrabold flex items-center justify-center gap-2 border-y border-l transition-all cursor-pointer truncate ${
                isSaved
                  ? 'bg-[#9d86e9]/20 border-[#9d86e9] text-[#9d86e9]'
                  : 'bg-[#1c1833] border-[#2b2746] text-white hover:bg-[#252044]'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#9d86e9] shrink-0" />
                  <span className="truncate">{selectedCategory}</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4 text-[#9d86e9] shrink-0" />
                  <span className="truncate">+ Add to Library</span>
                </>
              )}
            </button>

            <select
              value={selectedCategory}
              onChange={(e) => handleCategorySelectChange(e.target.value as BookmarkItem['category'])}
              className={`h-10 px-2.5 rounded-r-2xl text-xs font-bold border-y border-r outline-none cursor-pointer ${
                isSaved
                  ? 'bg-[#9d86e9]/30 border-[#9d86e9] text-[#9d86e9]'
                  : 'bg-[#1c1833] border-[#2b2746] text-slate-300 hover:bg-[#252044]'
              }`}
            >
              <option value="Plan to Read" className="bg-[#141126] text-white">📌 Plan to Read</option>
              <option value="Reading" className="bg-[#141126] text-white">📖 Reading</option>
              <option value="Favorite" className="bg-[#141126] text-white">⭐ Favorite</option>
              <option value="Completed" className="bg-[#141126] text-white">✅ Completed</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
