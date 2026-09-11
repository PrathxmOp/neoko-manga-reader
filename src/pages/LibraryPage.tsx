import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookmarkItem, HistoryItem, Manga } from '../types/manga';
import { getBookmarks, getHistory, removeBookmark, saveBookmark, removeHistoryItem, clearHistory } from '../services/storage';
import { MangaCard } from '../components/MangaCard';
import { MangaInfoModal } from '../components/MangaInfoModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../contexts/ToastContext';
import { Bookmark, Clock, Trash2, BookOpen, Layers, Star, Heart, Check, ArrowUpDown, CheckSquare, Square, X, FolderInput } from 'lucide-react';

interface LibraryPageProps {
  defaultTab?: 'Reading' | 'Plan to Read' | 'Completed' | 'Favorite' | 'History';
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ defaultTab }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const urlTab = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<'Reading' | 'Plan to Read' | 'Completed' | 'Favorite' | 'History'>(
    defaultTab || urlTab || 'Reading'
  );
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sortOption, setSortOption] = useState<'added-desc' | 'added-asc' | 'title-asc' | 'title-desc'>('added-desc');
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedMangaIds, setSelectedMangaIds] = useState<Set<string | number>>(new Set());

  // Quick Info Preview State
  const [previewManga, setPreviewManga] = useState<Manga | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showConfirmClearHistory, setShowConfirmClearHistory] = useState(false);

  const handleOpenPreview = (manga: Manga, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewManga(manga);
    setIsInfoModalOpen(true);
  };

  useEffect(() => {
    document.title = 'My Library — NEOKO';
    const refreshData = () => {
      setBookmarks(getBookmarks());
      setHistory(getHistory());
    };
    refreshData();

    window.addEventListener('neoko_bookmarks_changed', refreshData);
    window.addEventListener('neoko_history_changed', refreshData);
    return () => {
      window.removeEventListener('neoko_bookmarks_changed', refreshData);
      window.removeEventListener('neoko_history_changed', refreshData);
    };
  }, []);

  const handleRemove = (mangaId: string | number) => {
    const updated = removeBookmark(mangaId);
    setBookmarks(updated);
    showToast('Removed from Library', 'info');
  };

  const handleCategoryChange = (manga: BookmarkItem['manga'], newCategory: BookmarkItem['category']) => {
    const updated = saveBookmark(manga, newCategory);
    setBookmarks(updated);
    showToast(`Moved to "${newCategory}"`, 'success');
  };

  const handleRemoveSingleHistory = (e: React.MouseEvent, mangaId: string | number, chapterId: string | number) => {
    e.stopPropagation();
    const updated = removeHistoryItem(mangaId, chapterId);
    setHistory(updated);
    showToast('Removed from history', 'info');
  };

  const handleClearAllHistory = () => {
    clearHistory();
    setHistory([]);
    setShowConfirmClearHistory(false);
    showToast('History cleared', 'info');
  };

  const handleToggleSelectManga = (mangaId: string | number) => {
    setSelectedMangaIds(prev => {
      const next = new Set(prev);
      if (next.has(mangaId)) next.delete(mangaId);
      else next.add(mangaId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const currentList = bookmarks.filter(b => b.category === activeTab);
    if (selectedMangaIds.size === currentList.length) {
      setSelectedMangaIds(new Set());
    } else {
      setSelectedMangaIds(new Set(currentList.map(b => b.manga.id)));
    }
  };

  const handleBatchMove = (targetCategory: BookmarkItem['category']) => {
    let count = 0;
    bookmarks.forEach(b => {
      if (selectedMangaIds.has(b.manga.id)) {
        saveBookmark(b.manga, targetCategory);
        count++;
      }
    });
    setBookmarks(getBookmarks());
    setSelectedMangaIds(new Set());
    setIsMultiSelect(false);
    showToast(`Moved ${count} items to ${targetCategory}`, 'success');
  };

  const handleBatchRemove = () => {
    let count = 0;
    selectedMangaIds.forEach(id => {
      removeBookmark(id);
      count++;
    });
    setBookmarks(getBookmarks());
    setSelectedMangaIds(new Set());
    setIsMultiSelect(false);
    showToast(`Removed ${count} items from Library`, 'info');
  };

  const filteredBookmarks = bookmarks.filter(b => b.category === activeTab);
  const sortedBookmarks = [...filteredBookmarks].sort((a, b) => {
    if (sortOption === 'title-asc') return a.manga.title.localeCompare(b.manga.title);
    if (sortOption === 'title-desc') return b.manga.title.localeCompare(a.manga.title);
    if (sortOption === 'added-asc') return a.addedAt - b.addedAt;
    return b.addedAt - a.addedAt;
  });

  const groupHistoryByDate = (items: HistoryItem[]) => {
    const groups: Record<string, HistoryItem[]> = {};
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    items.forEach(item => {
      const itemDateStr = new Date(item.readAt).toDateString();
      let label = itemDateStr;
      if (itemDateStr === todayStr) label = 'Today';
      else if (itemDateStr === yesterdayStr) label = 'Yesterday';
      
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });
    return groups;
  };

  return (
    <main className="flex flex-col relative w-full pt-20 pb-28 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-[#9d86e9]" />
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
              My Library & Bookmarks
            </h1>
          </div>

          {/* Controls Bar for Grid View */}
          {activeTab !== 'History' && filteredBookmarks.length > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => {
                  setIsMultiSelect(!isMultiSelect);
                  setSelectedMangaIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isMultiSelect
                    ? 'bg-[#9d86e9] text-[#0c0c14]'
                    : 'bg-[#1c1833] text-slate-300 hover:text-white border border-[#2b2746]'
                }`}
              >
                {isMultiSelect ? <X className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                <span>{isMultiSelect ? 'Cancel' : 'Select'}</span>
              </button>

              <div className="flex items-center gap-1 bg-[#1c1833] border border-[#2b2746] rounded-xl px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#9d86e9]" />
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="bg-transparent text-slate-300 text-xs font-bold outline-none cursor-pointer pr-1"
                >
                  <option value="added-desc">Recently Added</option>
                  <option value="added-asc">Oldest Added</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'History' && history.length > 0 && (
            <button
              onClick={() => setShowConfirmClearHistory(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors self-end sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          )}
        </div>

        {/* Tab Navigation Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#161327] rounded-2xl p-1.5 border border-[#2b2746]">
          {[
            { id: 'Reading', label: '📖 Reading', count: bookmarks.filter(b => b.category === 'Reading').length },
            { id: 'Plan to Read', label: '📌 Plan to Read', count: bookmarks.filter(b => b.category === 'Plan to Read').length },
            { id: 'Completed', label: '✅ Completed', count: bookmarks.filter(b => b.category === 'Completed').length },
            { id: 'Favorite', label: '⭐ Favorites', count: bookmarks.filter(b => b.category === 'Favorite').length },
            { id: 'History', label: '🕒 History', count: history.length },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsMultiSelect(false);
                  setSelectedMangaIds(new Set());
                }}
                className={`px-3.5 py-2 rounded-xl font-sans text-xs font-bold shrink-0 flex items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-[#9d86e9] text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-[#231f3d]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#231f3d] text-[#9d86e9]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch Action Toolbar */}
      {isMultiSelect && activeTab !== 'History' && (
        <div className="sticky top-16 z-30 bg-[#1c1833] border border-[#9d86e9]/40 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-2xl animate-slide-down">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs font-bold text-[#9d86e9] hover:underline px-2 py-1"
            >
              {selectedMangaIds.size === filteredBookmarks.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs font-bold text-slate-300">
              ({selectedMangaIds.size} selected)
            </span>
          </div>

          {selectedMangaIds.size > 0 && (
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchMove(e.target.value as any);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="bg-[#231f3d] text-white text-xs font-bold rounded-xl px-3 py-1.5 border border-[#3b355e] outline-none cursor-pointer"
              >
                <option value="" disabled>Move to...</option>
                <option value="Reading">📖 Reading</option>
                <option value="Plan to Read">📌 Plan to Read</option>
                <option value="Completed">✅ Completed</option>
                <option value="Favorite">⭐ Favorite</option>
              </select>

              <button
                onClick={handleBatchRemove}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-500/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content View */}
      {activeTab === 'History' ? (
        /* History Section Grouped by Date */
        history.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 space-y-3 bg-[#161327] rounded-2xl border border-[#2b2746]">
            <Clock className="w-12 h-12 text-slate-500/40" />
            <p className="font-sans text-sm font-semibold text-white">No reading history yet</p>
            <p className="font-sans text-xs text-slate-400">Manga chapters you read will automatically appear here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupHistoryByDate(history)).map(([dateGroup, items]) => (
              <div key={dateGroup} className="space-y-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#9d86e9] flex items-center gap-2">
                  <span>{dateGroup}</span>
                  <div className="flex-1 h-px bg-[#2b2746]" />
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {items.map(item => (
                    <div
                      key={`${item.mangaId}-${item.chapterId}-${item.readAt}`}
                      onClick={() => navigate(`/read/${item.chapterId}?page=${item.pageIndex || 1}`)}
                      className="group relative rounded-xl overflow-hidden bg-[#161327] border border-[#2b2746] hover:border-[#9d86e9]/60 cursor-pointer p-3 flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80'}
                          alt={item.mangaTitle}
                          className="w-12 h-16 object-cover rounded-lg shrink-0 shadow-md bg-[#231f3d]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80';
                          }}
                        />
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-display font-bold text-xs text-white truncate group-hover:text-[#9d86e9] transition-colors">
                            {item.mangaTitle || 'Manga Chapter'}
                          </h4>
                          <span className="text-[11px] text-[#9d86e9] font-semibold mt-0.5 truncate">
                            {item.chapterName}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                            <Clock className="w-3 h-3 text-[#9d86e9]" />
                            {new Date(item.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons on history item */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleRemoveSingleHistory(e, item.mangaId, item.chapterId)}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Delete from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <BookOpen className="w-5 h-5 text-slate-500 group-hover:text-[#9d86e9] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Bookmarks Grid */
        sortedBookmarks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 space-y-3 bg-[#161327] rounded-2xl border border-[#2b2746]">
            <Bookmark className="w-12 h-12 text-slate-500/40" />
            <p className="font-sans text-sm font-semibold text-white">No titles in {activeTab}</p>
            <p className="font-sans text-xs text-slate-400">Browse manga and click "Add to Library" to save them here.</p>
            <button
              onClick={() => navigate('/browse')}
              className="px-4 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-bold text-xs shadow-md"
            >
              Browse Titles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {sortedBookmarks.map(b => {
              const isSelected = selectedMangaIds.has(b.manga.id);

              return (
                <div
                  key={b.manga.id}
                  className={`relative group flex flex-col gap-1.5 transition-all ${
                    isSelected ? 'ring-2 ring-[#9d86e9] rounded-2xl p-1 bg-[#9d86e9]/10' : ''
                  }`}
                >
                  <div
                    className="relative"
                    onClick={() => {
                      if (isMultiSelect) {
                        handleToggleSelectManga(b.manga.id);
                      }
                    }}
                  >
                    {isMultiSelect && (
                      <div className="absolute top-3 left-3 z-20">
                        {isSelected ? (
                          <CheckSquare className="w-6 h-6 text-[#9d86e9] bg-[#0c0c14] rounded-md" />
                        ) : (
                          <Square className="w-6 h-6 text-white/70 bg-[#0c0c14]/80 rounded-md" />
                        )}
                      </div>
                    )}

                    <MangaCard
                      manga={b.manga}
                      rankBadge={b.category}
                      progressPercent={b.progressPercent}
                      onInfoClick={(m, e) => handleOpenPreview(m, e)}
                    />
                  </div>

                  {!isMultiSelect && (
                    <div className="flex items-center justify-between gap-1 px-1">
                      <select
                        value={b.category}
                        onChange={(e) => handleCategoryChange(b.manga, e.target.value as any)}
                        className="bg-[#1c1833] text-slate-300 border border-[#2b2746] hover:border-[#9d86e9] text-[10px] font-bold rounded-lg px-2 py-1 outline-none transition-colors cursor-pointer w-full"
                      >
                        <option value="Reading">📖 Reading</option>
                        <option value="Plan to Read">📌 Plan to Read</option>
                        <option value="Completed">✅ Completed</option>
                        <option value="Favorite">⭐ Favorite</option>
                      </select>
                      <button
                        onClick={() => handleRemove(b.manga.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors shrink-0"
                        title="Remove from Library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Quick Info Modal */}
      <MangaInfoModal
        manga={previewManga}
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      {/* Clear History Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmClearHistory}
        title="Clear Reading History"
        message="Are you sure you want to clear your entire reading history? This action cannot be undone."
        confirmLabel="Clear History"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={handleClearAllHistory}
        onCancel={() => setShowConfirmClearHistory(false)}
      />
    </main>
  );
};

export default LibraryPage;
