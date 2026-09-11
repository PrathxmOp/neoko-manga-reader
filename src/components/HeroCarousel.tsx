import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Manga } from '../types/manga';
import { Flame, Star, BookOpen, BookmarkCheck, BookmarkPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { isBookmarked, saveBookmark, removeBookmark } from '../services/storage';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

interface HeroCarouselProps {
  items: Manga[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ items }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);

  const handleNext = () => {
    if (!items || items.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    if (!items || items.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  };

  const { ref, isDragging, deltaX } = useSwipeGesture<HTMLDivElement>({
    threshold: 40,
    velocityThreshold: 0.25,
    preventScroll: true,
    direction: 'horizontal',
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  useEffect(() => {
    if (!items || items.length === 0 || isPaused || isDragging) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [items, isPaused, isDragging]);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    items.forEach(item => {
      map[String(item.id)] = isBookmarked(item.id);
    });
    setBookmarkedMap(map);
  }, [items]);

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex];
  const isSaved = bookmarkedMap[String(currentItem.id)];

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      removeBookmark(currentItem.id);
      setBookmarkedMap(prev => ({ ...prev, [String(currentItem.id)]: false }));
    } else {
      saveBookmark(currentItem, 'Reading');
      setBookmarkedMap(prev => ({ ...prev, [String(currentItem.id)]: true }));
    }
  };

  const genres = Array.isArray(currentItem.genre) 
    ? currentItem.genre 
    : (currentItem.genre?.split(',') || ['Action', 'Fantasy', 'Supernatural']);

  return (
    <section 
      className="w-full relative select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        ref={ref}
        onClick={(e) => {
          if (Math.abs(deltaX) > 10) return; // ignore click if dragged
          navigate(`/manga/${currentItem.id}`);
        }}
        style={{
          transform: isDragging ? `translateX(${deltaX * 0.75}px) scale(0.99)` : 'translateX(0px) scale(1)',
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative w-full rounded-2xl overflow-hidden bg-surface-container shadow-2xl border border-surface-container-high cursor-pointer group transition-all duration-500 touch-pan-y"
      >
        {/* Artwork Image Container */}
        <div className="relative w-full h-80 sm:h-96 overflow-hidden">
          <img
            src={currentItem.thumbnailUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&q=80'}
            alt={currentItem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
          />

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/30 to-transparent pointer-events-none" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between z-10 pointer-events-none">
          {/* Top Badges */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <div className="flex items-center gap-space-2xs">
              <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Flame className="w-3.5 h-3.5 fill-current text-on-secondary-container animate-bounce" />
                #{currentIndex + 1} Trending
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-high/80 backdrop-blur-md text-primary font-sans text-xs font-semibold border border-primary/20">
                Featured
              </span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-tertiary-fixed font-sans text-xs font-bold border border-white/10">
              <Star className="w-3.5 h-3.5 text-tertiary-container fill-current" />
              <span>{currentItem.rating ? currentItem.rating.toFixed(1) : (8.5 + (Math.abs(String(currentItem.id || currentItem.title).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 14) / 10).toFixed(1)}</span>
            </div>
          </div>

          {/* Bottom Title & Actions */}
          <div className="flex flex-col gap-space-xs pointer-events-auto">
            <div>
              <div className="flex items-center gap-2 text-on-surface-variant font-sans text-xs uppercase tracking-wider font-semibold">
                {genres.slice(0, 3).map((g, idx) => (
                  <React.Fragment key={g}>
                    <span>{g.trim()}</span>
                    {idx < Math.min(genres.length, 3) - 1 && (
                      <span className="w-1 h-1 rounded-full bg-outline" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-on-surface mt-1 tracking-tight drop-shadow-md group-hover:text-primary transition-colors line-clamp-2">
                {currentItem.title}
              </h2>
            </div>

            <div className="flex items-center gap-space-xs pt-space-2xs">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/manga/${currentItem.id}`);
                }}
                className="flex-1 h-11 px-space-md rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 active:scale-98 transition-all"
              >
                <BookOpen className="w-5 h-5 fill-current" />
                <span>Start Reading</span>
              </button>

              <button
                aria-label="Bookmark"
                onClick={toggleBookmark}
                className={`w-11 h-11 rounded-xl backdrop-blur-md flex items-center justify-center transition-all ${
                  isSaved
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/30'
                    : 'bg-surface-container-high/90 text-on-surface hover:text-primary'
                }`}
              >
                {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <BookmarkPlus className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Floating Navigation Controls (Desktop hover & mobile drag visual) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all hidden sm:flex items-center justify-center border border-white/10 z-20 shadow-md"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-surface-container-lowest/80 backdrop-blur-md text-on-surface opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all hidden sm:flex items-center justify-center border border-white/10 z-20 shadow-md"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Carousel Dots */}
      <div className="flex items-center justify-center gap-2 mt-3">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex
                ? 'w-6 h-1.5 bg-primary shadow-[0_0_10px_rgba(208,188,255,0.8)]'
                : 'w-1.5 h-1.5 bg-surface-variant hover:bg-outline'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

