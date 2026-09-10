import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Manga, Chapter, BookmarkItem } from '../types/manga';
import { getMangaDetails, updateMangaInLibrary, normalizeMangaStatus, cleanSynopsisText, autoBindTrackers } from '../services/suwayomiApi';
import { fetchAniListRating, AniListMangaData } from '../services/anilistApi';
import { isBookmarked, saveBookmark, removeBookmark, getHistory, getBookmarkCategory, getReadChapters } from '../services/storage';
import { useToast } from '../contexts/ToastContext';
import { ChapterItem } from '../components/ChapterItem';
import { 
  ArrowLeft, Star, Play, BookmarkCheck, BookmarkPlus, 
  Search, ArrowUpDown, ChevronDown, ChevronUp, Loader2, RefreshCw, X, Check, FolderPlus, BookOpen, Clock, Heart,
  Share2, Layers, Grid, ChevronRight, Link
} from 'lucide-react';
import { TrackerModal } from '../components/TrackerModal';

import { getComicType, getComicTypeColor } from '../utils/mangaType';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export const MangaDetailPage: React.FC = () => {
  const { mangaId } = useParams<{ mangaId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [manga, setManga] = useState<Manga | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<BookmarkItem['category'] | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  useBodyScrollLock(showCategoryModal || showTrackerModal);
  const [expandDesc, setExpandDesc] = useState(false);
  const [aniListData, setAniListData] = useState<AniListMangaData | null>(null);
  const [chapterSearch, setChapterSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewByVolume, setViewByVolume] = useState(false);
  const [collapsedVolumes, setCollapsedVolumes] = useState<Record<string, boolean>>({});
  const [lastReadChapterId, setLastReadChapterId] = useState<string | number | null>(null);
  const [lastReadPage, setLastReadPage] = useState<number>(1);
  const [readChaptersSet, setReadChaptersSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (mangaId) {
      loadManga(mangaId);
    }
  }, [mangaId]);

  const loadManga = async (id: string, force: boolean = false) => {
    setLoading(true);
    try {
      let data = await getMangaDetails(id, force);

      // If chapters are missing, auto-trigger a fresh fetch from source
      if (!data || !data.chapters || data.chapters.length === 0) {
        data = await getMangaDetails(id, true);
      }

      setManga(data);
      setReadChaptersSet(getReadChapters());

      if (data) {
        const bookmarked = isBookmarked(data.id);
        setInLibrary(data.inLibrary || bookmarked);
        setCurrentCategory(getBookmarkCategory(data.id));

        const history = getHistory();
        const found = history.find(h => String(h.mangaId) === String(data.id));
        if (found) {
          setLastReadChapterId(found.chapterId);
          setLastReadPage(found.pageIndex || 1);
        }

        // Fetch real AniList rating & auto-bind trackers asynchronously
        fetchAniListRating(data.title).then(res => setAniListData(res));
        autoBindTrackers(data.id, data.title).catch(err => console.error('Auto bind error:', err));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshChapters = async () => {
    if (!mangaId) return;
    setRefreshing(true);
    try {
      const updated = await getMangaDetails(mangaId, true);
      setManga(updated);
      setReadChaptersSet(getReadChapters());
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSelectCategory = async (cat: BookmarkItem['category'] | 'Remove') => {
    if (!manga) return;
    setShowCategoryModal(false);

    if (cat === 'Remove') {
      removeBookmark(manga.id);
      setInLibrary(false);
      setCurrentCategory(null);
      showToast('Removed from Library', 'info');
      try {
        await updateMangaInLibrary(manga.id, false);
      } catch (e) {
        console.error(e);
      }
    } else {
      saveBookmark(manga, cat);
      setInLibrary(true);
      setCurrentCategory(cat);
      showToast(`Saved to "${cat}" library!`, 'success');
      try {
        await updateMangaInLibrary(manga.id, true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleShare = async () => {
    if (!manga) return;
    const shareData = {
      title: manga.title,
      text: `Read ${manga.title} on NEOKO Manga Reader!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Shared successfully!', 'success');
      } catch (e) {
        // user cancelled or share failed
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Manga link copied to clipboard!', 'success');
    }
  };

  const toggleVolumeCollapse = (volKey: string) => {
    setCollapsedVolumes(prev => ({ ...prev, [volKey]: !prev[volKey] }));
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-16">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#9d86e9]" />
          <span className="font-sans text-sm font-semibold">Loading Manga Details...</span>
        </div>
      </main>
    );
  }

  if (!manga) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h2 className="font-display font-extrabold text-xl text-white">Manga Not Found</h2>
        <p className="font-sans text-xs text-slate-400">Unable to load details for this manga from the API.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-bold text-xs"
        >
          Go Back
        </button>
      </main>
    );
  }

  const chapters = manga.chapters || [];
  const sortedAscending = [...chapters].sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  const firstChapter = sortedAscending.length > 0 ? sortedAscending[0] : null;
  const targetChapter = lastReadChapterId 
    ? chapters.find(c => String(c.id) === String(lastReadChapterId)) || firstChapter 
    : firstChapter;

  const filteredChapters = chapters
    .filter(c => c.name.toLowerCase().includes(chapterSearch.toLowerCase()))
    .sort((a, b) => {
      const numA = a.chapterNumber ?? 0;
      const numB = b.chapterNumber ?? 0;
      return sortAsc ? numA - numB : numB - numA;
    });

  // Calculate read chapters count for overall progress bar
  const readCount = chapters.filter(c => c.isRead || readChaptersSet.has(String(c.id))).length;
  const totalCount = chapters.length;
  const progressPercent = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;

  // Smart Volume Extraction & Grouping using AniList Metadata
  const getVolumeNumber = (ch: Chapter): number | 'ungrouped' => {
    if (ch.volumeNumber !== undefined && ch.volumeNumber !== null && ch.volumeNumber > 0) {
      return ch.volumeNumber;
    }
    const name = ch.name || '';
    // Matches patterns: Vol.1, Vol 1, Volume 1, v1, v01, [Vol 1], [v1]
    const match = name.match(/(?:vol(?:ume|\.)?|v)\s*(\d+)/i) || 
                  name.match(/\[(?:vol(?:ume|\.)?|v)?\s*(\d+)\]/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Fallback using AniList volumes data (e.g., Attack on Titan 139 ch / 34 vols = ~4 chapters per volume)
    if (ch.chapterNumber !== undefined && ch.chapterNumber !== null && ch.chapterNumber > 0) {
      const aniListVols = aniListData?.volumes;
      const totalCh = chapters.length;
      if (aniListVols && aniListVols > 0 && totalCh > 0) {
        const chPerVol = Math.max(1, Math.ceil(totalCh / aniListVols));
        return Math.min(aniListVols, Math.floor((ch.chapterNumber - 1) / chPerVol) + 1);
      }
      return Math.floor((ch.chapterNumber - 1) / 10) + 1;
    }
    return 'ungrouped';
  };

  const groupChaptersByVolume = (chapterList: Chapter[]) => {
    const groups: Map<number | 'ungrouped', Chapter[]> = new Map();

    chapterList.forEach(ch => {
      const volKey = getVolumeNumber(ch);
      if (!groups.has(volKey)) {
        groups.set(volKey, []);
      }
      groups.get(volKey)!.push(ch);
    });

    return Array.from(groups.entries()).sort(([keyA], [keyB]) => {
      if (keyA === 'ungrouped') return 1;
      if (keyB === 'ungrouped') return -1;
      return sortAsc ? Number(keyA) - Number(keyB) : Number(keyB) - Number(keyA);
    });
  };

  const genres = Array.isArray(manga.genre) ? manga.genre : (manga.genre?.split(',') || ['Action', 'Fantasy']);
  const synopsisInfo = cleanSynopsisText(manga.description);
  const cleanDesc = synopsisInfo.cleanText || manga.description;
  const sourceRating = synopsisInfo.sourceRating;

  return (
    <main className="flex flex-col relative w-full pt-16 pb-28 bg-[#0c0c14] min-h-screen">
      {/* Immersive Atmospheric Hero Header */}
      <div className="relative w-full overflow-hidden bg-[#120f23] border-b border-[#2b2746]/40">
        {/* Ambient Blur Backdrop */}
        <div className="absolute inset-0 h-96 overflow-hidden pointer-events-none opacity-30 mix-blend-screen">
          <img
            src={manga.thumbnailUrl}
            alt={manga.title}
            className="w-full h-full object-cover scale-110 blur-2xl transform"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c14]/30 via-[#0c0c14]/80 to-[#0c0c14]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-6 flex flex-col gap-4 z-10">
          {/* Back button header & Share */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-[#1c1833]/80 backdrop-blur-md text-white hover:text-[#9d86e9] flex items-center justify-center transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-[#1c1833]/80 backdrop-blur-md text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-[#2b2746]"
              title="Share Manga"
            >
              <Share2 className="w-4 h-4 text-[#9d86e9]" />
            </button>
          </div>

          {/* Poster & Main Profile */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
            {/* Cover Poster Art */}
            <div className="relative shrink-0 w-36 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-[#161327] border border-[#2b2746]">
              <img
                src={manga.thumbnailUrl}
                alt={manga.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14]/80 via-transparent to-transparent" />
            </div>

            {/* Title & Metadata */}
            <div className="flex flex-col min-w-0 justify-between gap-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#9d86e9]/15 text-[#9d86e9] font-sans text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#9d86e9]/20">
                  {normalizeMangaStatus(manga.status, aniListData?.status)}
                </span>
                <span className={`font-sans text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getComicTypeColor(getComicType(manga))}`}>
                  {getComicType(manga)}
                </span>
              </div>

              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
                {manga.title}
              </h1>

              {manga.author && (
                <p className="font-sans text-xs text-slate-300 font-medium">
                  {manga.author} {manga.artist ? `• ${manga.artist}` : ''}
                </p>
              )}

              {/* Rating & Stats */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1.5 bg-[#231f3d] px-3 py-1 rounded-lg border border-white/5">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span className="font-sans text-xs font-bold text-white">
                    {aniListData?.averageScore 
                      ? aniListData.averageScore.toFixed(1)
                      : (sourceRating ? sourceRating.toFixed(1) : (manga.rating ? manga.rating.toFixed(1) : 'N/A'))}
                  </span>
                  {aniListData?.popularity ? (
                    <span className="font-sans text-[10px] text-slate-400">
                      ({(aniListData.popularity / 1000).toFixed(1)}k readers)
                    </span>
                  ) : null}
                </div>

                {aniListData?.siteUrl && (
                  <a
                    href={aniListData.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#02a9ff]/15 text-[#02a9ff] hover:bg-[#02a9ff]/25 border border-[#02a9ff]/30 text-[11px] font-bold transition-all"
                  >
                    <span>AniList Score</span>
                  </a>
                )}

                {sourceRating && aniListData?.averageScore && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#9d86e9]/15 text-[#9d86e9] border border-[#9d86e9]/30 text-[11px] font-bold">
                    <span>Source Score: {sourceRating}</span>
                  </span>
                )}
              </div>

              {/* Reading Progress Bar */}
              {totalCount > 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#161327] border border-[#2b2746] space-y-1.5 max-w-md">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Reading Progress</span>
                    <span className="text-[#9d86e9]">{readCount} / {totalCount} Ch ({progressPercent}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#231f3d] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#9d86e9] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(157,134,233,0.6)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Genre Pills */}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {genres.map(g => (
                  <span
                    key={g}
                    className="bg-[#231f3d] px-3 py-1 rounded-full font-sans text-xs font-semibold text-slate-200 hover:bg-[#2b2746] transition-colors cursor-pointer"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-12 gap-3 mt-4">
                {targetChapter ? (
                  <button
                    onClick={() => navigate(`/read/${targetChapter.id}?page=${lastReadPage}`)}
                    className="col-span-7 sm:col-span-6 bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] font-display font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#9d86e9]/25 transition-all active:scale-98 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{lastReadChapterId ? 'Resume Ch.' : 'Read Ch. 1'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRefreshChapters}
                    disabled={refreshing}
                    className="col-span-7 sm:col-span-6 bg-[#231f3d] hover:bg-[#2b2746] text-[#9d86e9] font-sans font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-[#9d86e9]/20 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Fetch Chapters</span>
                  </button>
                )}

                <button
                  onClick={() => setShowCategoryModal(true)}
                  className={`col-span-5 sm:col-span-3 py-3 px-3 rounded-xl flex items-center justify-center gap-1.5 font-display font-bold text-xs transition-all duration-300 transform hover:scale-[1.02] active:scale-95 border cursor-pointer ${
                    inLibrary
                      ? 'bg-gradient-to-r from-[#9d86e9] via-[#8b6ae9] to-[#7c5ce9] text-white border-[#bba7f5]/40 shadow-[0_0_24px_rgba(157,134,233,0.45)]'
                      : 'bg-[#1c1833]/90 hover:bg-[#252042] text-slate-200 border-[#2b2746] hover:border-[#9d86e9]/50 shadow-lg'
                  }`}
                >
                  {inLibrary ? (
                    <BookmarkCheck className="w-4 h-4 text-white shrink-0" />
                  ) : (
                    <BookmarkPlus className="w-4 h-4 text-[#9d86e9] shrink-0" />
                  )}
                  <span className="truncate">
                    {inLibrary ? (currentCategory ? `In: ${currentCategory}` : 'In Library') : 'Add to Library'}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-80 shrink-0" />
                </button>

                {/* Trackers Button */}
                <button
                  onClick={() => setShowTrackerModal(true)}
                  className="col-span-12 sm:col-span-3 py-3 px-3 rounded-xl bg-[#1c1833]/90 hover:bg-[#252042] text-slate-200 border border-[#2b2746] hover:border-[#9d86e9]/50 flex items-center justify-center gap-1.5 font-display font-bold text-xs cursor-pointer transition-all shadow-lg shrink-0"
                  title="Trackers & Progress Sync"
                >
                  <Link className="w-4 h-4 text-[#9d86e9] shrink-0" />
                  <span>Trackers</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full space-y-6 pt-4">
        {/* Synopsis / Description Card */}
        {manga.description && (
          <section className="bg-[#161327] p-4 sm:p-5 rounded-2xl border border-[#2b2746] space-y-2">
            <h3 className="font-display font-bold text-sm text-white">Synopsis</h3>
            <p className={`font-sans text-xs sm:text-sm text-slate-300 leading-relaxed ${
              expandDesc ? '' : 'line-clamp-3'
            }`}>
              {cleanDesc}
            </p>
            <button
              onClick={() => setExpandDesc(!expandDesc)}
              className="text-xs font-bold text-[#9d86e9] flex items-center gap-1 mt-1 hover:underline cursor-pointer"
            >
              <span>{expandDesc ? 'Show Less' : 'Read More'}</span>
              {expandDesc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </section>
        )}

        {/* Chapters Section Header */}
        <section className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-xl text-white tracking-tight">
                Chapters
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#231f3d] text-[#9d86e9] font-bold text-xs">
                {chapters.length}
              </span>
            </div>

            {/* Chapter Search, View Mode & Sort Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:w-64 flex items-center bg-[#1c1833] rounded-xl px-3 py-2 border border-[#2b2746]">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={chapterSearch}
                  onChange={(e) => setChapterSearch(e.target.value)}
                  placeholder="Search chapter..."
                  className="w-full bg-transparent text-white font-sans text-xs placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="px-3.5 py-2 rounded-xl bg-[#1c1833] hover:bg-[#231f3d] text-slate-300 font-sans text-xs font-bold flex items-center gap-1.5 border border-[#2b2746] transition-colors shrink-0 cursor-pointer"
                title="Sort Order"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#9d86e9]" />
                <span>{sortAsc ? 'Oldest' : 'Newest'}</span>
              </button>
            </div>
          </div>

          {/* Chapter Items Display */}
          {filteredChapters.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 font-sans text-xs bg-[#161327] rounded-2xl border border-[#2b2746] space-y-3">
              <p>No chapters indexed yet for this title.</p>
              <button
                onClick={handleRefreshChapters}
                disabled={refreshing}
                className="px-4 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-bold flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Fetch Chapters from Source</span>
              </button>
            </div>
          ) : (
            /* Clean Flat List View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredChapters.map(chapter => (
                <ChapterItem key={chapter.id} chapter={chapter} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Category Picker Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#161327] border border-[#2b2746] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#2b2746] flex items-center justify-between bg-[#120f23]">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#9d86e9]" />
                <h3 className="font-display font-bold text-base text-white">
                  Select Library Category
                </h3>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#7c779b] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
              {[
                { id: 'Reading', label: 'Reading', desc: 'Currently reading chapters', icon: BookOpen, color: 'text-indigo-400' },
                { id: 'Plan to Read', label: 'Plan to Read', desc: 'Saved for future reading', icon: Clock, color: 'text-amber-400' },
                { id: 'Completed', label: 'Completed', desc: 'Finished all chapters', icon: Check, color: 'text-emerald-400' },
                { id: 'Favorite', label: 'Favorite', desc: 'Starred top favorite manga', icon: Heart, color: 'text-rose-400' },
              ].map((cat) => {
                const Icon = cat.icon;
                const isSelected = currentCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id as any)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#25213b] border-[#9d86e9] text-white'
                        : 'bg-[#1c1833] border-[#2b2746] hover:bg-[#231f3d] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-white">{cat.label}</span>
                        <span className="text-[10px] text-[#7c779b]">{cat.desc}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#9d86e9]" />}
                  </button>
                );
              })}

              {inLibrary && (
                <button
                  onClick={() => handleSelectCategory('Remove')}
                  className="w-full p-3 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Remove from Library</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tracker Sync Modal */}
      {showTrackerModal && manga && (
        <TrackerModal manga={manga} onClose={() => setShowTrackerModal(false)} />
      )}
    </main>
  );
};

export default MangaDetailPage;
