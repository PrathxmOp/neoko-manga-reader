import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Manga, Chapter, BookmarkItem, Source } from '../types/manga';
import { getMangaDetails, updateMangaInLibrary, normalizeMangaStatus, cleanSynopsisText, autoBindTrackers, resolveMangaFromSourceByTitle, getSourceName, searchMultiSource, getImageUrl, getSources } from '../services/suwayomiApi';
import { fetchAniListRating, AniListMangaData } from '../services/anilistApi';
import { isBookmarked, saveBookmark, removeBookmark, getHistory, getBookmarkCategory, getReadChapters, markAllChaptersRead, markAllChaptersUnread, getMangaResumeTarget } from '../services/storage';
import { useToast } from '../contexts/ToastContext';
import { ChapterItem } from '../components/ChapterItem';
import { 
  ArrowLeft, Star, Play, BookmarkCheck, BookmarkPlus, 
  Search, ArrowUpDown, ChevronDown, ChevronUp, Loader2, RefreshCw, X, Check, FolderPlus, BookOpen, Clock, Heart,
  Share2, Layers, Grid, ChevronRight, Link, Zap, Radio, CheckCheck, EyeOff
} from 'lucide-react';
import { TrackerModal } from '../components/TrackerModal';

import { getComicType, getComicTypeColor } from '../utils/mangaType';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export const MangaDetailPage: React.FC = () => {
  const { mangaId } = useParams<{ mangaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { title?: string } | undefined;
  const { showToast } = useToast();

  const [manga, setManga] = useState<Manga | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResolvingChapters, setIsResolvingChapters] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<BookmarkItem['category'] | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);

  // Change Source modal state
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false);
  const [sourceSearchResults, setSourceSearchResults] = useState<Manga[]>([]);
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');

  useBodyScrollLock(showCategoryModal || showTrackerModal || showSourceModal);
  const [expandDesc, setExpandDesc] = useState(false);
  const [aniListData, setAniListData] = useState<AniListMangaData | null>(null);
  const [chapterSearch, setChapterSearch] = useState('');
  const [visibleChapterCount, setVisibleChapterCount] = useState(50);
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

  useEffect(() => {
    if (manga?.title) {
      document.title = `${manga.title} — NEOKO`;
    } else {
      document.title = 'Manga Details — NEOKO';
    }
  }, [manga?.title]);

  const loadManga = async (id: string, force: boolean = false) => {
    setLoading(true);
    try {
      let targetId = id;

      // Handle AniList item resolution to Suwayomi source manga
      if (String(id).startsWith('anilist-')) {
        const numericAniId = String(id).replace('anilist-', '');
        const passedTitle = locationState?.title || '';
        const titleCandidates: string[] = passedTitle ? [passedTitle] : [];

        let aniMedia: any = null;
        try {
          const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `query ($id: Int) { Media(id: $id, type: MANGA) { id title { english romaji userPreferred native } synonyms description coverImage { extraLarge large } bannerImage averageScore status genres } }`,
              variables: { id: parseInt(numericAniId, 10) }
            })
          });
          const json = await res.json();
          aniMedia = json?.data?.Media;
        } catch {}

        if (aniMedia) {
          if (aniMedia.title?.english) titleCandidates.push(aniMedia.title.english);
          if (aniMedia.title?.userPreferred) titleCandidates.push(aniMedia.title.userPreferred);
          if (aniMedia.title?.romaji) titleCandidates.push(aniMedia.title.romaji);
          if (aniMedia.synonyms && Array.isArray(aniMedia.synonyms)) {
            titleCandidates.push(...aniMedia.synonyms);
          }

          const primaryTitle = aniMedia.title?.english || aniMedia.title?.userPreferred || aniMedia.title?.romaji || passedTitle || 'Manga';
          const cleanDesc = aniMedia.description ? aniMedia.description.replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim() : '';

          // Instant preview manga object to render page IMMEDIATELY (0ms delay)
          const previewMangaObj: Manga = {
            id: `anilist-${numericAniId}`,
            title: primaryTitle,
            thumbnailUrl: aniMedia.coverImage?.extraLarge || aniMedia.coverImage?.large,
            description: cleanDesc,
            rating: aniMedia.averageScore ? Number((aniMedia.averageScore / 10).toFixed(1)) : undefined,
            status: aniMedia.status || 'ONGOING',
            sourceId: 'anilist',
            sourceName: 'AniList',
            genre: aniMedia.genres || [],
            chapters: [],
          };

          setManga(previewMangaObj);
          setLoading(false); // Instant render!
          setIsResolvingChapters(true);
          setResolutionStatus('Searching active reading extensions...');

          const resolvedSourceManga = await resolveMangaFromSourceByTitle(
            titleCandidates[0] || primaryTitle,
            titleCandidates.slice(1),
            (statusMsg) => setResolutionStatus(statusMsg)
          );

          if (resolvedSourceManga && resolvedSourceManga.id) {
            targetId = String(resolvedSourceManga.id);
            window.history.replaceState(null, '', `/manga/${targetId}`);

            const merged: Manga = {
              ...resolvedSourceManga,
              thumbnailUrl: resolvedSourceManga.thumbnailUrl || previewMangaObj.thumbnailUrl,
              rating: resolvedSourceManga.rating || previewMangaObj.rating,
            };

            setManga(merged);
            setReadChaptersSet(getReadChapters());

            const bookmarked = isBookmarked(merged.id);
            setInLibrary(merged.inLibrary || bookmarked);
            setCurrentCategory(getBookmarkCategory(merged.id));

            fetchAniListRating(merged.title).then(res => setAniListData(res));
            autoBindTrackers(merged.id, merged.title).catch(() => {});
            setIsResolvingChapters(false);
            return;
          } else {
            setIsResolvingChapters(false);
            showToast('No active source scraper has chapters for this title yet.', 'warning');
            return;
          }
        }
      }

      let data = await getMangaDetails(targetId, force);

      if (data) {
        setManga(data);
        setReadChaptersSet(getReadChapters());
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

      // Render page immediately so user is NEVER stuck on loading screen
      setLoading(false);

      // If chapters are missing, auto-trigger a fresh fetch from source in background
      if (data && (!data.chapters || data.chapters.length === 0)) {
        setIsResolvingChapters(true);
        setResolutionStatus('Fetching latest chapters from active reading extension...');
        try {
          const freshData = await getMangaDetails(targetId, true);
          if (freshData && freshData.chapters && freshData.chapters.length > 0) {
            setManga(freshData);
          }
        } catch (err) {
          console.warn('Background chapter fetch notice:', err);
        } finally {
          setIsResolvingChapters(false);
          setResolutionStatus(null);
        }
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  useEffect(() => {
    const updateHistory = () => {
      if (!manga) return;
      const history = getHistory();
      const found = history.find(h => String(h.mangaId) === String(manga.id));
      if (found) {
        setLastReadChapterId(found.chapterId);
        setLastReadPage(found.pageIndex || 1);
      }
    };

    window.addEventListener('neoko_history_changed', updateHistory);
    window.addEventListener('focus', updateHistory);
    return () => {
      window.removeEventListener('neoko_history_changed', updateHistory);
      window.removeEventListener('focus', updateHistory);
    };
  }, [manga]);

  const handleResumeClick = () => {
    if (!manga) return;
    const target = getMangaResumeTarget(manga.id, manga.chapters || []);
    if (target) {
      navigate(`/read/${target.chapterId}?page=${target.pageIndex}`);
    }
  };

  const executeSourceSearch = async (queryToSearch: string, forceRefresh: boolean = false) => {
    if (!queryToSearch.trim()) return;
    setSourceSearchLoading(true);
    try {
      const allSources = await getSources(false, true);
      const activeIds = allSources.map((s: Source) => s.id);
      
      let res = await searchMultiSource(activeIds, queryToSearch.trim(), 1, forceRefresh);
      
      // Fallback: If 0 results returned, try stripped punctuation/part title
      if ((!res.mangas || res.mangas.length === 0) && (queryToSearch.includes(':') || queryToSearch.includes('-'))) {
        const mainPart = queryToSearch.split(/[:\-]/)[0].trim();
        if (mainPart && mainPart.length > 2 && mainPart !== queryToSearch.trim()) {
          res = await searchMultiSource(activeIds, mainPart, 1, false);
        }
      }

      setSourceSearchResults(res.mangas || []);
    } catch (err) {
      console.error('Source search error:', err);
    } finally {
      setSourceSearchLoading(false);
    }
  };

  const handleOpenChangeSource = async () => {
    if (!manga) return;
    setShowSourceModal(true);
    const initialQuery = manga.title.replace(/[\(\[\{\\\/].*?[\)\]\}]/g, '').trim() || manga.title;
    setSourceSearchQuery(initialQuery);
    await executeSourceSearch(initialQuery);
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
        <h2 className="font-display font-extrabold text-xl text-[#0c0c14]">Manga Not Found</h2>
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
  const resumeTarget = getMangaResumeTarget(manga.id, chapters);
  const targetChapter = resumeTarget
    ? chapters.find(c => String(c.id) === String(resumeTarget.chapterId)) || firstChapter
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
            decoding="async"
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
                fetchPriority="high"
                decoding="async"
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
                {/* AniList / Rating Pill */}
                <div className="flex items-center gap-1.5 bg-[#231f3d] px-3 py-1 rounded-xl border border-white/10 shadow-sm">
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

                {/* AniList Score Link */}
                {aniListData?.siteUrl && (
                  <a
                    href={aniListData.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#02a9ff]/15 text-[#02a9ff] hover:bg-[#02a9ff]/25 border border-[#02a9ff]/30 text-[11px] font-bold transition-all"
                  >
                    <span>AniList Score</span>
                  </a>
                )}

                {/* Single Source Badge + Change Source Interactive Pill */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#1c1833] border border-[#2b2746] text-xs font-bold shadow-md">
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <Radio className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-white font-bold">{getSourceName(manga.sourceId, manga.sourceName)}</span>
                  </div>
                  <button
                    onClick={handleOpenChangeSource}
                    className="ml-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#9d86e9] to-[#7c5cdb] hover:from-[#b19cf5] text-black text-[11px] font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    title="Switch to another extension source"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change Source</span>
                  </button>
                </div>
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
                    onClick={() => navigate(`/browse?genre=${encodeURIComponent(g.trim())}`)}
                    className="bg-[#231f3d] px-3 py-1 rounded-full font-sans text-xs font-semibold text-slate-200 hover:bg-[#9d86e9]/20 hover:text-[#9d86e9] transition-colors cursor-pointer"
                  >
                    {g.trim()}
                  </span>
                ))}
              </div>

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-12 gap-3 mt-4">
                {targetChapter ? (
                  <button
                    onClick={handleResumeClick}
                    className="col-span-7 sm:col-span-6 bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] font-display font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#9d86e9]/25 transition-all active:scale-98 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {resumeTarget
                        ? (resumeTarget.pageIndex > 1
                            ? `Resume Ch. ${resumeTarget.chapterNumber ?? targetChapter.chapterNumber ?? ''} (P. ${resumeTarget.pageIndex})`
                            : `Read Ch. ${resumeTarget.chapterNumber ?? targetChapter.chapterNumber ?? ''}`)
                        : 'Read Ch. 1'}
                    </span>
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

              <button
                onClick={() => {
                  if (chapters.length === 0) return;
                  const ids = chapters.map(c => c.id);
                  const genresArr = Array.isArray(manga?.genre) ? manga.genre : (manga?.genre?.split(',') || []);
                  markAllChaptersRead(ids, genresArr);
                  setReadChaptersSet(getReadChapters());
                  showToast(`Marked ${ids.length} chapters as read`, 'success');
                }}
                className="px-3 py-2 rounded-xl bg-[#1c1833] hover:bg-[#231f3d] text-slate-300 font-sans text-xs font-bold flex items-center gap-1.5 border border-[#2b2746] transition-colors shrink-0 cursor-pointer"
                title="Mark all chapters as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Mark All Read</span>
              </button>

              <button
                onClick={() => {
                  if (chapters.length === 0) return;
                  const ids = chapters.map(c => c.id);
                  markAllChaptersUnread(ids);
                  setReadChaptersSet(getReadChapters());
                  showToast(`Marked ${ids.length} chapters as unread`, 'info');
                }}
                className="px-3 py-2 rounded-xl bg-[#1c1833] hover:bg-[#231f3d] text-slate-300 font-sans text-xs font-bold flex items-center gap-1.5 border border-[#2b2746] transition-colors shrink-0 cursor-pointer"
                title="Mark all chapters as unread"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Mark All Unread</span>
              </button>
            </div>
          </div>

          {/* Live Scraper Progress Card during AniList Resolution */}
          {isResolvingChapters ? (
            <div className="p-5 rounded-2xl bg-[#161327] border border-[#9d86e9]/40 shadow-xl flex items-center gap-4 animate-fade-in my-2">
              <div className="relative flex items-center justify-center shrink-0">
                <Loader2 className="w-7 h-7 text-[#9d86e9] animate-spin" />
                <Zap className="w-3.5 h-3.5 text-[#9d86e9] absolute" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-extrabold text-white tracking-wide">{resolutionStatus || 'Scraping active sources for chapters...'}</span>
                <span className="text-[11px] text-[#7c779b] font-medium mt-0.5">Searching MangaDex, Asura Scans, Flame Comics, ComicK & active extensions...</span>
              </div>
            </div>
          ) : filteredChapters.length === 0 ? (
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
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(chapterSearch.trim() ? filteredChapters : filteredChapters.slice(0, visibleChapterCount)).map(chapter => (
                  <ChapterItem key={chapter.id} chapter={chapter} />
                ))}
              </div>
              {!chapterSearch.trim() && visibleChapterCount < filteredChapters.length && (
                <button
                  onClick={() => setVisibleChapterCount(prev => prev + 50)}
                  className="w-full py-3 rounded-xl bg-[#1c1833] hover:bg-[#25213b] text-[#9d86e9] font-bold text-xs border border-[#2b2746] hover:border-[#9d86e9]/40 transition-all cursor-pointer shadow-md"
                >
                  Show More Chapters ({filteredChapters.length - visibleChapterCount} remaining)
                </button>
              )}
            </div>
          )}

        </section>
      </div>

      {/* Change Source Picker Modal */}
      {showSourceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setShowSourceModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#161327] border border-[#2b2746] rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#2b2746] flex items-center justify-between bg-[#120f23]">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#9d86e9]" />
                <h3 className="font-display font-bold text-base text-white">
                  Change Manga Source
                </h3>
              </div>
              <button
                onClick={() => setShowSourceModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#7c779b] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-[#2b2746] bg-[#141126]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSourceSearch(sourceSearchQuery, true);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#7c779b] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sourceSearchQuery}
                    onChange={(e) => setSourceSearchQuery(e.target.value)}
                    placeholder="Search title across extension sources..."
                    className="w-full pl-9 pr-3 py-2 bg-[#1c1833] border border-[#2b2746] focus:border-[#9d86e9] rounded-xl text-xs text-white placeholder-[#7c779b] outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sourceSearchLoading}
                  className="px-3.5 py-2 bg-[#9d86e9] hover:bg-[#b19cf5] disabled:opacity-50 text-black font-extrabold text-xs rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {sourceSearchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </form>
            </div>

            <div className="p-4 flex-1 min-h-0 overflow-y-auto space-y-3 scrollbar-thin">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#7c779b]">
                  Select an alternative extension source to read <strong className="text-white">{sourceSearchQuery.trim() || manga.title}</strong>:
                </p>
                {!sourceSearchLoading && sourceSearchResults.length > 0 && (
                  <span className="text-[11px] font-bold text-[#9d86e9] shrink-0 ml-2">
                    {sourceSearchResults.length} sources found
                  </span>
                )}
              </div>

              {sourceSearchLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#9d86e9]" />
                  <span className="text-xs font-semibold">Searching active extension sources...</span>
                </div>
              ) : sourceSearchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No alternative source results found. Try editing the search query above.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sourceSearchResults.map((item) => {
                    const isCurrent = String(item.id) === String(manga.id);
                    const thumbUrl = getImageUrl(item.thumbnailUrl) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80';
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!isCurrent) {
                            setShowSourceModal(false);
                            navigate(`/manga/${item.id}`);
                            showToast(`Switched source to ${item.sourceName}!`, 'success');
                          }
                        }}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3.5 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#9d86e9]/15 border-[#9d86e9] text-white shadow-lg shadow-[#9d86e9]/10'
                            : 'bg-[#1c1833] border-[#2b2746] hover:bg-[#231f3d] hover:border-[#9d86e9]/40 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={thumbUrl}
                            alt={item.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80';
                            }}
                            className="w-12 h-16 rounded-xl object-cover bg-[#0c0c14] border border-[#2b2746] shrink-0 shadow-md"
                          />
                          <div className="flex flex-col min-w-0 flex-1 justify-center space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs text-[#9d86e9]">{item.sourceName}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-[#9d86e9]/20 text-[#9d86e9] border border-[#9d86e9]/30">
                                {item.lang ? item.lang.toUpperCase() : 'EN'}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug break-words">
                              {item.title}
                            </h4>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="px-3 py-1.5 rounded-xl bg-[#9d86e9] text-black font-extrabold text-[10px] uppercase tracking-wider shrink-0 shadow-md">
                            Active
                          </span>
                        ) : (
                          <button className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#9d86e9] to-[#7c5cdb] hover:from-[#b19cf5] text-black font-extrabold text-xs shrink-0 cursor-pointer shadow-md active:scale-95">
                            Switch
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
