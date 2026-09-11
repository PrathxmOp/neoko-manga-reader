import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBookmarks, getHistory } from '../services/storage';
import { getLatestUpdates } from '../services/suwayomiApi';
import { Manga, HistoryItem } from '../types/manga';
import { Clock, RefreshCw, Sparkles, BookOpen, Layers, Loader2 } from 'lucide-react';
import { MangaCard } from '../components/MangaCard';
import { MangaListItem } from '../components/MangaListItem';

export const UpdatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'server' | 'history'>('server');
  const [serverUpdates, setServerUpdates] = useState<Manga[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    document.title = 'New Updates — NEOKO';
    loadData();
  }, []);

  const loadData = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const [serverManga, history] = await Promise.all([
        getLatestUpdates(30, force),
        Promise.resolve(getHistory()),
      ]);
      setServerUpdates(serverManga);
      setHistoryItems(history);
    } catch (e) {
      console.error('Failed to load updates:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <main className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#2b2746]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#9d86e9]/10 text-[#9d86e9] border border-[#9d86e9]/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Manga Updates
            </h1>
            <p className="text-xs text-[#7c779b]">
              Discover newly released chapters across your active extensions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#231f3d] hover:bg-[#2b2746] text-slate-200 text-xs font-bold border border-[#2b2746] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#9d86e9]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-[#2b2746] pb-2">
        <button
          onClick={() => setActiveTab('server')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'server'
              ? 'bg-[#9d86e9] text-[#0c0c14] shadow-lg shadow-[#9d86e9]/20'
              : 'text-[#7c779b] hover:text-white hover:bg-[#161327]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>New Server Chapters ({serverUpdates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#9d86e9] text-[#0c0c14] shadow-lg shadow-[#9d86e9]/20'
              : 'text-[#7c779b] hover:text-white hover:bg-[#161327]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Recent History ({historyItems.length})</span>
        </button>
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#9d86e9] animate-spin" />
          <p className="text-xs text-[#7c779b]">Fetching latest chapter releases...</p>
        </div>
      ) : activeTab === 'server' ? (
        serverUpdates.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-[#161327] rounded-3xl border border-[#2b2746] p-8">
            <Clock className="w-12 h-12 text-[#7c779b]" />
            <div>
              <p className="text-base font-bold text-white">No recent server updates</p>
              <p className="text-xs text-[#7c779b] mt-1 max-w-sm">
                Connect extension sources or refresh to check for new chapter releases.
              </p>
            </div>
            <button
              onClick={() => navigate('/browse')}
              className="px-5 py-2.5 rounded-xl bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] text-xs font-bold shadow-lg transition-all"
            >
              Browse Sources
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {serverUpdates.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        )
      ) : historyItems.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-[#161327] rounded-3xl border border-[#2b2746] p-8">
          <BookOpen className="w-12 h-12 text-[#7c779b]" />
          <div>
            <p className="text-base font-bold text-white">No reading history</p>
            <p className="text-xs text-[#7c779b] mt-1">
              Start reading manga to automatically log your reading history here.
            </p>
          </div>
          <button
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 rounded-xl bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] text-xs font-bold shadow-lg transition-all"
          >
            Explore Manga
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {historyItems.map((item, idx) => (
            <MangaListItem
              key={`${item.mangaId}-${item.chapterId}-${idx}`}
              manga={{
                id: item.mangaId,
                title: item.mangaTitle,
                thumbnailUrl: item.thumbnailUrl,
                status: 'ONGOING',
              }}
              latestChapter={item.chapterName}
              updatedTime={new Date(item.readAt).toLocaleDateString()}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default UpdatesPage;
