import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Manga, BookmarkItem } from '../types/manga';
import { isBookmarked, getBookmarkCategory, saveBookmark, removeBookmark } from '../services/storage';
import { getMangaDetails, getSourceName, getImageUrl, normalizeMangaStatus, cleanSynopsisText } from '../services/suwayomiApi';
import { fetchAniListRating, AniListMangaData } from '../services/anilistApi';
import { getComicType, getComicTypeColor } from '../utils/mangaType';
import { X, Play, BookmarkCheck, BookmarkPlus, ExternalLink, Star, BookOpen, Clock, Loader2, Info, ChevronDown } from 'lucide-react';

interface MangaInfoModalProps {
  manga: Manga | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MangaInfoModal: React.FC<MangaInfoModalProps> = ({ manga, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BookmarkItem['category']>('Plan to Read');
  const [details, setDetails] = useState<Manga | null>(null);
  const [loading, setLoading] = useState(false);
  const [aniListData, setAniListData] = useState<AniListMangaData | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#161327] border border-[#2b2746] rounded-3xl shadow-2xl overflow-hidden z-10 animate-scale-up max-h-[90vh] flex flex-col">
        {/* Banner Artwork & Close Button */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-[#0c0c14] shrink-0">
          <img
            src={getImageUrl(currentManga.thumbnailUrl) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80'}
            alt={currentManga.title}
            className="w-full h-full object-cover blur-sm scale-110 opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#161327] via-[#161327]/60 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-full bg-[#120f23]/80 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Manga Header Overlay Content */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3.5 z-10">
            {/* Poster Image */}
            <div className="relative w-20 h-28 sm:w-24 sm:h-34 rounded-xl overflow-hidden shadow-xl border-2 border-[#2b2746] bg-[#0c0c14] shrink-0">
              <img
                src={getImageUrl(currentManga.thumbnailUrl) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80'}
                alt={currentManga.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Titles & Badges */}
            <div className="flex flex-col justify-end min-w-0 pb-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-md bg-[#9d86e9]/20 text-[#9d86e9] text-[10px] font-extrabold border border-[#9d86e9]/30 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  {ratingVal}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${getComicTypeColor(getComicType(currentManga))}`}>
                  {getComicType(currentManga)}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#2b2746] text-white/90 text-[10px] font-bold">
                  {normalizeMangaStatus(currentManga.status)}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#2563eb]/30 text-blue-300 text-[10px] font-bold border border-blue-400/20 truncate max-w-[110px]">
                  {getSourceName(currentManga.sourceId, currentManga.sourceName)}
                </span>
              </div>

              <h2 className="font-display font-extrabold text-base sm:text-xl text-white line-clamp-2 leading-tight drop-shadow-md">
                {currentManga.title}
              </h2>
              {currentManga.author && (
                <p className="text-xs text-[#7c779b] truncate font-medium mt-0.5">
                  By {currentManga.author}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-[#2b2746]">
          {/* Genre Tags */}
          {genres.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {genres.slice(0, 6).map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-1 rounded-lg bg-[#231f3d] text-[#cbbcf6] text-xs font-semibold border border-[#37315a]"
                >
                  {g.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Info Details Row (Chapters count, language, etc.) */}
          <div className="grid grid-cols-2 gap-2 bg-[#120f23]/60 p-3 rounded-2xl border border-[#2b2746]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <BookOpen className="w-4 h-4 text-[#9d86e9]" />
              <span>
                {currentManga.chapters?.length
                  ? `${currentManga.chapters.length} Chapters Available`
                  : (currentManga.chapterCount ? `${currentManga.chapterCount} Chapters` : 'Chapters Available')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 justify-end">
              <Clock className="w-4 h-4 text-[#9d86e9]" />
              <span>{currentManga.lang ? currentManga.lang.toUpperCase() : 'EN'}</span>
            </div>
          </div>

          {/* Description / Synopsis */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-extrabold uppercase text-[#7c779b] tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#9d86e9]" />
              Synopsis
            </h3>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-[#7c779b] py-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#9d86e9]" />
                Loading description...
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-300/90 font-sans leading-relaxed line-clamp-4 bg-[#120f23]/30 p-3 rounded-2xl border border-[#2b2746]/50">
                {cleanSynopsisText(currentManga.description).cleanText
                  ? cleanSynopsisText(currentManga.description).cleanText.replace(/<[^>]*>?/gm, '')
                  : 'No detailed synopsis available for this title. Tap "View Full Details" to explore chapters and updates.'}
              </p>
            )}
          </div>
        </div>

        {/* Action Footer Buttons */}
        <div className="p-4 bg-[#120f23] border-t border-[#2b2746] flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            onClick={handleReadNow}
            className="w-full sm:flex-1 h-11 px-4 rounded-2xl bg-gradient-to-r from-[#9d86e9] to-[#7c5cdb] hover:from-[#b19cf5] hover:to-[#8c6de6] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#9d86e9]/20 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Read Now</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Library Category Switcher Dropdown Button */}
            <div className="relative flex-1 sm:flex-initial flex items-center">
              <button
                onClick={handleToggleBookmark}
                className={`h-11 px-3 sm:px-4 rounded-l-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 border-y border-l transition-all active:scale-[0.98] ${
                  isSaved
                    ? 'bg-[#9d86e9]/20 border-[#9d86e9] text-[#9d86e9]'
                    : 'bg-[#231f3d] border-[#2b2746] text-white hover:bg-[#2e2a4f]'
                }`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-[#9d86e9]" />
                    <span className="truncate">{selectedCategory}</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>+ {selectedCategory}</span>
                  </>
                )}
              </button>

              <select
                value={selectedCategory}
                onChange={(e) => handleCategorySelectChange(e.target.value as BookmarkItem['category'])}
                className={`h-11 px-2 rounded-r-2xl text-xs font-bold border-y border-r outline-none cursor-pointer transition-colors ${
                  isSaved
                    ? 'bg-[#9d86e9]/30 border-[#9d86e9] text-[#9d86e9]'
                    : 'bg-[#231f3d] border-[#2b2746] text-slate-300 hover:bg-[#2e2a4f]'
                }`}
                title="Change Library Category"
              >
                <option value="Plan to Read" className="bg-[#161327] text-white">📌 Plan to Read</option>
                <option value="Reading" className="bg-[#161327] text-white">📖 Reading</option>
                <option value="Favorite" className="bg-[#161327] text-white">⭐ Favorite</option>
                <option value="Completed" className="bg-[#161327] text-white">✅ Completed</option>
              </select>
            </div>

            <button
              onClick={handleViewDetails}
              className="h-11 px-4 rounded-2xl bg-[#231f3d] hover:bg-[#2e2a4f] text-white border border-[#2b2746] font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              title="View Full Manga Page"
            >
              <span className="hidden sm:inline">Details</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
