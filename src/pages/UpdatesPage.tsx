import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getBookmarks, getHistory } from '../services/storage';
import { HistoryItem } from '../types/manga';
import { Clock } from 'lucide-react';
import { MangaListItem } from '../components/MangaListItem';

export const UpdatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [updates, setUpdates] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = () => {
    const history = getHistory();
    const bookmarks = getBookmarks();

    if (history.length > 0) {
      setUpdates(history);
    } else if (bookmarks.length > 0) {
      const converted: HistoryItem[] = bookmarks.map((b) => ({
        mangaId: b.manga.id,
        mangaTitle: b.manga.title,
        thumbnailUrl: b.manga.thumbnailUrl,
        chapterId: b.manga.chapters?.[0]?.id || 1,
        chapterName: b.manga.chapters?.[0]?.name || 'Chapter 1',
        readAt: b.addedAt,
      }));
      setUpdates(converted);
    } else {
      setUpdates([]);
    }
  };

  // If user is not logged in or no history: Kagane Screenshot 4 empty state
  if (updates.length === 0) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-[#1c1833] flex items-center justify-center mb-6 border border-[#2b2746] shadow-xl">
          <Clock className="w-12 h-12 text-[#9d86e9]" />
        </div>

        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight mb-2">
          No Reading History Yet
        </h1>

        <p className="font-sans text-sm text-[#7c779b] max-w-sm mb-6 leading-relaxed">
          Start reading manga to see your recent history and chapter updates here.
        </p>

        <button
          onClick={() => navigate('/browse')}
          className="px-6 py-2.5 rounded-xl bg-[#9d86e9] hover:bg-[#8b70e5] text-[#0c0c14] font-bold text-sm shadow-lg transition-all active:scale-95"
        >
          Browse Catalog
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-7xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-[#1f1c35] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#9d86e9]" />
          <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
            Reading History & Updates
          </h1>
        </div>
        <span className="text-xs text-[#7c779b] font-medium">
          {updates.length} items logged
        </span>
      </div>

      {updates.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 bg-[#161327] rounded-2xl border border-[#2b2746]">
          <Clock className="w-12 h-12 text-[#7c779b]" />
          <p className="font-sans text-base font-semibold text-white">No reading history yet</p>
          <p className="font-sans text-xs text-[#7c779b]">Start reading manga to automatically track your progress here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {updates.map((item, idx) => (
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
