import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Manga } from '../types/manga';
import { searchMultiSource, getSources, filterMangaByContentRating } from '../services/suwayomiApi';
import { searchAniList } from '../services/anilistApi';
import { getEnabledSourceIds, isSourceEnabled, getRecentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } from '../services/storage';
import { useToast } from '../contexts/ToastContext';
import { MangaCard } from '../components/MangaCard';
import { MangaListItem } from '../components/MangaListItem';
import { formatTimeAgo } from '../utils/dateUtils';
import { MangaInfoModal } from '../components/MangaInfoModal';
import { Search, SlidersHorizontal, Bookmark, Dices, List, LayoutGrid, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Shuffle, Sparkles, Zap, Globe, Loader2 } from 'lucide-react';

export const SearchBrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const { showToast } = useToast();
  const [query, setQuery] = useState(urlQuery);
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);

  // Search Engine Provider: 'anilist' (instant ~150ms) vs 'suwayomi' (direct scraper)
  const [searchEngine, setSearchEngine] = useState<'anilist' | 'suwayomi'>('anilist');

  // Quick Info Preview State
  const [previewManga, setPreviewManga] = useState<Manga | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleOpenPreview = (manga: Manga, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewManga(manga);
    setIsInfoModalOpen(true);
  };

  // Search Controls State
  const [searchMode, setSearchMode] = useState<'fuzzy' | 'exact'>('fuzzy');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState('Relevance');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [availableSources, setAvailableSources] = useState<{ id: string; name: string }[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());

  useEffect(() => {
    const genreParam = searchParams.get('genre');
    const qParam = searchParams.get('q');
    if (qParam) {
      document.title = `Search: "${qParam}" — NEOKO`;
    } else if (genreParam) {
      document.title = `Genre: ${genreParam} — NEOKO`;
    } else {
      document.title = 'Browse Manga — NEOKO';
    }
  }, [searchParams]);

  useEffect(() => {
    loadAndSearch(urlQuery, 1);

    getSources(true, true).then(sources => {
      if (sources && sources.length > 0) {
        const listToUse = sources.filter(s => isSourceEnabled(s.id, s.name));

        const seenNames = new Set<string>();
        const unique: { id: string; name: string }[] = [];

        listToUse.forEach(s => {
          if (!seenNames.has(s.name)) {
            seenNames.add(s.name);
            unique.push({ id: s.id, name: s.name });
          }
        });

        setAvailableSources(unique);
      }
    }).catch(() => {});

    const handleFilterChange = () => {
      loadAndSearch(query, 1);
    };
    window.addEventListener('neoko_content_filter_changed', handleFilterChange);
    return () => window.removeEventListener('neoko_content_filter_changed', handleFilterChange);
  }, []);

  // Instant real-time live search typing & source selection handler
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAndSearch(query, 1, false);
    }, searchEngine === 'anilist' ? 150 : 300);
    return () => clearTimeout(timer);
  }, [query, selectedSourceId, searchEngine]);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadAndSearch = async (
    searchQuery: string = query,
    page: number = 1,
    forceRefresh: boolean = false,
    sourceIdOverride?: string,
    engineOverride?: 'anilist' | 'suwayomi',
    append: boolean = false
  ) => {
    const activeEngine = engineOverride !== undefined ? engineOverride : searchEngine;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setCurrentPage(page);
    try {
      let newMangas: Manga[] = [];
      if (activeEngine === 'anilist') {
        const res = await searchAniList(searchQuery, page, 24);
        if ((!res.mangas || res.mangas.length === 0) && searchQuery.trim().length > 0 && page === 1) {
          const targetSourceIds = getEnabledSourceIds(availableSources.map(s => s.id));
          const fallbackRes = await searchMultiSource(targetSourceIds, searchQuery, page, forceRefresh);
          newMangas = fallbackRes.mangas || [];
        } else {
          newMangas = res.mangas || [];
        }
      } else {
        const activeSource = sourceIdOverride !== undefined ? sourceIdOverride : selectedSourceId;
        let targetSourceIds: string[] = [];
        if (activeSource !== 'all') {
          targetSourceIds = [activeSource];
        } else {
          targetSourceIds = getEnabledSourceIds(availableSources.map(s => s.id));
        }

        const res = await searchMultiSource(targetSourceIds, searchQuery, page, forceRefresh);
        newMangas = res.mangas || [];
      }

      if (newMangas.length === 0) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (append) {
        setMangaList(prev => {
          const existingIds = new Set(prev.map(m => String(m.id)));
          const filteredNew = newMangas.filter(m => !existingIds.has(String(m.id)));
          return [...prev, ...filteredNew];
        });
      } else {
        setMangaList(newMangas);
        if (page > 1) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (e) {
      console.error(e);
      if (!append) setMangaList([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadNextPage = () => {
    if (loading || loadingMore || !hasMore) return;
    loadAndSearch(query, currentPage + 1, false, undefined, undefined, true);
  };

  // Infinite Scroll Trigger Observer Effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && mangaList.length > 0) {
          loadNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
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
  }, [hasMore, loadingMore, loading, currentPage, mangaList.length, query, searchEngine, selectedSourceId]);

  const handleRandomManga = () => {
    const list = filterMangaByContentRating(mangaList);
    if (list.length > 0) {
      const randomIdx = Math.floor(Math.random() * list.length);
      const chosen = list[randomIdx];
      showToast(`Opening random title: "${chosen.title}"`, 'info');
      navigate(`/manga/${chosen.id}`, { state: { title: chosen.title } });
    } else {
      const randomPage = Math.floor(Math.random() * 5) + 1;
      showToast(`Loading random catalog page ${randomPage}`, 'info');
      loadAndSearch(query, randomPage, true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const updated = addRecentSearch(query.trim());
      setRecentSearches(updated);
      loadAndSearch(query, 1, true);
    }
  };

  // Content rating filter
  let displayList = filterMangaByContentRating(mangaList);

  // Search filter (fuzzy vs exact)
  if (query.trim()) {
    const qLower = query.toLowerCase().trim();
    if (searchMode === 'exact') {
      displayList = displayList.filter(m => m.title.toLowerCase().includes(qLower));
    }
  }

  // Sorting
  displayList = [...displayList].sort((a, b) => {
    if (sortOption === 'Latest') {
      return (b.unreadCount || 0) - (a.unreadCount || 0);
    }
    if (sortOption === 'Popularity') {
      return (b.inLibrary ? 1 : 0) - (a.inLibrary ? 1 : 0);
    }
    if (sortOption === 'Alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return 0; // Relevance default
  });

  const filteredMangaList = displayList;

  const getPageStrip = () => {
    const start = Math.max(1, currentPage - 1);
    return [start, start + 1, start + 2, start + 3, start + 4];
  };

  return (
    <main className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-7xl mx-auto space-y-4 animate-fade-in">
      {/* 1. Header Search Bar & Source Filter */}
      <section className="bg-[#161327] rounded-2xl border border-[#2b2746] p-4 shadow-xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#1c1833] rounded-xl px-4 py-3 border border-[#2b2746] focus-within:border-[#9d86e9] transition-all">
            <Search className="w-5 h-5 text-[#7c779b] mr-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, authors, genres across all sources..."
              className="w-full bg-transparent text-white text-sm placeholder-[#7c779b] focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  loadAndSearch('', 1, false);
                }}
                className="text-[#7c779b] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-bold text-xs hover:bg-[#b09cf5] transition-all shadow-md shrink-0 flex items-center gap-2"
          >
            <span>Search</span>
          </button>
        </form>

        {/* Recent Searches Chips */}
        {recentSearches.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#2b2746]/60 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
              <span className="text-[10px] font-bold text-[#7c779b] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#9d86e9]" /> Recent:
              </span>
              {recentSearches.slice(0, 8).map(term => (
                <div
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    loadAndSearch(term, 1, true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1833] hover:bg-[#282348] text-slate-200 border border-[#2b2746] hover:border-[#9d86e9]/50 text-[11px] font-medium shrink-0 transition-all cursor-pointer group shadow-sm"
                >
                  <Search className="w-3 h-3 text-[#9d86e9] group-hover:scale-110 transition-transform" />
                  <span>{term}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = removeRecentSearch(term);
                      setRecentSearches(updated);
                    }}
                    className="ml-0.5 p-0.5 rounded-full text-[#7c779b] hover:text-white hover:bg-white/10 transition-colors"
                    title="Remove item"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                clearRecentSearches();
                setRecentSearches([]);
              }}
              className="text-[10px] font-bold text-[#7c779b] hover:text-rose-400 shrink-0 ml-1 underline transition-colors"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Search Engine Mode Selector */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2b2746]/60">
          <div className="flex items-center gap-1 bg-[#1c1833] p-1 rounded-xl border border-[#2b2746]">
            <button
              type="button"
              onClick={() => {
                if (searchEngine !== 'anilist') {
                  setSearchEngine('anilist');
                  loadAndSearch(query, 1, false, undefined, 'anilist');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                searchEngine === 'anilist'
                  ? 'bg-[#9d86e9] text-[#0c0c14] shadow-sm'
                  : 'text-[#7c779b] hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>AniList</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (searchEngine !== 'suwayomi') {
                  setSearchEngine('suwayomi');
                  loadAndSearch(query, 1, false, undefined, 'suwayomi');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                searchEngine === 'suwayomi'
                  ? 'bg-[#9d86e9] text-[#0c0c14] shadow-md'
                  : 'text-[#7c779b] hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Direct</span>
            </button>
          </div>

          <span className="text-[10px] text-[#7c779b] font-medium">
            {searchEngine === 'anilist'
              ? '⚡ Ultra-fast search (~150ms)'
              : '🌐 Live source scraping'}
          </span>
        </div>

        {/* Source Selector Bar (shown when Direct Scraping is selected) */}
        {searchEngine === 'suwayomi' && (
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar py-1 animate-fade-in">
            <span className="text-xs text-[#7c779b] font-bold shrink-0">Source:</span>
            {[
              { id: 'all', name: 'All Sources' },
              ...availableSources
            ].map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => {
                  if (selectedSourceId !== src.id) {
                    setSelectedSourceId(src.id);
                    setMangaList([]);
                    loadAndSearch(query, 1, true, src.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedSourceId === src.id
                    ? 'bg-[#9d86e9] text-[#0c0c14] shadow-sm'
                    : 'bg-[#161327] text-[#9e9ab8] hover:text-white border border-[#2b2746]'
                }`}
              >
                {src.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 2. Controls Row (Sort, Fuzzy/Exact, View Mode, Dice, Results Count) */}
      <section className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1f1c35]">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-[#161327] text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-[#2b2746] focus:outline-none cursor-pointer"
          >
            <option value="Relevance">Relevance</option>
            <option value="Latest">Latest Chapter</option>
            <option value="Popularity">Most Popular</option>
            <option value="Alphabetical">Title (A-Z)</option>
          </select>

          {/* Fuzzy / Exact Segmented Toggle */}
          <div className="flex items-center bg-[#161327] p-1 rounded-xl border border-[#2b2746]">
            <button
              onClick={() => setSearchMode('fuzzy')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                searchMode === 'fuzzy'
                  ? 'bg-[#9d86e9] text-[#0c0c14]'
                  : 'text-[#7c779b] hover:text-white'
              }`}
            >
              Fuzzy
            </button>
            <button
              onClick={() => setSearchMode('exact')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                searchMode === 'exact'
                  ? 'bg-[#9d86e9] text-[#0c0c14]'
                  : 'text-[#7c779b] hover:text-white'
              }`}
            >
              Exact
            </button>
          </div>

          {/* View Mode Toggle: List vs Grid */}
          <div className="flex items-center bg-[#161327] p-1 rounded-xl border border-[#2b2746]">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-[#9d86e9] text-[#0c0c14]'
                  : 'text-[#7c779b] hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#9d86e9] text-[#0c0c14]'
                  : 'text-[#7c779b] hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Random Dice Button */}
          <button
            onClick={handleRandomManga}
            className="px-3 py-1.5 rounded-xl bg-[#161327] hover:bg-[#231f3d] text-[#9d86e9] border border-[#2b2746] hover:border-[#9d86e9]/50 transition-all flex items-center gap-1.5 font-bold text-xs"
            title="Open Random Manga"
          >
            <Dices className="w-4 h-4 text-[#9d86e9]" />
            <span>Random</span>
          </button>
        </div>

        <span className="text-xs text-[#7c779b] font-medium ml-auto">
          {filteredMangaList.length ? `Page ${currentPage} • ${filteredMangaList.length} items` : '0 items'}
        </span>
      </section>

      {/* 4. Results List / Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#161327] animate-pulse" />
          ))}
        </div>
      ) : filteredMangaList.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 bg-[#161327] rounded-2xl border border-[#2b2746]">
          <Search className="w-12 h-12 text-[#7c779b]" />
          <p className="font-sans text-base font-semibold text-white">No titles found</p>
          <p className="font-sans text-xs text-[#7c779b]">Try searching for another title or keyword.</p>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="flex flex-col gap-3">
              {filteredMangaList.map((manga, idx) => {
                const rawUploadDate = manga.chapters?.[0]?.uploadDate;
                const timestamp = rawUploadDate
                  ? (Number(rawUploadDate) || new Date(rawUploadDate).getTime())
                  : (Date.now() - ((idx + 1) * 2 * 3600 * 1000));
                return (
                  <MangaListItem
                    key={`${manga.sourceId}-${manga.id}-${idx}`}
                    manga={manga}
                    latestChapter={manga.chapters?.[0]?.name || (idx === 0 ? 'Ch. 2' : idx === 1 ? 'Ch. 41' : 'Vol. 3')}
                    updatedTime={formatTimeAgo(timestamp)}
                    onInfoClick={(e) => handleOpenPreview(manga, e)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {filteredMangaList.map((manga) => (
                <MangaCard
                  key={`${manga.sourceId}-${manga.id}`}
                  manga={manga}
                  onInfoClick={(m, e) => handleOpenPreview(m, e)}
                />
              ))}
            </div>
          )}

          {/* Lazy Loading Spinner & Sentinel Target */}
          <div ref={observerTarget} className="py-6 flex items-center justify-center min-h-[60px]">
            {loadingMore ? (
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#161327] border border-[#2b2746] text-xs font-semibold text-[#9d86e9]">
                <Loader2 className="w-4 h-4 animate-spin text-[#9d86e9]" />
                <span>Loading more titles...</span>
              </div>
            ) : hasMore ? (
              <span className="text-[11px] text-[#7c779b]">Scroll for more titles</span>
            ) : (
              <span className="text-[11px] text-[#7c779b]">End of results</span>
            )}
          </div>
        </>
      )}

      {/* Quick Info Modal */}
      <MangaInfoModal
        manga={previewManga}
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />
    </main>
  );
};

function getDemoSearchResults(): Manga[] {
  return [
    {
      id: 201,
      title: 'Carnal Tales: Banahaw',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80',
      author: 'Bandit Elenaga-Amago',
      rating: 9.2,
      status: 'ONGOING',
      sourceName: 'INKR Comics',
      lang: 'en',
      genre: ['Other'],
    },
    {
      id: 202,
      title: 'Carthago',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
      author: 'Christophe Bec',
      rating: 9.4,
      status: 'COMPLETED',
      sourceName: 'INKR Comics',
      lang: 'en',
      genre: ['Other', 'Sci-Fi'],
    },
    {
      id: 203,
      title: 'Cells at Work! White Brigade',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&q=80',
      author: 'Kanna Kuramochi',
      rating: 9.8,
      status: 'ONGOING',
      sourceName: 'INKR Comics',
      lang: 'en',
      genre: ['Manga', 'Shounen', 'Fantasy', 'Action', 'Comedy'],
    },
  ];
}

export default SearchBrowsePage;

