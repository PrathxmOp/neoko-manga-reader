import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Manga } from '../types/manga';
import { searchMultiSource, getSources, filterMangaByContentRating } from '../services/suwayomiApi';
import { getEnabledSourceIds, isSourceEnabled, getRecentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } from '../services/storage';
import { useToast } from '../contexts/ToastContext';
import { MangaCard } from '../components/MangaCard';
import { MangaListItem } from '../components/MangaListItem';
import { MangaInfoModal } from '../components/MangaInfoModal';
import { Search, SlidersHorizontal, Bookmark, Dices, List, LayoutGrid, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Shuffle } from 'lucide-react';

export const SearchBrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);

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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortOption, setSortOption] = useState('Relevance');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [availableSources, setAvailableSources] = useState<{ id: string; name: string }[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());

  useEffect(() => {
    loadAndSearch('', 1);

    getSources().then(sources => {
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

  // Instant real-time live search typing handler (no need to press search or enter!)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAndSearch(query, 1, false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadAndSearch = async (
    searchQuery: string = query,
    page: number = 1,
    forceRefresh: boolean = false,
    sourceIdOverride?: string
  ) => {
    setLoading(true);
    setCurrentPage(page);
    try {
      let targetSourceIds = getEnabledSourceIds();
      const activeSource = sourceIdOverride !== undefined ? sourceIdOverride : selectedSourceId;
      if (activeSource !== 'all') {
        targetSourceIds = [activeSource];
      }

      const res = await searchMultiSource(targetSourceIds, searchQuery, page, forceRefresh);
      setMangaList(res.mangas || []);
      if (page > 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error(e);
      setMangaList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomManga = () => {
    const list = filterMangaByContentRating(mangaList);
    if (list.length > 0) {
      const randomIdx = Math.floor(Math.random() * list.length);
      const chosen = list[randomIdx];
      showToast(`Opening random title: "${chosen.title}"`, 'info');
      navigate(`/manga/${chosen.id}`);
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
    }
    loadAndSearch(query.trim(), 1, false);
  };

  const getPageStrip = () => {
    const start = Math.max(1, currentPage - 1);
    return [start, start + 1, start + 2, start + 3, start + 4];
  };

  const filteredMangaList = filterMangaByContentRating(mangaList);

  return (
    <main className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-7xl mx-auto space-y-4 animate-fade-in">
      {/* 1. Search Header Input */}
      <section className="w-full">
        <form onSubmit={handleSearchSubmit} className="w-full flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-[#161327] rounded-xl px-4 py-3 border border-[#2b2746] focus-within:border-[#9d86e9] transition-all">
            <Search className="w-4 h-4 text-[#7c779b] mr-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or select source..."
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
            className="w-12 h-11 rounded-xl bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] flex items-center justify-center font-bold shadow-md transition-all active:scale-95 shrink-0"
            title="Submit Search"
          >
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Recent Searches Chips */}
        {recentSearches.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#2b2746]/60 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
              <span className="text-[10px] font-bold text-[#7c779b] uppercase tracking-wider shrink-0 mr-1">Recent:</span>
              {recentSearches.map(term => (
                <div
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    loadAndSearch(term, 1, false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1c1833] hover:bg-[#282348] text-slate-200 border border-[#2b2746] text-[11px] font-medium shrink-0 transition-all cursor-pointer group"
                >
                  <Search className="w-3 h-3 text-[#9d86e9]" />
                  <span>{term}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = removeRecentSearch(term);
                      setRecentSearches(updated);
                    }}
                    className="ml-1 text-[#7c779b] hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                clearRecentSearches();
                setRecentSearches([]);
              }}
              className="text-[10px] font-bold text-[#7c779b] hover:text-rose-400 shrink-0 ml-1 underline"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Source Selector Bar */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs text-[#7c779b] font-bold shrink-0">Source:</span>
          {[
            { id: 'all', name: 'All Sources' },
            ...availableSources
          ].map((src) => (
            <button
              key={src.id}
              type="button"
              onClick={() => {
                setSelectedSourceId(src.id);
                loadAndSearch(query, 1, false, src.id);
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

      {/* 3. Real Pagination Bar */}
      <section className="flex items-center justify-center gap-1.5 py-2">
        <button
          onClick={() => loadAndSearch(query, 1, false)}
          disabled={currentPage === 1 || loading}
          className="p-2 rounded-xl bg-[#161327] text-[#7c779b] hover:text-white disabled:opacity-40 border border-[#2b2746] transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => loadAndSearch(query, Math.max(1, currentPage - 1), false)}
          disabled={currentPage === 1 || loading}
          className="p-2 rounded-xl bg-[#161327] text-[#7c779b] hover:text-white disabled:opacity-40 border border-[#2b2746] transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageStrip().map((pNum) => (
          <button
            key={pNum}
            onClick={() => loadAndSearch(query, pNum, false)}
            disabled={loading}
            className={`w-9 h-9 rounded-xl font-bold text-xs transition-all ${
              currentPage === pNum
                ? 'bg-[#9d86e9] text-[#0c0c14] shadow-md scale-105'
                : 'bg-[#161327] text-white hover:bg-[#231f3d] border border-[#2b2746]'
            }`}
          >
            {pNum}
          </button>
        ))}

        <button
          onClick={() => loadAndSearch(query, currentPage + 1, false)}
          disabled={loading}
          className="p-2 rounded-xl bg-[#161327] text-[#7c779b] hover:text-white disabled:opacity-40 border border-[#2b2746] transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => loadAndSearch(query, currentPage + 5, false)}
          disabled={loading}
          className="p-2 rounded-xl bg-[#161327] text-[#7c779b] hover:text-white disabled:opacity-40 border border-[#2b2746] transition-colors"
          title="Jump +5 Pages"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
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
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-3">
          {filteredMangaList.map((manga, idx) => (
            <MangaListItem
              key={`${manga.sourceId}-${manga.id}-${idx}`}
              manga={manga}
              latestChapter={idx === 0 ? 'Ch. 2' : idx === 1 ? 'Ch. 41' : 'Vol. 3'}
              updatedTime="7mo ago"
              onInfoClick={(e) => handleOpenPreview(manga, e)}
            />
          ))}
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
