import React, { useState, useEffect } from 'react';
import { TrackerInfo, TrackRecord, TrackSearchResult, Manga } from '../types/manga';
import { getTrackers, getMangaTrackRecords, searchTracker, bindTrack, unbindTrack, updateTrack, trackProgress, fetchTrack } from '../services/suwayomiApi';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';
import { 
  X as XIcon, 
  Search as SearchIcon, 
  ExternalLink as ExternalLinkIcon, 
  Trash2 as TrashIcon, 
  CheckCircle2 as CheckIcon, 
  Loader2 as LoaderIcon, 
  Star as StarIcon, 
  BookOpen as BookIcon, 
  Link as LinkIcon,
  RefreshCw as RefreshIcon,
  Plus as PlusIcon,
  Minus as MinusIcon,
  Lock as LockIcon,
  Eye as EyeIcon
} from 'lucide-react';

interface TrackerModalProps {
  manga: Manga;
  onClose: () => void;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: 1, name: 'Reading' },
  { value: 2, name: 'Completed' },
  { value: 3, name: 'On Hold' },
  { value: 4, name: 'Dropped' },
  { value: 6, name: 'Plan to Read' },
];

function getStatusBadgeStyle(value: number, name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('reading')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
  if (lowerName.includes('complete')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (lowerName.includes('hold')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  if (lowerName.includes('drop')) return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  if (lowerName.includes('plan') || lowerName.includes('wish')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  if (lowerName.includes('reread') || lowerName.includes('unfinished')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  
  // Fallbacks by value
  switch (value) {
    case 1: return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    case 2: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 3: return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 4: return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    default: return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  }
}

export const TrackerModal: React.FC<TrackerModalProps> = ({ manga, onClose }) => {
  const [trackers, setTrackers] = useState<TrackerInfo[]>([]);
  const [records, setRecords] = useState<TrackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Active search state for binding
  const [activeBindingTrackerId, setActiveBindingTrackerId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrackSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [tempChapterInput, setTempChapterInput] = useState<string>('');

  const { ref: dismissRef, offsetY, isDragging } = useSwipeDismiss<HTMLDivElement>({
    onDismiss: onClose,
  });

  useEffect(() => {
    loadData();
  }, [manga.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, rList] = await Promise.all([
        getTrackers(),
        getMangaTrackRecords(manga.id),
      ]);
      setTrackers(tList);
      setRecords(rList);
    } catch (e) {
      console.error('Failed to load tracking data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSearch = async (trackerId: number) => {
    setActiveBindingTrackerId(trackerId);
    setSearchQuery(manga.title);
    executeSearch(trackerId, manga.title);
  };

  const executeSearch = async (trackerId: number, query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await searchTracker(trackerId, query);
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed:', e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleBind = async (trackerId: number, remoteId: string) => {
    setActionLoading(`bind-${trackerId}`);
    try {
      await bindTrack(manga.id, trackerId, String(remoteId));
      setActiveBindingTrackerId(null);
      await loadData();
    } catch (e) {
      console.error('Failed to bind track:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbind = async (recordId: number) => {
    if (!confirm('Are you sure you want to unbind this tracker?')) return;
    setActionLoading(`unbind-${recordId}`);
    try {
      await unbindTrack(recordId);
      await loadData();
    } catch (e) {
      console.error('Failed to unbind track:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFetchRemoteTrack = async (record: TrackRecord) => {
    setActionLoading(`fetch-${record.id}`);
    try {
      const updated = await fetchTrack(record.id);
      if (updated) {
        setRecords((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
      } else {
        await loadData();
      }
    } catch (e) {
      console.error('Failed to sync remote track:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (record: TrackRecord, newStatus: number) => {
    setActionLoading(`update-${record.id}`);
    try {
      await updateTrack(record.id, newStatus, record.score, record.lastChapterRead, record.private);
      await trackProgress(manga.id);
      await loadData();
    } catch (e) {
      console.error('Failed to update track status:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateScore = async (record: TrackRecord, newScore: string | number) => {
    setActionLoading(`score-${record.id}`);
    try {
      await updateTrack(record.id, record.status, newScore, record.lastChapterRead, record.private);
      await trackProgress(manga.id);
      await loadData();
    } catch (e) {
      console.error('Failed to update track score:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateChapter = async (record: TrackRecord, newChapter: number) => {
    const validChapter = Math.max(0, newChapter);
    setActionLoading(`chapter-${record.id}`);
    try {
      await updateTrack(record.id, record.status, record.score, validChapter, record.private);
      await trackProgress(manga.id);
      await loadData();
    } catch (e) {
      console.error('Failed to update chapter progress:', e);
    } finally {
      setActionLoading(null);
      setEditingChapterId(null);
    }
  };

  const handleTogglePrivate = async (record: TrackRecord) => {
    const newPrivate = !record.private;
    setActionLoading(`private-${record.id}`);
    try {
      await updateTrack(record.id, record.status, record.score, record.lastChapterRead, newPrivate);
      await loadData();
    } catch (e) {
      console.error('Failed to toggle private tracking:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const connectedTrackers = trackers.filter((t) => t.isLoggedIn);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dismissRef}
        style={{
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : 'none',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="w-full max-w-lg bg-[#161327] border border-[#2b2746] rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 touch-pan-y"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle pill */}
        <div className="w-12 h-1.5 rounded-full bg-[#2b2746] mx-auto mt-2 shrink-0 cursor-grab active:cursor-grabbing" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2b2746] flex items-center justify-between bg-[#120f23]">
          <div className="flex items-center gap-2.5">
            <LinkIcon className="w-5 h-5 text-[#9d86e9]" />
            <h3 className="font-display font-bold text-base text-white">
              Trackers & Synchronization
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4 font-sans text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <LoaderIcon className="w-6 h-6 animate-spin text-[#9d86e9]" />
              <p>Loading connected trackers...</p>
            </div>
          ) : connectedTrackers.length === 0 ? (
            <div className="p-6 text-center bg-[#1c1833] rounded-xl border border-[#2b2746] flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-[#9d86e9]/10 text-[#9d86e9]">
                <LinkIcon className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-white">No Active Tracker Connected</h4>
              <p className="text-slate-400 max-w-xs text-[11px] leading-relaxed">
                Connect your MyAnimeList, AniList, Kitsu or MangaUpdates account in Settings to sync your reading progress automatically!
              </p>
            </div>
          ) : (
            connectedTrackers.map((t) => {
              const boundRecord = records.find((r) => r.trackerId === t.id);
              const isBindingThis = activeBindingTrackerId === t.id;
              const statusOptions = t.statuses && t.statuses.length > 0 ? t.statuses : DEFAULT_STATUS_OPTIONS;
              const scoreOptions = t.scores && t.scores.length > 0 ? t.scores : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-[#1c1833] border border-[#2b2746] flex flex-col gap-3 transition-all"
                >
                  {/* Tracker Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {t.icon ? (
                        <img src={t.icon} alt={t.name} className="w-6 h-6 rounded-md object-cover" />
                      ) : (
                        <BookIcon className="w-5 h-5 text-[#9d86e9]" />
                      )}
                      <div>
                        <h4 className="font-bold text-sm text-white">{t.name}</h4>
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckIcon className="w-3 h-3" /> Connected
                        </span>
                      </div>
                    </div>

                    {boundRecord && (
                      <div className="flex items-center gap-1.5">
                        {/* Remote Sync Button */}
                        <button
                          onClick={() => handleFetchRemoteTrack(boundRecord)}
                          disabled={actionLoading === `fetch-${boundRecord.id}`}
                          className="p-2 rounded-lg bg-[#25213b] hover:bg-[#2e294a] text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Sync with Remote Tracker"
                        >
                          <RefreshIcon className={`w-3.5 h-3.5 text-[#9d86e9] ${actionLoading === `fetch-${boundRecord.id}` ? 'animate-spin' : ''}`} />
                        </button>

                        {/* External Link */}
                        {boundRecord.remoteUrl && (
                          <a
                            href={boundRecord.remoteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[#25213b] hover:bg-[#2e294a] text-slate-300 hover:text-white transition-colors"
                            title="Open on Web"
                          >
                            <ExternalLinkIcon className="w-3.5 h-3.5 text-[#9d86e9]" />
                          </a>
                        )}

                        {/* Unbind Button */}
                        <button
                          onClick={() => handleUnbind(boundRecord.id)}
                          disabled={actionLoading === `unbind-${boundRecord.id}`}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                          title="Unbind Tracker"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bound State Details */}
                  {boundRecord ? (
                    <div className="flex flex-col gap-3 pt-2 border-t border-[#2b2746]/60">
                      {/* Title display if available */}
                      {boundRecord.title && (
                        <div className="text-[11px] text-slate-400 font-medium truncate">
                          Bound to: <span className="text-white font-bold">{boundRecord.title}</span>
                        </div>
                      )}

                      {/* Status Selector */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-slate-400 font-medium">Status:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {statusOptions.map((st) => {
                            const isSelected = boundRecord.status === st.value;
                            const badgeStyle = getStatusBadgeStyle(st.value, st.name);
                            return (
                              <button
                                key={st.value}
                                onClick={() => handleUpdateStatus(boundRecord, st.value)}
                                disabled={actionLoading === `update-${boundRecord.id}`}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  isSelected ? badgeStyle : 'bg-[#120f23] border-[#2b2746] text-slate-400 hover:text-white'
                                }`}
                              >
                                {st.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Progress Chapter & Score Controls */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#2b2746]/40 flex-wrap">
                        {/* Chapter Progress Control */}
                        <div className="flex items-center gap-2">
                          <BookIcon className="w-3.5 h-3.5 text-[#9d86e9] shrink-0" />
                          <span className="text-slate-400 font-medium">Progress:</span>
                          <div className="flex items-center gap-1 bg-[#120f23] border border-[#2b2746] rounded-lg p-0.5">
                            <button
                              onClick={() => handleUpdateChapter(boundRecord, boundRecord.lastChapterRead - 1)}
                              disabled={actionLoading === `chapter-${boundRecord.id}` || boundRecord.lastChapterRead <= 0}
                              className="p-1 rounded-md hover:bg-[#25213b] text-slate-300 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                              title="Decrement Chapter"
                            >
                              <MinusIcon className="w-3 h-3" />
                            </button>

                            {editingChapterId === boundRecord.id ? (
                              <input
                                type="number"
                                autoFocus
                                value={tempChapterInput}
                                onChange={(e) => setTempChapterInput(e.target.value)}
                                onBlur={() => {
                                  const num = parseFloat(tempChapterInput);
                                  if (!isNaN(num)) handleUpdateChapter(boundRecord, num);
                                  else setEditingChapterId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const num = parseFloat(tempChapterInput);
                                    if (!isNaN(num)) handleUpdateChapter(boundRecord, num);
                                    else setEditingChapterId(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingChapterId(null);
                                  }
                                }}
                                className="w-12 text-center bg-[#1c1833] text-white font-bold text-xs rounded px-1 focus:outline-none border border-[#9d86e9]"
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingChapterId(boundRecord.id);
                                  setTempChapterInput(String(boundRecord.lastChapterRead));
                                }}
                                className="px-1.5 py-0.5 font-bold text-white text-xs hover:text-[#9d86e9] transition-colors cursor-pointer"
                                title="Click to edit chapter number"
                              >
                                {boundRecord.lastChapterRead}
                              </button>
                            )}

                            <button
                              onClick={() => handleUpdateChapter(boundRecord, boundRecord.lastChapterRead + 1)}
                              disabled={actionLoading === `chapter-${boundRecord.id}`}
                              className="p-1 rounded-md hover:bg-[#25213b] text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Increment Chapter"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                          {boundRecord.totalChapters > 0 && (
                            <span className="text-[11px] text-slate-400 font-medium">/ {boundRecord.totalChapters} ch</span>
                          )}
                        </div>

                        {/* Score Picker & Private Toggle */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <StarIcon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                            <span className="text-slate-400 font-medium">Score:</span>
                            <select
                              value={boundRecord.displayScore || boundRecord.score || 0}
                              onChange={(e) => handleUpdateScore(boundRecord, e.target.value)}
                              disabled={actionLoading === `score-${boundRecord.id}`}
                              className="bg-[#120f23] border border-[#2b2746] text-white font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-[#9d86e9] cursor-pointer text-xs"
                            >
                              <option value="0">-</option>
                              {scoreOptions.filter(s => s !== '0' && s !== '0.0').map((sc) => (
                                <option key={sc} value={sc}>
                                  {sc} ★
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Private Tracking Toggle (AniList / Kitsu / Bangumi) */}
                          {t.supportsPrivateTracking && (
                            <button
                              onClick={() => handleTogglePrivate(boundRecord)}
                              disabled={actionLoading === `private-${boundRecord.id}`}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                                boundRecord.private
                                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                  : 'bg-[#120f23] border-[#2b2746] text-slate-400 hover:text-white'
                              }`}
                              title={boundRecord.private ? 'Private Tracking Enabled' : 'Public Tracking'}
                            >
                              {boundRecord.private ? <LockIcon className="w-3 h-3 text-purple-300" /> : <EyeIcon className="w-3 h-3 text-slate-400" />}
                              <span>{boundRecord.private ? 'Private' : 'Public'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Unbound State: Show Bind / Search Button */
                    <div className="pt-2 border-t border-[#2b2746]/60">
                      {!isBindingThis ? (
                        <button
                          onClick={() => handleStartSearch(t.id)}
                          className="w-full py-2.5 rounded-xl bg-[#25213b] hover:bg-[#9d86e9] hover:text-[#0c0c14] text-[#9d86e9] font-bold transition-all flex items-center justify-center gap-2 border border-[#9d86e9]/30 cursor-pointer"
                        >
                          <LinkIcon className="w-4 h-4" />
                          <span>Bind to {t.name}</span>
                        </button>
                      ) : (
                        /* Inline Search Interface */
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1 flex items-center bg-[#120f23] rounded-xl px-3 py-2 border border-[#2b2746]">
                              <SearchIcon className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && executeSearch(t.id, searchQuery)}
                                placeholder={`Search title on ${t.name}...`}
                                className="w-full bg-transparent text-white font-sans text-xs focus:outline-none"
                              />
                            </div>
                            <button
                              onClick={() => executeSearch(t.id, searchQuery)}
                              disabled={searching}
                              className="px-3 py-2 rounded-xl bg-[#9d86e9] text-[#0c0c14] font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                            >
                              {searching ? <LoaderIcon className="w-4 h-4 animate-spin" /> : 'Search'}
                            </button>
                            <button
                              onClick={() => setActiveBindingTrackerId(null)}
                              className="p-2 text-slate-400 hover:text-white"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Search Results List */}
                          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                            {searching ? (
                              <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                                <LoaderIcon className="w-4 h-4 animate-spin text-[#9d86e9]" />
                                <span>Searching {t.name}...</span>
                              </div>
                            ) : searchResults.length === 0 ? (
                              <div className="py-4 text-center text-slate-500 text-[11px]">
                                No matching entries found on {t.name}.
                              </div>
                            ) : (
                              searchResults.map((res) => {
                                const isExactMatch = res.title.toLowerCase().replace(/[^a-z0-9]/g, '') === manga.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                                return (
                                  <div
                                    key={res.remoteId}
                                    className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                                      isExactMatch
                                        ? 'bg-[#9d86e9]/10 border-[#9d86e9]/40'
                                        : 'bg-[#120f23] border-[#2b2746] hover:border-[#9d86e9]/40'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {res.coverUrl ? (
                                        <img
                                          src={res.coverUrl}
                                          alt={res.title}
                                          className="w-9 h-12 object-cover rounded-md shrink-0 bg-[#161327]"
                                        />
                                      ) : (
                                        <div className="w-9 h-12 rounded-md shrink-0 bg-[#25213b] flex items-center justify-center text-slate-500">
                                          <BookIcon className="w-4 h-4" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <h5 className="font-bold text-white truncate text-xs">{res.title}</h5>
                                          {isExactMatch && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#9d86e9] text-[#0c0c14] shrink-0">
                                              Match
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                          {res.totalChapters > 0 ? `${res.totalChapters} ch` : 'Ongoing'}
                                          {res.score ? ` • ${res.score} ★` : ''}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleBind(t.id, res.remoteId)}
                                      disabled={actionLoading === `bind-${t.id}`}
                                      className="px-3 py-1.5 rounded-lg bg-[#9d86e9] text-[#0c0c14] font-bold text-[11px] hover:opacity-90 transition-opacity cursor-pointer shrink-0 flex items-center gap-1"
                                    >
                                      {actionLoading === `bind-${t.id}` ? (
                                        <LoaderIcon className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <>
                                          <LinkIcon className="w-3 h-3" /> Link
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
