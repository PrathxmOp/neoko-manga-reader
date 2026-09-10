import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chapter } from '../types/manga';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { isChapterRead, toggleChapterRead } from '../services/storage';
import { updateChapterRead, trackProgress } from '../services/suwayomiApi';

interface ChapterItemProps {
  chapter: Chapter;
  onToggleRead?: () => void;
}

export const ChapterItem: React.FC<ChapterItemProps> = ({ chapter, onToggleRead }) => {
  const navigate = useNavigate();
  const [readState, setReadState] = useState(Boolean(chapter.read || chapter.isRead || isChapterRead(chapter.id)));
  const isRead = readState;

  const handleClick = () => {
    navigate(`/read/${chapter.id}`);
  };

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRead = !isRead;
    setReadState(newRead);
    toggleChapterRead(chapter.id);

    const numericId = typeof chapter.id === 'number' ? chapter.id : parseInt(String(chapter.id), 10);
    if (!isNaN(numericId)) {
      try {
        await updateChapterRead(numericId, newRead);
        if (chapter.mangaId) {
          const numMangaId = typeof chapter.mangaId === 'number' ? chapter.mangaId : parseInt(String(chapter.mangaId), 10);
          if (!isNaN(numMangaId)) {
            await trackProgress(numMangaId);
          }
        }
      } catch (err) {
        console.error('Failed to update chapter read state:', err);
      }
    }
    if (onToggleRead) onToggleRead();
  };

  const formatDate = (dateVal?: string | number) => {
    if (!dateVal) return 'Recently updated';
    try {
      const date = new Date(Number(dateVal) || dateVal);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-all cursor-pointer border ${
        isRead
          ? 'bg-surface-container-low/40 border-transparent opacity-75 hover:opacity-100 hover:bg-surface-container-low'
          : 'bg-surface-container border-surface-container-high/60 hover:border-primary/40 hover:bg-surface-container-high'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Read Checkmark Circle */}
        <div
          onClick={handleToggleRead}
          className="shrink-0 p-1 -m-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title={isRead ? "Mark as Unread" : "Mark as Read"}
        >
          {isRead ? (
            <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
          ) : (
            <Circle className="w-5 h-5 text-outline group-hover:text-primary transition-colors" />
          )}
        </div>

        {/* Chapter Details */}
        <div className="flex flex-col min-w-0 gap-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            {chapter.chapterNumber !== undefined && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#231f3d] text-slate-200 text-[10px] font-bold border border-white/10 shrink-0">
                Ch. {chapter.chapterNumber}
              </span>
            )}
            <span className={`font-sans text-sm font-semibold truncate ${
              isRead ? 'text-slate-400' : 'text-on-surface group-hover:text-primary transition-colors'
            }`}>
              {chapter.name || `Chapter ${chapter.chapterNumber}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#9d86e9]" />
              {formatDate(chapter.uploadDate)}
            </span>
            {chapter.pageCount && chapter.pageCount > 0 ? (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-500" />
                <span className="text-[10px] text-[#9d86e9] font-bold bg-[#9d86e9]/15 px-1.5 py-0.5 rounded-md border border-[#9d86e9]/20">
                  {chapter.pageCount} pages
                </span>
              </>
            ) : null}
            {chapter.scanlator && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-500" />
                <span className="truncate text-slate-400">{chapter.scanlator}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
