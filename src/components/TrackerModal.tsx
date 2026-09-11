import React, { useState, useEffect } from 'react';
import { TrackerInfo, TrackRecord, TrackSearchResult, Manga } from '../types/manga';
import { getTrackers, getMangaTrackRecords, searchTracker, bindTrack, unbindTrack, updateTrack, trackProgress } from '../services/suwayomiApi';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';
import { X as XIcon, Search as SearchIcon, ExternalLink as ExternalLinkIcon, Trash2 as TrashIcon, CheckCircle2 as CheckIcon, Loader2 as LoaderIcon, Star as StarIcon, BookOpen as BookIcon, Link as LinkIcon } from 'lucide-react';

interface TrackerModalProps {
  manga: Manga;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 1, label: 'Reading', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { value: 2, label: 'Completed', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { value: 3, label: 'On Hold', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { value: 4, label: 'Dropped', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { value: 6, label: 'Plan to Read', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
];

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
      setTrackers(tList.filter(t => t.isLoggedIn));
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

  const handleUpdateStatus = async (record: TrackRecord, newStatus: number) => {
    setActionLoading(`update-${record.id}`);
    try {
      await updateTrack(record.id, newStatus, record.score, record.lastChapterRead);
      await trackProgress(manga.id);
      await loadData();
    } catch (e) {
      console.error('Failed to update track status:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateScore = async (record: TrackRecord, newScore: number) => {
    setActionLoading(`score-${record.id}`);
    try {
      await updateTrack(record.id, record.status, newScore, record.lastChapterRead);
      await trackProgress(manga.id);
      await loadData();
    } catch (e) {
      console.error('Failed to update track score:', e);
    } finally {
      setActionLoading(null);
    }
  };

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
          ) : trackers.length === 0 ? (
            <div className="p-6 text-center bg-[#1c1833] rounded-xl border border-[#2b2746] flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-[#9d86e9]/10 text-[#9d86e9]">
                <LinkIcon className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-white">No Active Tracker Connected</h4>
              <p className="text-slate-400 max-w-xs text-[11px] leading-relaxed">
                You haven't logged into MyAnimeList or AniList in Settings yet. Log in to sync your manga reading progress automatically!
              </p>
            </div>
          ) : (
            trackers.map((t) => {
              const boundRecord = records.find((r) => r.trackerId === t.id);
              const isBindingThis = activeBindingTrackerId === t.id;

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
                      <div className="flex items-center gap-2">
                        {boundRecord.remoteUrl && (
                          <a
                            href={boundRecord.remoteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[#25213b] hover:bg-[#2e294a] text-slate-300 hover:text-white transition-colors"
                            title="Open on Web"
                          >
                            <ExternalLinkIcon className="w-4 h-4 text-[#9d86e9]" />
                          </a>
                        )}
                        <button
                          onClick={() => handleUnbind(boundRecord.id)}
                          disabled={actionLoading === `unbind-${boundRecord.id}`}
                          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                          title="Unbind Tracker"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bound State Details */}
                  {boundRecord ? (
                    <div className="flex flex-col gap-3 pt-2 border-t border-[#2b2746]/60">
                      {/* Status Selector */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-slate-400 font-medium">Status:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_OPTIONS.map((st) => {
                            const isSelected = boundRecord.status === st.value;
                            return (
                              <button
                                key={st.value}
                                onClick={() => handleUpdateStatus(boundRecord, st.value)}
                                disabled={actionLoading === `update-${boundRecord.id}`}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  isSelected ? st.color : 'bg-[#120f23] border-[#2b2746] text-slate-400 hover:text-white'
                                }`}
                              >
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Chapters Read & Score */}
                      <div className="flex items-center justify-between text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5">
                          <BookIcon className="w-3.5 h-3.5 text-[#9d86e9]" />
                          <span>
                            Progress: <strong className="text-white">{boundRecord.lastChapterRead}</strong>
                            {boundRecord.totalChapters > 0 ? ` / ${boundRecord.totalChapters}` : ''} ch
                          </span>
                        </div>

                        {/* Score Picker */}
                        <div className="flex items-center gap-1">
                          <StarIcon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                          <span className="mr-1">Score:</span>
                          <select
                            value={boundRecord.score || 0}
                            onChange={(e) => handleUpdateScore(boundRecord, parseFloat(e.target.value))}
                            className="bg-[#120f23] border border-[#2b2746] text-white font-bold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
                          >
                            <option value={0}>-</option>
                            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((s) => (
                              <option key={s} value={s}>
                                {s} ★
                              </option>
                            ))}
                          </select>
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
                                placeholder="Search title on tracker..."
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
                          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
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
                              searchResults.map((res) => (
                                <div
                                  key={res.remoteId}
                                  className="p-2.5 rounded-xl bg-[#120f23] border border-[#2b2746] hover:border-[#9d86e9]/40 flex items-center justify-between gap-3 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {res.coverUrl && (
                                      <img
                                        src={res.coverUrl}
                                        alt={res.title}
                                        className="w-8 h-11 object-cover rounded-md shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-white truncate text-xs">{res.title}</h5>
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
                              ))
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
