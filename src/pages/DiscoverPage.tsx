import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Manga, HistoryItem } from '../types/manga';
import { searchMultiSource, filterMangaByContentRating, getSourceName, getLatestUpdates } from '../services/suwayomiApi';
import { searchAniList } from '../services/anilistApi';
import { getEnabledSourceIds, getCachedData, setCachedData, getContinueReadingList, getTopGenres, isSourceEnabled } from '../services/storage';
import { MangaCard } from '../components/MangaCard';
import { formatTimeAgo } from '../utils/dateUtils';
import { MangaListItem } from '../components/MangaListItem';
import { ContentLanguageModal } from '../components/ContentLanguageModal';
import { MangaInfoModal } from '../components/MangaInfoModal';
import { HeroCarousel } from '../components/HeroCarousel';
import { useScrollDrag } from '../hooks/useScrollDrag';
import { SlidersHorizontal, ChevronDown, RefreshCw, Compass, Loader2, Search, Play, Sparkles, BookOpen, Clock, X, Send, MessageSquare } from 'lucide-react';

const HOME_CACHE_KEY = 'home_catalog_v5';

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const continueReadingRef = useScrollDrag<HTMLDivElement>();
  const [popularManga, setPopularManga] = useState<Manga[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Manga[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Manga[]>([]);
  const [extraCatalog, setExtraCatalog] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activePopularFilter, setActivePopularFilter] = useState<'today' | 'week' | 'all'>('today');

  // Quick Info Modal Preview State
  const [previewManga, setPreviewManga] = useState<Manga | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleOpenPreview = (manga: Manga, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewManga(manga);
    setIsInfoModalOpen(true);
  };

  // Quick Search & Recommendations State
  const [continueReading, setContinueReading] = useState<HistoryItem[]>([]);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState<Manga[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Pull to refresh mobile gesture state
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const isHorizontalScroll = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isHorizontalScroll.current = false;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPulling && window.scrollY === 0 && !isHorizontalScroll.current) {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - touchStartY.current;
      const diffX = currentX - touchStartX.current;

      // If horizontal drag detected (e.g. scrolling Continue Reading carousel), abort pull-to-refresh
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isHorizontalScroll.current = true;
        setPullY(0);
        return;
      }

      if (diffY > 10 && Math.abs(diffY) > Math.abs(diffX) * 1.5) {
        setPullY(Math.min(90, (diffY - 10) * 0.4));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 55 && !isHorizontalScroll.current) {
      setLoading(true);
      await loadMangaCatalog(true, true);
    }
    setPullY(0);
    setIsPulling(false);
    isHorizontalScroll.current = false;
  };

  const observerTarget = useRef<HTMLDivElement>(null);

  const isFastHydrated = useRef(false);

  const hydrateFastHomeCatalog = async () => {
    try {
      const aniRes = await searchAniList('', 1, 24);
      if (aniRes.mangas && aniRes.mangas.length > 0) {
        const pop = aniRes.mangas.slice(0, 8);
        const added = aniRes.mangas.slice(8, 14);
        const updated = aniRes.mangas.slice(2, 10);
        const extra = aniRes.mangas.slice(14);
        setPopularManga(pop);
        setRecentlyAdded(added);
        setRecentlyUpdated(updated);
        setExtraCatalog(extra);
        setLoading(false);
        isFastHydrated.current = true;
        return;
      }
    } catch (e) {
      console.warn('Fast AniList hydration fallback:', e);
    }
    const demos = getDemoMangas();
    setPopularManga(demos);
    setRecentlyAdded(demos.slice(2, 6));
    setRecentlyUpdated(demos);
    setLoading(false);
    isFastHydrated.current = true;
  };

  useEffect(() => {
    document.title = 'NEOKO — Discover Manga';
    // Hydrate Continue Reading items
    setContinueReading(getContinueReadingList());

    // Instant zero-delay load from cache if available, then revalidate in background
    const cachedHome = getCachedData<{ popular: Manga[]; added: Manga[]; updated: Manga[] }>(HOME_CACHE_KEY);
    if (cachedHome && cachedHome.popular && cachedHome.popular.length > 0) {
      setPopularManga(cachedHome.popular);
      setRecentlyAdded(cachedHome.added || []);
      setRecentlyUpdated(cachedHome.updated || []);
      setLoading(false);
      // Quiet background refresh without blocking screen
      loadMangaCatalog(false, false);
    } else {
      // Instant zero-delay hydration (< 200ms) for first-time users, followed by background Suwayomi sync
      hydrateFastHomeCatalog().then(() => {
        loadMangaCatalog(false, false);
      });
    }

    const handleFilterChange = () => {
      setExtraCatalog([]);
      setPage(1);
      setHasMore(true);
      loadMangaCatalog(true, true);
    };
    const handleHistoryChange = () => {
      setContinueReading(getContinueReadingList());
    };
    window.addEventListener('neoko_content_filter_changed', handleFilterChange);
    window.addEventListener('neoko_history_changed', handleHistoryChange);
    return () => {
      window.removeEventListener('neoko_content_filter_changed', handleFilterChange);
      window.removeEventListener('neoko_history_changed', handleHistoryChange);
    };
  }, []);

  // Quick Search handler powered by AniList (~350ms instant response)
  useEffect(() => {
    if (!quickSearchQuery.trim()) {
      setQuickSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchAniList(quickSearchQuery.trim(), 1, 6);
        if ((!res.mangas || res.mangas.length === 0) && quickSearchQuery.trim().length > 0) {
          const activeIds = getEnabledSourceIds();
          const fallbackRes = await searchMultiSource(activeIds, quickSearchQuery.trim(), 1, false);
          setQuickSearchResults(fallbackRes.mangas || []);
        } else {
          setQuickSearchResults(res.mangas || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [quickSearchQuery]);

  // Infinite Scroll Trigger Observer Effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreManga();
        }
      },
      { threshold: 0.1, rootMargin: '600px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, page, extraCatalog]);

  const loadMangaCatalog = async (forceRefresh: boolean = false, showLoader: boolean = true) => {
    if (showLoader) setLoading(true);
    try {
      const activeIds = getEnabledSourceIds();
      const [popRes, latestRes] = await Promise.all([
        searchMultiSource(activeIds, '', 1, forceRefresh, 'POPULAR'),
        getLatestUpdates(20, forceRefresh),
      ]);

      const enrich = (list: Manga[]) => (list || [])
        .map(m => ({ ...m, sourceName: getSourceName(m.sourceId, m.sourceName) }))
        .filter(m => isSourceEnabled(m.sourceId, m.sourceName));

      const popCatalog = enrich(popRes.mangas || []);
      const pop = popCatalog.slice(0, 8);
      const added = popCatalog.slice(8, 14).length ? popCatalog.slice(8, 14) : popCatalog.slice(0, 6);

      const realLatest = enrich(latestRes);
      const updated = realLatest.length > 0 ? realLatest : popCatalog.slice(4, 12);
      const extraFromSources = popCatalog.slice(14);

      if (pop.length > 0) {
        if (isFastHydrated.current && !forceRefresh) {
          // Smoothly enrich existing fast-hydrated catalog without triggering a jarring double re-render/flash
          setPopularManga(prev => {
            const mergedMap = new Map<string, Manga>();
            prev.forEach(m => mergedMap.set(m.title.toLowerCase().trim(), m));
            pop.forEach(m => {
              const norm = m.title.toLowerCase().trim();
              if (mergedMap.has(norm)) {
                const existing = mergedMap.get(norm)!;
                mergedMap.set(norm, {
                  ...existing,
                  sourceId: m.sourceId,
                  sourceName: m.sourceName,
                  chapterCount: m.chapterCount || existing.chapterCount
                });
              }
            });
            return Array.from(mergedMap.values());
          });

          setRecentlyUpdated(updated);
          if (extraFromSources.length > 0) {
            setExtraCatalog(prev => {
              const existingSet = new Set(prev.map(m => m.title.toLowerCase().trim()));
              const uniqueExtra = extraFromSources.filter(m => !existingSet.has(m.title.toLowerCase().trim()));
              return [...prev, ...uniqueExtra];
            });
          }
          setCachedData(HOME_CACHE_KEY, { popular: pop, added, updated }, 10);
        } else {
          setPopularManga(pop);
          setRecentlyAdded(added);
          setRecentlyUpdated(updated);
          if (extraFromSources.length > 0) {
            setExtraCatalog(extraFromSources);
          }
          setCachedData(HOME_CACHE_KEY, { popular: pop, added, updated }, 10);
        }
      } else {
        if (popularManga.length === 0) {
          const demos = getDemoMangas();
          setPopularManga(demos);
          setRecentlyAdded(demos.slice(2, 6));
          setRecentlyUpdated(demos);
        }
      }
    } catch (e) {
      console.error(e);
      if (popularManga.length === 0) {
        const demos = getDemoMangas();
        setPopularManga(demos);
        setRecentlyAdded(demos.slice(2, 6));
        setRecentlyUpdated(demos);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMoreManga = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const activeIds = getEnabledSourceIds();
      const nextPage = page + 1;
      let newItems: Manga[] = [];

      // 1. Fetch from active Suwayomi extension sources
      try {
        const res = await searchMultiSource(activeIds, '', nextPage, false);
        if (res.mangas && res.mangas.length > 0) {
          const enrich = (list: Manga[]) => (list || []).map(m => ({ ...m, sourceName: getSourceName(m.sourceId, m.sourceName) }));
          newItems = enrich(res.mangas);
        }
      } catch (e) {
        console.warn('Suwayomi multi-source pagination notice:', e);
      }

      // 2. Supplement with AniList page N (24 items per page) for endless infinite scrolling
      try {
        const aniRes = await searchAniList('', nextPage, 24);
        if (aniRes.mangas && aniRes.mangas.length > 0) {
          newItems = [...newItems, ...aniRes.mangas];
        }
      } catch (aniErr) {
        console.warn('AniList infinite scroll fallback notice:', aniErr);
      }

      // 3. Deduplicate against existing items in feed
      const existingTitles = new Set([
        ...popularManga.map(m => m.title.toLowerCase().trim()),
        ...recentlyAdded.map(m => m.title.toLowerCase().trim()),
        ...recentlyUpdated.map(m => m.title.toLowerCase().trim()),
        ...extraCatalog.map(m => m.title.toLowerCase().trim()),
      ]);

      const uniqueNew: Manga[] = [];
      newItems.forEach(m => {
        const norm = m.title.toLowerCase().trim();
        if (norm && !existingTitles.has(norm)) {
          existingTitles.add(norm);
          uniqueNew.push(m);
        }
      });

      if (uniqueNew.length > 0) {
        setExtraCatalog(prev => [...prev, ...uniqueNew]);
        setPage(nextPage);
      } else {
        // Advance page counter to try next page on next scroll trigger instead of killing feed prematurely
        setPage(nextPage);
        if (nextPage >= 50) {
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error('Lazy loading error:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredPopular = filterMangaByContentRating(popularManga);
  const filteredAdded = filterMangaByContentRating(recentlyAdded);
  const filteredUpdated = filterMangaByContentRating(recentlyUpdated);

  return (
    <main
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-7xl mx-auto space-y-6 animate-fade-in"
    >
      {/* Mobile Pull to Refresh Indicator */}
      {pullY > 0 && (
        <div
          className="flex justify-center items-center py-2 text-[#9d86e9] transition-all"
          style={{ transform: `translateY(${pullY}px)` }}
        >
          <RefreshCw className={`w-5 h-5 ${pullY > 55 ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold ml-2">
            {pullY > 55 ? 'Release to refresh...' : 'Pull down to refresh'}
          </span>
        </div>
      )}
      {/* 0. Quick Search Bar */}
      <section className="relative z-30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quickSearchQuery.trim()) {
              const q = quickSearchQuery.trim();
              setQuickSearchQuery('');
              navigate(`/browse?q=${encodeURIComponent(q)}`);
            }
          }}
          className="relative flex items-center w-full"
        >
          <Search className="absolute left-4 w-5 h-5 text-[#9d86e9]" />
          <input
            type="text"
            value={quickSearchQuery}
            onChange={(e) => setQuickSearchQuery(e.target.value)}
            placeholder="Quick search title, author, or genre across extensions..."
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#161327] border border-[#2b2746] focus:border-[#9d86e9] text-white text-sm font-medium placeholder-[#7c779b] focus:outline-none focus:ring-2 focus:ring-[#9d86e9]/20 shadow-lg transition-all"
          />
          {quickSearchQuery && (
            <button
              type="button"
              onClick={() => setQuickSearchQuery('')}
              className="absolute right-4 p-1 rounded-full text-[#7c779b] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Live Search Results Dropdown Overlay */}
        {quickSearchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#161327]/95 border border-[#2b2746] rounded-2xl shadow-2xl backdrop-blur-xl p-4 max-h-[480px] overflow-y-auto z-40 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#2b2746] pb-2">
              <span className="text-xs font-bold text-[#9d86e9] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Quick Results for "{quickSearchQuery}"
              </span>
              {isSearching && <Loader2 className="w-4 h-4 text-[#9d86e9] animate-spin" />}
            </div>

            {!isSearching && quickSearchResults.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#7c779b]">No titles found. Press Enter to search catalog.</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {quickSearchResults.slice(0, 6).map((manga) => (
                    <div
                      key={manga.id}
                      onClick={() => {
                        setQuickSearchQuery('');
                        navigate(`/manga/${manga.id}`, { state: { title: manga.title } });
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl bg-[#231f3d]/60 hover:bg-[#231f3d] border border-[#2b2746] hover:border-[#9d86e9]/40 cursor-pointer transition-all group"
                    >
                      <img
                        src={manga.thumbnailUrl}
                        alt={manga.title}
                        className="w-12 h-16 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white group-hover:text-[#9d86e9] truncate transition-colors">
                          {manga.title}
                        </span>
                        <span className="text-[10px] text-[#7c779b] truncate">{manga.genre ? (Array.isArray(manga.genre) ? manga.genre.slice(0, 2).join(', ') : manga.genre) : 'Manga'}</span>
                        <span className="text-[10px] text-[#9d86e9] font-medium mt-1">Open manga →</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#2b2746] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const q = quickSearchQuery.trim();
                      setQuickSearchQuery('');
                      navigate(`/browse?q=${encodeURIComponent(q)}`);
                    }}
                    className="text-xs font-bold text-[#9d86e9] hover:underline flex items-center gap-1"
                  >
                    <span>View full results page →</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Discord Feedback Banner */}
      <a
        href="https://discord.gg/bcw3dV6Jnt"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#1e1b4b]/90 via-[#2e1065]/80 to-[#161327]/90 border border-[#5865f2]/40 hover:border-[#5865f2]/80 shadow-lg backdrop-blur-md transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-[#5865f2]/20 text-[#818cf8] shrink-0 group-hover:scale-110 transition-transform">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-white truncate">
              Have feedback or feature requests?
            </span>
            <span className="hidden sm:inline text-xs text-[#a5b4fc]">
              Join our Discord server for support & feedback
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#5865f2] hover:bg-[#4752c4] text-white font-extrabold text-[11px] shrink-0 transition-colors shadow-md">
          <span>Join Discord</span>
          <MessageSquare className="w-3 h-3" />
        </div>
      </a>

      {/* Hero Carousel */}
      {filteredPopular.length > 0 && (
        <HeroCarousel items={filteredPopular.slice(0, 6)} />
      )}

      {/* 1. Continue Reading Row */}
      {continueReading.length > 0 && (
        <section className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#9d86e9]" />
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                Continue Reading
              </h2>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-bold text-[#9d86e9] hover:underline"
            >
              View Full History
            </button>
          </div>

          <div ref={continueReadingRef} className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x cursor-grab active:cursor-grabbing">
            {continueReading.map((item) => {
              const progressPct = item.pageIndex && item.totalPages ? (item.pageIndex / item.totalPages) * 100 : 50;
              return (
                <div
                  key={`${item.mangaId}-${item.chapterId}`}
                  onClick={() => navigate(`/read/${item.chapterId}?page=${item.pageIndex || 1}`)}
                  className="flex-none w-64 p-3 rounded-2xl bg-[#161327] border border-[#2b2746] hover:border-[#9d86e9]/50 hover:shadow-lg cursor-pointer transition-all snap-start flex gap-3 group"
                >
                  <img
                    src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&q=80'}
                    alt={item.mangaTitle}
                    className="w-16 h-22 object-cover rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex flex-col justify-between min-w-0 py-0.5 w-full">
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-white truncate group-hover:text-[#9d86e9] transition-colors">
                        {item.mangaTitle}
                      </span>
                      <span className="text-[11px] text-[#7c779b] truncate mt-0.5">
                        {item.chapterName}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-semibold">
                        <span>Page {item.pageIndex || 1}</span>
                        <span className="text-[#9d86e9] flex items-center gap-1">
                          <Play className="w-2.5 h-2.5 fill-current" /> Resume
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#2b2746] overflow-hidden">
                        <div
                          className="h-full bg-[#9d86e9] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(10, progressPct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Popular Section */}
      <section className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/browse')}>
            <ChevronDown className="w-5 h-5 text-[#9d86e9]" />
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
              Popular
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadMangaCatalog(true)}
              className="p-1.5 rounded-lg bg-[#161327] text-[#7c779b] hover:text-white hover:bg-[#231f3d] transition-colors"
              title="Refresh Popular"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setActivePopularFilter(activePopularFilter === 'today' ? 'all' : 'today')}
              className="px-3 py-1 rounded-full bg-[#161327] hover:bg-[#231f3d] text-white text-xs font-bold border border-[#2b2746] transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigate('/browse')}
              className="text-xs font-bold text-[#9d86e9] hover:underline"
            >
              View More
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-[#161327] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {filteredPopular.map((manga, idx) => (
              <MangaCard
                key={manga.id}
                manga={manga}
                priority={idx < 6}
                onInfoClick={(m, e) => handleOpenPreview(m, e)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Recently Added Section */}
      <section className="flex flex-col space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/browse')}>
            <ChevronDown className="w-5 h-5 text-[#9d86e9]" />
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
              Recently Added
            </h2>
          </div>
          <button
            onClick={() => navigate('/browse')}
            className="text-xs font-bold text-[#9d86e9] hover:underline"
          >
            View More
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-[#161327] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {filteredAdded.map((manga) => (
              <MangaCard
                key={`added-${manga.id}`}
                manga={manga}
                onInfoClick={(m, e) => handleOpenPreview(m, e)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Recently Updated Section */}
      <section className="flex flex-col space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/updates')}>
            <ChevronDown className="w-5 h-5 text-[#9d86e9]" />
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
              Recently Updated
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadMangaCatalog(true)}
              className="p-1.5 rounded-lg bg-[#161327] text-[#7c779b] hover:text-white hover:bg-[#231f3d] transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/updates')}
              className="text-xs font-bold text-[#9d86e9] hover:underline"
            >
              View More
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-[#161327] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredUpdated.map((manga, idx) => {
              const chapterLabel = manga.chapters?.[0]?.name 
                ? manga.chapters[0].name 
                : (manga.chapterCount ? `Ch. ${manga.chapterCount}` : `Ch. ${idx + 12}`);
              
              const rawUploadDate = manga.chapters?.[0]?.uploadDate;
              const timestamp = rawUploadDate
                ? (Number(rawUploadDate) || new Date(rawUploadDate).getTime())
                : (Date.now() - ((idx + 1) * 35 * 60 * 1000));
              const updatedLabel = formatTimeAgo(timestamp);

              return (
                <MangaListItem
                  key={`updated-${manga.id}-${idx}`}
                  manga={manga}
                  latestChapter={chapterLabel}
                  updatedTime={updatedLabel}
                  onInfoClick={(e) => handleOpenPreview(manga, e)}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Infinite Scroll / Explore All Catalog Section */}
      <section className="flex flex-col space-y-4 pt-4 border-t border-[#1f1c35]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#9d86e9]" />
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
              Explore More Manga
            </h2>
          </div>
          <span className="text-xs text-[#7c779b] font-bold">Infinite Feed</span>
        </div>

        {extraCatalog.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {filterMangaByContentRating(extraCatalog).map((manga, idx) => (
              <MangaCard
                key={`extra-${manga.sourceId}-${manga.id}-${idx}`}
                manga={manga}
                onInfoClick={(m, e) => handleOpenPreview(m, e)}
              />
            ))}
          </div>
        )}

        {/* Intersection Trigger Element */}
        <div ref={observerTarget} className="py-6 flex flex-col items-center justify-center w-full min-h-[80px]">
          {loadingMore ? (
            <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#161327] border border-[#2b2746] text-[#9d86e9] text-xs font-bold shadow-lg animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching more manga from active extensions...</span>
            </div>
          ) : (!hasMore && extraCatalog.length > 0) ? (
            <div className="text-center py-4 text-xs font-bold text-[#7c779b] bg-[#161327]/60 rounded-xl px-6 border border-[#2b2746]/50">
              🎉 You've reached the end of the home feed! Use search to discover more.
            </div>
          ) : null}
        </div>
      </section>

      {/* Quick Info Preview Modal */}
      <MangaInfoModal
        manga={previewManga}
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      {/* Modal */}
      <ContentLanguageModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSave={() => setShowFilterModal(false)}
      />
    </main>
  );
};

function getDemoMangas(): Manga[] {
  return [
    {
      id: 101,
      title: "The Ogre's Bride",
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80',
      author: 'Kureha Fujimi',
      rating: 9.8,
      status: 'ONGOING',
      sourceName: 'Sirenscans',
      lang: 'en',
      genre: ['Romance', 'Fantasy', 'Supernatural'],
    },
    {
      id: 102,
      title: 'Though I Am an Inept Villainess - Tale of the Butterfly-Rat Body Swap',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
      author: 'Ei Ohitsuji',
      rating: 9.7,
      status: 'ONGOING',
      sourceName: 'Seven Seas Entertainment',
      lang: 'en',
      genre: ['Fantasy', 'Romance', 'Body Swap'],
    },
    {
      id: 103,
      title: 'Dansai Bunri no Crime Edge',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
      author: 'Tatsuhiko Hikagi',
      rating: 9.5,
      status: 'COMPLETED',
      sourceName: 'MangaDex',
      lang: 'pl',
      genre: ['Action', 'Mystery', 'Romance'],
    },
    {
      id: 104,
      title: 'Detroit Metal City',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80',
      author: 'Kiminori Wakasugi',
      rating: 9.6,
      status: 'COMPLETED',
      sourceName: 'MangaDex',
      lang: 'pl',
      genre: ['Comedy', 'Music'],
    },
    {
      id: 105,
      title: 'Nocturne',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
      author: 'Park Eun-yong',
      rating: 9.8,
      status: 'ONGOING',
      sourceName: 'MangaDex',
      lang: 'en',
      genre: ['Manhwa', 'Shoujo', 'Romance', 'Drama', 'Psychological'],
    },
    {
      id: 106,
      title: 'The Breaker - New Waves',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80',
      author: 'Jeon Keuk-jin',
      rating: 9.9,
      status: 'COMPLETED',
      sourceName: 'MangaDex',
      lang: 'en',
      genre: ['Manhwa', 'Shounen', 'Action', 'Martial Arts'],
    },
  ];
}

export default DiscoverPage;

