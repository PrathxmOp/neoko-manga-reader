import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Chapter } from '../types/manga';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { isChapterRead } from '../services/storage';

interface ChapterItemProps {
  chapter: Chapter;
}

export const ChapterItem: React.FC<ChapterItemProps> = ({ chapter }) => {
  const navigate = useNavigate();
  const isRead = chapter.read || isChapterRead(chapter.id);

  const handleClick = () => {
    navigate(`/read/${chapter.id}`);
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
        <div className="shrink-0">
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
