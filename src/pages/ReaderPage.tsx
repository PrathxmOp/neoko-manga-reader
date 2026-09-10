import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getChapterPages, getChapterDetails, getMangaDetails, Chapter } from '../services/suwayomiApi';
import { addHistoryItem, getHistory, getReaderSettings, saveReaderSettings, updateReadingStats, getChapterNotes, saveChapterNote, deleteChapterNote } from '../services/storage';
import { ChapterNote } from '../types/manga';
import { useToast } from '../contexts/ToastContext';
import { KeyboardShortcutsModal } from '../components/KeyboardShortcutsModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Settings, 
  Maximize, Minimize, Loader2, ScrollText, FileText, LayoutGrid, 
  ZoomIn, ZoomOut, RotateCcw, Keyboard, ChevronUp, ChevronDown, List, 
  MessageSquare, Home, Pencil, Play, Pause, Eye, Sun, Moon,
  Scaling, Maximize2, SkipBack, SkipForward, Sliders, X, Check, StickyNote, Trash2,
  AlertCircle, RefreshCw
} from 'lucide-react';

export const ReaderPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showChrome, setShowChrome] = useState(true);
  const [settings, setSettings] = useState(getReaderSettings());
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showChapterListModal, setShowChapterListModal] = useState(false);

  // Chapter Notes state
  const [showNotesModal, setShowNotesModal] = useState(false);
  useBodyScrollLock(showSettingsDrawer || showChapterListModal || showNotesModal);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [chapterNotes, setChapterNotes] = useState<ChapterNote[]>([]);

  // Chapter navigation states
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [prevChapter, setPrevChapter] = useState<{ id: string | number; name: string; chapterNumber?: number } | null>(null);
  const [nextChapter, setNextChapter] = useState<{ id: string | number; name: string; chapterNumber?: number } | null>(null);

  // Auto-scroll state
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(2);

  // Reading Color Tint Filter
  const [colorFilter, setColorFilter] = useState<'normal' | 'sepia' | 'dark' | 'invert'>('normal');

  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollLock = useRef(true);
  const initialStartPageRef = useRef(1);

  const lastTapRef = useRef<number>(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(panOffset);
  panRef.current = panOffset;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const prevZoomRef = useRef(zoom);

  // Synchronize scroll position when zoom changes in webtoon mode so view doesn't jump to top
  useEffect(() => {
    if (settings.mode === 'webtoon' && prevZoomRef.current !== zoom) {
      const ratio = zoom / prevZoomRef.current;
      if (ratio > 0 && !isNaN(ratio)) {
        const currentWindowScroll = window.scrollY;
        if (currentWindowScroll > 0) {
          window.scrollTo({ top: currentWindowScroll * ratio, behavior: 'instant' as ScrollBehavior });
        }
        if (containerRef.current && containerRef.current.scrollTop > 0) {
          containerRef.current.scrollTop = containerRef.current.scrollTop * ratio;
        }
      }
    }
    prevZoomRef.current = zoom;
  }, [zoom, settings.mode]);

  useEffect(() => {
    let initialDist: number | null = null;
    let initialZoomVal = zoomRef.current;
    let initialPan = { ...panRef.current };
    let initialFocalPoint = { x: 0, y: 0 };
    let singleTouchStart = { x: 0, y: 0 };

    const isUIElement = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      return !!(
        target.closest('header') ||
        target.closest('footer') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('.glass-panel')
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isUIElement(e.target as HTMLElement)) return;
      const isWebtoon = settingsRef.current.mode === 'webtoon';

      if (e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
      } else if (!isWebtoon && zoomRef.current > 100) {
        // Only block single-finger scroll in non-webtoon modes when zoomed
        if (e.cancelable) e.preventDefault();
      }

      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        initialDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        initialFocalPoint = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
        initialZoomVal = zoomRef.current;
        initialPan = { ...panRef.current };
      } else if (e.touches.length === 1) {
        singleTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        initialPan = { ...panRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isUIElement(e.target as HTMLElement)) return;
      const isWebtoon = settingsRef.current.mode === 'webtoon';

      if (e.touches.length === 2 && initialDist !== null && initialDist > 0) {
        if (e.cancelable) e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

        const scaleRatio = dist / initialDist;
        const targetZoom = Math.min(Math.max(Math.round(initialZoomVal * scaleRatio), 100), 300);

        setZoom(targetZoom);
        if (targetZoom === 100) {
          setPanOffset({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1 && zoomRef.current > 100) {
        if (!isWebtoon) {
          // Single / Double mode: 2D touch drag bounded
          if (e.cancelable) e.preventDefault();
          const dx = e.touches[0].clientX - singleTouchStart.x;
          const dy = e.touches[0].clientY - singleTouchStart.y;
          const maxPanX = Math.max(0, (window.innerWidth * (zoomRef.current / 100) - window.innerWidth) / 2);
          const maxPanY = Math.max(0, (window.innerHeight * (zoomRef.current / 100) - window.innerHeight) / 2);
          const clampedX = Math.min(Math.max(initialPan.x + dx, -maxPanX), maxPanX);
          const clampedY = Math.min(Math.max(initialPan.y + dy, -maxPanY), maxPanY);
          setPanOffset({ x: clampedX, y: clampedY });
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        singleTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        initialPan = { ...panRef.current };
        initialDist = null;
      } else if (e.touches.length === 0) {
        initialDist = null;
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const handleDoubleTapZoom = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (zoom > 100) {
        setZoom(100);
        setPanOffset({ x: 0, y: 0 });
        showToast('Reset Zoom', 'info');
      } else {
        setZoom(175);
        showToast('Zoomed 1.75x', 'info');
      }
    }
    lastTapRef.current = now;
  };

  const [chapterDetails, setChapterDetails] = useState<{
    id: string | number;
    name: string;
    chapterNumber?: number;
    mangaId?: string | number;
    mangaTitle?: string;
    thumbnailUrl?: string;
  } | null>(null);

  // Image preload & chapter load tracking state
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set());

  const handleImageLoad = (index: number) => {
    setLoadedPages(prev => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    if (isInitialScrollLock.current && settings.mode === 'webtoon' && initialStartPageRef.current > 1) {
      const el = document.getElementById(`reader-page-${initialStartPageRef.current}`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  };

  useEffect(() => {
    if (pages.length === 0) return;
    setLoadedPages(new Set());

    let isMounted = true;
    pages.forEach((url, idx) => {
      const img = new Image();
      img.src = url;
      const markLoaded = () => {
        if (isMounted) {
          setLoadedPages(prev => {
            if (prev.has(idx)) return prev;
            const next = new Set(prev);
            next.add(idx);
            return next;
          });
        }
      };
      img.onload = markLoaded;
      img.onerror = markLoaded;
    });

    return () => {
      isMounted = false;
    };
  }, [pages]);

  const isChapterLoaded = pages.length > 0 && loadedPages.size >= pages.length;

  useEffect(() => {
    if (chapterId) {
      loadPages(chapterId);
    }
  }, [chapterId]);

  // Auto scroll effect
  useEffect(() => {
    if (!isAutoScrolling) return;
    const interval = setInterval(() => {
      window.scrollBy({ top: autoScrollSpeed * 1.5, behavior: 'auto' });
    }, 30);
    return () => clearInterval(interval);
  }, [isAutoScrolling, autoScrollSpeed]);

  const [searchParams] = useSearchParams();

  // Continuously sync history progress whenever page changes
  useEffect(() => {
    if (pages.length > 0 && chapterDetails && chapterId) {
      addHistoryItem({
        mangaId: chapterDetails.mangaId || '1',
        mangaTitle: chapterDetails.mangaTitle || 'Manga',
        thumbnailUrl: chapterDetails.thumbnailUrl,
        chapterId: chapterId,
        chapterName: chapterDetails.name || `Chapter ${chapterId}`,
        pageIndex: currentPage,
        totalPages: pages.length,
      });
    }
  }, [currentPage, pages.length, chapterId, chapterDetails]);

  const loadPages = async (id: string) => {
    setLoading(true);
    setShowSettingsDrawer(false);
    setShowChapterListModal(false);
    setLoading(true);
    setLoadedPages(new Set());
    setFailedPages(new Set());
    try {
      const [pageUrls, details] = await Promise.all([
        getChapterPages(id),
        getChapterDetails(id),
      ]);

      const historyItems = getHistory();
      const savedItem = historyItems.find(h => String(h.chapterId) === String(id));
      const urlPage = parseInt(searchParams.get('page') || '0', 10);
      const startPage = urlPage > 0 ? urlPage : (savedItem?.pageIndex || 1);
      
      isInitialScrollLock.current = true;
      initialStartPageRef.current = startPage;
      setCurrentPage(startPage);

      let foundNextPrev = false;
      let mangaGenres: string[] = [];

      if (details) {
        setChapterDetails(details);
        if (details.mangaId) {
          try {
            const mangaData = await getMangaDetails(details.mangaId);
            if (mangaData) {
              // Extract genres for stats tracking
              if (mangaData.genre) {
                mangaGenres = Array.isArray(mangaData.genre)
                  ? mangaData.genre
                  : typeof mangaData.genre === 'string'
                    ? mangaData.genre.split(',').map((g: string) => g.trim()).filter(Boolean)
                    : [];
              }
              if (mangaData.chapters && mangaData.chapters.length > 0) {
                const chaptersList = mangaData.chapters;
                const hasChapterNumbers = chaptersList.some(c => c.chapterNumber !== undefined);
                const sorted = [...chaptersList];
                if (hasChapterNumbers) {
                  sorted.sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
                }
                setAllChapters(sorted);
                const idx = sorted.findIndex(c => String(c.id) === String(id));
                if (idx !== -1) {
                  setPrevChapter(idx > 0 ? sorted[idx - 1] : null);
                  setNextChapter(idx < sorted.length - 1 ? sorted[idx + 1] : null);
                  foundNextPrev = true;
                }
              }
            }
          } catch (err) {
            console.error('Failed to fetch manga chapters:', err);
          }
        }
      }

      // Demo fallback if next/prev chapter not found from server
      if (!foundNextPrev) {
        const numericId = parseInt(id, 10);
        if (!isNaN(numericId)) {
          setPrevChapter(numericId > 1 ? { id: String(numericId - 1), name: `Chapter ${numericId - 1}` } : null);
          setNextChapter({ id: String(numericId + 1), name: `Chapter ${numericId + 1}` });
        } else {
          setPrevChapter(null);
          setNextChapter(null);
        }
      }

      if (pageUrls.length > 0) {
        setPages(pageUrls);
        addHistoryItem({
          mangaId: details?.mangaId || '1',
          mangaTitle: details?.mangaTitle || 'Manga Chapter',
          thumbnailUrl: details?.thumbnailUrl,
          chapterId: id,
          chapterName: details?.name || `Chapter ${id}`,
          pageIndex: startPage,
          totalPages: pageUrls.length,
        });
        updateReadingStats(1, 2, mangaGenres);
        if (details?.mangaId) {
          setChapterNotes(getChapterNotes(details.mangaId));
        }
      } else {
        setPages([]);
      }
    } catch (e) {
      console.error(e);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = () => {
    if (!newNoteInput.trim() || !chapterDetails) return;
    const updated = saveChapterNote({
      mangaId: chapterDetails.mangaId || '1',
      mangaTitle: chapterDetails.mangaTitle || 'Manga',
      chapterId: chapterDetails.id,
      chapterName: chapterDetails.name || 'Chapter',
      pageIndex: currentPage,
      content: newNoteInput.trim(),
    });
    setChapterNotes(updated.filter(n => String(n.mangaId) === String(chapterDetails.mangaId)));
    setNewNoteInput('');
    showToast('Note saved successfully!', 'success');
  };

  const handleDeleteNote = (id: string) => {
    const updated = deleteChapterNote(id);
    if (chapterDetails?.mangaId) {
      setChapterNotes(updated.filter(n => String(n.mangaId) === String(chapterDetails.mangaId)));
    }
    showToast('Note removed', 'info');
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'k':
        case 'K':
          e.preventDefault();
          handlePrevPage();
          break;
        case 'ArrowRight':
        case 'j':
        case 'J':
        case ' ':
          e.preventDefault();
          handleNextPage();
          break;
        case 'ArrowUp':
          e.preventDefault();
          window.scrollBy({ top: -150, behavior: 'smooth' });
          break;
        case 'ArrowDown':
          e.preventDefault();
          window.scrollBy({ top: 150, behavior: 'smooth' });
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          setIsAutoScrolling(prev => !prev);
          break;
        case 'Home':
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setCurrentPage(1);
          break;
        case 'End':
          e.preventDefault();
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          setCurrentPage(pages.length);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom(z => Math.min(200, z + 15));
          break;
        case '-':
          e.preventDefault();
          setZoom(z => Math.max(50, z - 15));
          break;
        case '0':
          e.preventDefault();
          setZoom(100);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          setShowChrome(prev => !prev);
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsModal(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pages, settings.mode]);

  // Scroll listener for Webtoon mode
  const handleScroll = () => {
    if (isInitialScrollLock.current || settings.mode !== 'webtoon' || !containerRef.current || pages.length === 0) return;
    const elements = containerRef.current.querySelectorAll('.reader-page-img');
    const scrollTop = window.scrollY + window.innerHeight / 2;

    elements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + rect.height;
      if (scrollTop >= top && scrollTop <= bottom) {
        setCurrentPage(index + 1);
      }
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [settings.mode, pages]);

  // Synchronize scroll position on initial load / chapter load
  useEffect(() => {
    if (loading || pages.length === 0) return;

    const targetPage = initialStartPageRef.current;

    if (settings.mode === 'webtoon') {
      const scrollToTarget = () => {
        if (targetPage > 1) {
          const el = document.getElementById(`reader-page-${targetPage}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      };

      scrollToTarget();
      const rafId = requestAnimationFrame(() => {
        scrollToTarget();
      });

      const lockTimer = setTimeout(() => {
        isInitialScrollLock.current = false;
      }, 600);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(lockTimer);
      };
    } else {
      isInitialScrollLock.current = false;
    }
  }, [loading, pages.length, chapterId, settings.mode]);

  const handlePrevPage = () => {
    if (settings.mode === 'single' || settings.mode === 'double') {
      const step = settings.mode === 'double' ? 2 : 1;
      setCurrentPage(p => Math.max(1, p - step));
    } else {
      window.scrollBy({ top: -window.innerHeight * 0.7, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (settings.mode === 'single' || settings.mode === 'double') {
      const step = settings.mode === 'double' ? 2 : 1;
      setCurrentPage(p => Math.min(pages.length, p + step));
    } else {
      window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
    }
  };

  const toggleMode = (mode: 'webtoon' | 'single' | 'double') => {
    const updated = saveReaderSettings({ mode });
    setSettings(updated);
  };

  const toggleFitMode = (fitMode: 'width' | 'height' | 'original') => {
    const updated = saveReaderSettings({ fitMode });
    setSettings(updated);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Helper for Reader Color Filters
  const getColorFilterStyle = () => {
    switch (colorFilter) {
      case 'sepia':
        return { filter: 'sepia(0.35) contrast(0.95)' };
      case 'dark':
        return { filter: 'brightness(0.75) contrast(1.1)' };
      case 'invert':
        return { filter: 'invert(0.9) hue-rotate(180deg)' };
      default:
        return {};
    }
  };

  // Helper for image styling in Single & Spread modes
  const getImageStyle = (isSpread = false) => {
    const baseWidth = isSpread ? 'w-1/2' : 'w-full max-w-4xl';
    
    if (settings.fitMode === 'width') {
      return `${baseWidth} h-auto mx-auto object-contain rounded-lg shadow-2xl`;
    } else if (settings.fitMode === 'height') {
      return `max-h-[85vh] w-auto mx-auto object-contain rounded-lg shadow-2xl`;
    } else {
      return `max-h-[88vh] max-w-full w-auto mx-auto object-contain rounded-lg shadow-2xl`;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0D13] flex flex-col items-center justify-center p-6 text-on-surface">
        <div className="flex flex-col items-center gap-3 text-outline">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-sans text-sm font-bold text-on-surface">Loading Chapter Pages...</p>
        </div>
      </main>
    );
  }

  return (
    <main 
      className="relative min-h-screen bg-[#0B0D13] text-on-surface flex flex-col select-none overflow-x-hidden"
      onClick={() => setShowChrome(!showChrome)}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setZoom(prev => Math.min(300, Math.max(50, prev + (e.deltaY < 0 ? 15 : -15))));
        }
      }}
    >
      {/* Sleek Top Header Chrome (Clean 1-Row without duplicate Prev/Next buttons) */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 transform ${
          showChrome ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-panel px-3 py-2 sm:px-6 sm:py-3 border-b border-white/10 shadow-2xl flex items-center justify-between gap-2 h-14 sm:h-16">
          {/* Back button & Chapter Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => {
                if (chapterDetails?.mangaId) {
                  navigate(`/manga/${chapterDetails.mangaId}`);
                } else {
                  navigate(-1);
                }
              }}
              className="w-9 h-9 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center transition-colors shrink-0 border border-white/5"
              title="Back to Manga"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col min-w-0">
              <h1 className="font-display font-bold text-xs sm:text-sm text-on-surface truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                {chapterDetails?.mangaTitle || `Manga Chapter`}
              </h1>
              <div className="flex items-center gap-1.5 font-sans text-[11px] text-outline font-semibold">
                <span className="truncate max-w-[130px] sm:max-w-xs text-primary font-bold">
                  {chapterDetails?.name || `Ch. ${chapterId}`}
                </span>
                <span>•</span>
                <span className="shrink-0">{currentPage}/{pages.length}</span>
                {!isChapterLoaded && pages.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 animate-pulse shrink-0" title="Loading chapter images">
                    <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
                    <span>{loadedPages.size}/{pages.length}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Zoom Bar */}
            <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-xl bg-surface-container-high border border-white/5 text-xs text-on-surface">
              <button
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(50, z - 20)); }}
                className="p-1 hover:text-primary transition-colors font-bold"
                title="Zoom Out (-20%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoom(100); }}
                className="px-1.5 py-0.5 rounded font-mono text-[11px] font-bold text-primary hover:bg-white/10 transition-colors"
                title="Reset Zoom to 100%"
              >
                {zoom}%
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(300, z + 20)); }}
                className="p-1 hover:text-primary transition-colors font-bold"
                title="Zoom In (+20%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chapter List Modal Toggle */}
            {allChapters.length > 0 && (
              <button
                onClick={() => setShowChapterListModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface border border-white/5 transition-all"
                title="Select Chapter"
              >
                <List className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">Chapters</span>
                <ChevronDown className="w-3.5 h-3.5 text-outline" />
              </button>
            )}

            {/* Chapter Notes Trigger */}
            <button
              onClick={() => setShowNotesModal(true)}
              className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-outline hover:text-on-surface transition-all border border-white/5 relative"
              title="Chapter Notes"
            >
              <StickyNote className="w-4 h-4 text-[#9d86e9]" />
              {chapterNotes.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#9d86e9] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {chapterNotes.length}
                </span>
              )}
            </button>

            {/* Reader Settings Drawer Trigger */}
            <button
              onClick={() => setShowSettingsDrawer(true)}
              className={`p-2 rounded-xl transition-all border border-white/5 ${
                showSettingsDrawer 
                  ? 'bg-primary text-on-primary' 
                  : 'bg-surface-container-high hover:bg-surface-bright text-outline hover:text-on-surface'
              }`}
              title="Reader Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Chapter Loading Badge (Small loading circle until whole chapter loads) */}
      {!isChapterLoaded && pages.length > 0 && (
        <div className="fixed top-16 right-4 sm:top-20 sm:right-6 z-40 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131622]/90 backdrop-blur-md border border-primary/30 shadow-2xl text-xs font-semibold text-on-surface">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
            <span>Loading chapter ({loadedPages.size}/{pages.length})</span>
          </div>
        </div>
      )}

      {/* Main Reader View Container (Kagane.to style auto scroll surface) */}
      <div 
        ref={containerRef} 
        className="reader-content flex-1 w-full overflow-auto text-center relative min-h-screen pt-16 pb-24"
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          ...getColorFilterStyle()
        }}
      >
        {settings.mode === 'webtoon' ? (
          /* Webtoon Continuous Strip (Kagane.to style width-based zoom surface) */
          <div 
            className="reader-pages-content flex flex-col items-center mx-auto space-y-2 px-2"
            data-zoom-surface="true"
            style={{
              width: zoom > 100 ? `${zoom}%` : '100%',
              maxWidth: zoom > 100 ? 'none' : '48rem',
              minWidth: '100%',
              lineHeight: 0,
              fontSize: '0px',
              position: 'relative',
            }}
          >
            {pages.map((url, index) => {
              const isLoaded = loadedPages.has(index);
              const isFailed = failedPages.has(index);

              if (isFailed) {
                return (
                  <div 
                    key={index} 
                    id={`reader-page-${index + 1}`}
                    className="w-full min-h-[220px] bg-[#161327] rounded-2xl border border-red-500/20 p-6 flex flex-col items-center justify-center gap-3 my-2 text-center select-none"
                  >
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <div>
                      <p className="text-xs text-white font-semibold">Page {index + 1} Failed to Load</p>
                      <p className="text-[11px] text-[#7c779b]">The page image could not be loaded from source</p>
                    </div>
                    <button
                      onClick={() => {
                        setFailedPages(prev => { const n = new Set(prev); n.delete(index); return n; });
                        setLoadedPages(prev => { const n = new Set(prev); n.delete(index); return n; });
                      }}
                      className="px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Page {index + 1}</span>
                    </button>
                  </div>
                );
              }

              return (
                <div 
                  key={index} 
                  id={`reader-page-${index + 1}`}
                  className="relative w-full reader-page-img bg-[#0B0D13] flex items-center justify-center rounded-xl overflow-hidden group select-none"
                >
                  {!isLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-low/50 border border-white/5 rounded-xl gap-2 z-10" style={{ minHeight: '350px' }}>
                      <Loader2 className="w-7 h-7 animate-spin text-primary/80" />
                      <span className="text-[11px] font-semibold text-outline">Loading Page {index + 1}...</span>
                    </div>
                  )}
                  {/* Invisible Anti-Scraper Transparent Overlay */}
                  <div 
                    className="absolute inset-0 z-15 bg-transparent cursor-default"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onClick={handleDoubleTapZoom}
                  />
                  <img
                    src={url}
                    alt={`Page ${index + 1}`}
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onLoad={() => handleImageLoad(index)}
                    onError={() => {
                      setFailedPages(prev => new Set(prev).add(index));
                      handleImageLoad(index);
                    }}
                    className={`w-full h-auto block object-contain mx-auto transition-opacity duration-300 ${
                      isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        ) : settings.mode === 'double' ? (
          /* Double Page Spread */
          <div className="relative w-full max-w-6xl mx-auto px-4 flex items-center justify-center gap-2 min-h-[85vh] my-auto" style={{
              transform: zoom !== 100 ? `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoom / 100})` : 'none',
              transformOrigin: 'center center',
              willChange: zoom > 100 ? 'transform' : 'auto',
            }}>
            {pages[currentPage - 1] && (
              <div className="relative flex-1 flex items-center justify-center min-h-[400px] select-none">
                {failedPages.has(currentPage - 1) ? (
                  <div className="w-full min-h-[300px] bg-[#161327] rounded-2xl border border-red-500/20 p-6 flex flex-col items-center justify-center gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-xs text-white font-semibold">Page {currentPage} Failed to Load</p>
                    <button
                      onClick={() => {
                        const pIdx = currentPage - 1;
                        setFailedPages(prev => { const n = new Set(prev); n.delete(pIdx); return n; });
                        setLoadedPages(prev => { const n = new Set(prev); n.delete(pIdx); return n; });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {!loadedPages.has(currentPage - 1) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-low/50 border border-white/5 rounded-xl gap-2 z-10">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                        <span className="text-[11px] font-semibold text-outline">Page {currentPage}</span>
                      </div>
                    )}
                    <div 
                      className="absolute inset-0 z-15 bg-transparent cursor-default"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                    <img
                      src={pages[currentPage - 1]}
                      alt={`Page ${currentPage}`}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      onLoad={() => handleImageLoad(currentPage - 1)}
                      onError={() => {
                        setFailedPages(prev => new Set(prev).add(currentPage - 1));
                        handleImageLoad(currentPage - 1);
                      }}
                      className={`${getImageStyle(true)} transition-opacity duration-300 ${
                        loadedPages.has(currentPage - 1) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </>
                )}
              </div>
            )}
            {pages[currentPage] && (
              <div className="relative flex-1 flex items-center justify-center min-h-[400px] select-none">
                {failedPages.has(currentPage) ? (
                  <div className="w-full min-h-[300px] bg-[#161327] rounded-2xl border border-red-500/20 p-6 flex flex-col items-center justify-center gap-3 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="text-xs text-white font-semibold">Page {currentPage + 1} Failed to Load</p>
                    <button
                      onClick={() => {
                        const pIdx = currentPage;
                        setFailedPages(prev => { const n = new Set(prev); n.delete(pIdx); return n; });
                        setLoadedPages(prev => { const n = new Set(prev); n.delete(pIdx); return n; });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-primary/20 text-primary text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {!loadedPages.has(currentPage) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-low/50 border border-white/5 rounded-xl gap-2 z-10">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                        <span className="text-[11px] font-semibold text-outline">Page {currentPage + 1}</span>
                      </div>
                    )}
                    <div 
                      className="absolute inset-0 z-15 bg-transparent cursor-default"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                    <img
                      src={pages[currentPage]}
                      alt={`Page ${currentPage + 1}`}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      onLoad={() => handleImageLoad(currentPage)}
                      onError={() => {
                        setFailedPages(prev => new Set(prev).add(currentPage));
                        handleImageLoad(currentPage);
                      }}
                      className={`${getImageStyle(true)} transition-opacity duration-300 ${
                        loadedPages.has(currentPage) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Single Page View */
          <div className="relative w-full max-w-4xl mx-auto px-4 flex items-center justify-center min-h-[85vh] my-auto" style={{
              transform: zoom !== 100 ? `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoom / 100})` : 'none',
              transformOrigin: 'center center',
              willChange: zoom > 100 ? 'transform' : 'auto',
            }}>
            {pages.length > 0 && (
              <div className="relative w-full flex items-center justify-center min-h-[500px] select-none">
                {failedPages.has(currentPage - 1) ? (
                  <div className="w-full max-w-lg min-h-[350px] bg-[#161327] rounded-2xl border border-red-500/20 p-8 flex flex-col items-center justify-center gap-3 my-auto text-center select-none">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                    <div>
                      <p className="text-sm text-white font-semibold">Page {currentPage} Failed to Load</p>
                      <p className="text-xs text-[#7c779b] mt-1">The image could not be fetched from the source server</p>
                    </div>
                    <button
                      onClick={() => {
                        const pIdx = currentPage - 1;
                        setFailedPages(prev => { const n = new Set(prev); n.delete(pIdx); return n; });
                        setLoadedPages(prev => { const n = new Set(prev); n.delete(pIdx); return n; });
                      }}
                      className="px-4 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer mt-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Retry Page {currentPage}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {!loadedPages.has(currentPage - 1) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-low/50 border border-white/5 rounded-xl gap-2 z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs font-semibold text-outline">Loading Page {currentPage}...</span>
                      </div>
                    )}
                    <div 
                      className="absolute inset-0 z-15 bg-transparent cursor-default"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                    <img
                      src={pages[currentPage - 1]}
                      alt={`Page ${currentPage}`}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      onLoad={() => handleImageLoad(currentPage - 1)}
                      onError={() => {
                        setFailedPages(prev => new Set(prev).add(currentPage - 1));
                        handleImageLoad(currentPage - 1);
                      }}
                      className={`${getImageStyle(false)} transition-opacity duration-300 ${
                        loadedPages.has(currentPage - 1) ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* End of Chapter Navigation Card */}
        <div className="w-full max-w-lg mx-auto my-10 px-4">
          <div className="p-6 rounded-2xl glass-panel border border-white/10 text-center flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center shadow-inner">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-on-surface">End of Chapter</h3>
              <p className="font-sans text-xs text-outline mt-0.5">
                {chapterDetails?.name || `Chapter ${chapterId}`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 w-full mt-3">
              {prevChapter && (
                <button
                  onClick={() => navigate(`/read/${prevChapter.id}`)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-bright border border-white/10 font-bold text-xs text-on-surface flex items-center justify-center gap-1.5 transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-secondary" />
                  <span className="truncate">Prev Chapter</span>
                </button>
              )}

              {nextChapter ? (
                <button
                  onClick={() => navigate(`/read/${nextChapter.id}`)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-primary/25 transition-all"
                >
                  <span className="truncate">Next Chapter</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate(chapterDetails?.mangaId ? `/manga/${chapterDetails.mangaId}` : '/')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-2"
                >
                  Back to Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Reader Scrubber Toolbar Dock (Primary Chapter & Page Controls) */}
      <footer
        className={`fixed bottom-3 left-0 right-0 z-40 px-3 flex justify-center pointer-events-none transition-all duration-300 transform ${
          showChrome ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-auto glass-panel p-2.5 sm:p-3 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] border border-white/15 backdrop-blur-2xl flex flex-col gap-2 w-full max-w-xl">
          {/* Row 1: Scrubber bar with Page Navigation */}
          <div className="flex items-center gap-2">
            {/* Prev Page */}
            <button
              onClick={handlePrevPage}
              className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center transition-colors shrink-0 border border-white/5"
              title="Previous Page (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Slider Track with Current Page Badge */}
            <div className="flex-1 flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-xl border border-white/5">
              <span className="font-sans text-[11px] font-extrabold text-primary shrink-0 min-w-[32px] text-center bg-primary/10 py-0.5 rounded">
                {currentPage}
              </span>
              <input
                type="range"
                min={1}
                max={pages.length || 1}
                value={currentPage}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentPage(val);
                  if (settings.mode === 'webtoon' && containerRef.current) {
                    const imgs = containerRef.current.querySelectorAll('.reader-page-img');
                    if (imgs[val - 1]) {
                      imgs[val - 1].scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
                className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="font-sans text-[11px] font-bold text-outline shrink-0 min-w-[24px] text-center">
                {pages.length}
              </span>
            </div>

            {/* Next Page */}
            <button
              onClick={handleNextPage}
              className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface flex items-center justify-center transition-colors shrink-0 border border-white/5"
              title="Next Page (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Dedicated Chapter Navigation & Tools */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5 w-full">
            {/* Prev Chapter Button */}
            <button
              disabled={!prevChapter}
              onClick={() => prevChapter && navigate(`/read/${prevChapter.id}`)}
              className="px-2 py-1.5 sm:px-3 rounded-xl bg-surface-container-high hover:bg-surface-bright disabled:opacity-30 disabled:pointer-events-none text-[11px] font-bold text-on-surface flex items-center gap-0.5 border border-white/5 transition-all shrink-0 cursor-pointer"
              title={prevChapter ? `Previous Chapter: ${prevChapter.name}` : 'No previous chapter'}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-secondary" />
              <span>Prev</span>
            </button>

            {/* Center Quick Tool Icons (Zoom -, Zoom +, AutoScroll, Settings, Fullscreen) */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Zoom Out */}
              <button
                onClick={() => setZoom(z => Math.max(50, z - 15))}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors shrink-0"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              {/* Zoom In */}
              <button
                onClick={() => setZoom(z => Math.min(200, z + 15))}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors shrink-0"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {/* Auto Scroll Toggle */}
              <button
                onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  isAutoScrolling ? 'bg-primary text-on-primary shadow-md animate-pulse' : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
                }`}
                title="Toggle Auto-Scroll"
              >
                {isAutoScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              {/* Settings Drawer */}
              <button
                onClick={() => setShowSettingsDrawer(true)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors shrink-0"
                title="Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors shrink-0"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Next Chapter Button */}
            <button
              disabled={!nextChapter}
              onClick={() => nextChapter && navigate(`/read/${nextChapter.id}`)}
              className="px-2.5 py-1.5 sm:px-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:pointer-events-none text-[11px] font-extrabold text-on-primary flex items-center gap-0.5 shadow-md shadow-primary/20 transition-all shrink-0 cursor-pointer"
              title={nextChapter ? `Next Chapter: ${nextChapter.name}` : 'No next chapter'}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Settings Drawer Sheet */}
      {showSettingsDrawer && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200" 
          onClick={() => setShowSettingsDrawer(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#131622] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-5 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-base text-on-surface">Reader Settings</h2>
              </div>
              <button 
                onClick={() => setShowSettingsDrawer(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-outline hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reading Mode */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-wider">Reading Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'webtoon', label: 'Webtoon', icon: ScrollText },
                  { id: 'single', label: 'Single', icon: FileText },
                  { id: 'double', label: 'Spread', icon: LayoutGrid },
                ].map(m => {
                  const Icon = m.icon;
                  const active = settings.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMode(m.id as any)}
                      className={`py-2.5 px-3 rounded-xl flex flex-col items-center gap-1.5 font-semibold text-xs transition-all border ${
                        active 
                          ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20' 
                          : 'bg-surface-container-high text-outline hover:text-on-surface border-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-wider">Color Filter</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'normal', label: 'Normal', bg: 'bg-[#181C28] text-white' },
                  { id: 'sepia', label: 'Sepia', bg: 'bg-[#F4ECD8] text-[#5B4636]' },
                  { id: 'dark', label: 'Dark', bg: 'bg-[#000000] text-gray-400' },
                  { id: 'invert', label: 'Invert', bg: 'bg-white text-black' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setColorFilter(f.id as any)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${f.bg} ${
                      colorFilter === f.id ? 'ring-2 ring-primary border-primary scale-105' : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Zoom & Scale Controls */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Zoom & Scale</label>
                <button
                  onClick={() => setZoom(100)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Reset (100%)
                </button>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-outline" />
                <input
                  type="range"
                  min={50}
                  max={300}
                  step={10}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <ZoomIn className="w-4 h-4 text-outline" />
                <span className="font-mono text-xs font-bold text-primary min-w-[36px] text-right">{zoom}%</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[50, 100, 150, 200, 300].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setZoom(pct)}
                    className={`py-1 rounded-lg font-mono text-[11px] font-bold border transition-all ${
                      zoom === pct
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-high text-outline hover:text-on-surface border-white/5'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Image Fit Mode */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-outline uppercase tracking-wider">Image Fit</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'width', label: 'Fit Width' },
                  { id: 'height', label: 'Fit Height' },
                  { id: 'original', label: 'Auto Fit' },
                ].map(fit => (
                  <button
                    key={fit.id}
                    onClick={() => toggleFitMode(fit.id as any)}
                    className={`py-2 px-3 rounded-xl font-semibold text-xs transition-all border ${
                      settings.fitMode === fit.id || (!settings.fitMode && fit.id === 'original')
                        ? 'bg-secondary-container text-on-secondary-container border-secondary shadow-sm'
                        : 'bg-surface-container-high text-outline hover:text-on-surface border-white/5'
                    }`}
                  >
                    {fit.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Scroll */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-outline uppercase tracking-wider">Auto-Scroll</label>
                <button
                  onClick={() => setIsAutoScrolling(!isAutoScrolling)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    isAutoScrolling ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-high text-outline'
                  }`}
                >
                  {isAutoScrolling ? 'Active' : 'Disabled'}
                </button>
              </div>
              {isAutoScrolling && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-outline font-semibold">Speed:</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={autoScrollSpeed}
                    onChange={(e) => setAutoScrollSpeed(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-bold text-primary min-w-[24px]">{autoScrollSpeed}x</span>
                </div>
              )}
            </div>

            {/* Shortcuts button */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setShowSettingsDrawer(false);
                  setShowShortcutsModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-outline hover:text-on-surface text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-white/5"
              >
                <Keyboard className="w-4 h-4 text-primary" />
                <span>Keyboard Shortcuts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter List Modal */}
      {showChapterListModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowChapterListModal(false)}
        >
          <div 
            className="w-full max-w-md max-h-[80vh] bg-[#131622] border border-white/15 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-surface-container-low">
              <div>
                <h2 className="font-display font-bold text-sm text-on-surface">Select Chapter</h2>
                <p className="font-sans text-[11px] text-outline truncate max-w-[240px]">
                  {chapterDetails?.mangaTitle}
                </p>
              </div>
              <button
                onClick={() => setShowChapterListModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-bright flex items-center justify-center text-outline hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-white/5">
              {allChapters.map((ch) => {
                const isCurrent = String(ch.id) === String(chapterId);
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setShowChapterListModal(false);
                      navigate(`/read/${ch.id}`);
                    }}
                    className={`w-full px-4 py-3 rounded-xl flex items-center justify-between text-left transition-all ${
                      isCurrent 
                        ? 'bg-primary/15 border border-primary/40 text-primary font-bold' 
                        : 'hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-semibold truncate">{ch.name || `Chapter ${ch.chapterNumber}`}</span>
                      {ch.uploadDate && (
                        <span className="text-[10px] text-outline font-normal">{new Date(ch.uploadDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chapter Notes Modal */}
      {showNotesModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowNotesModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#161327] border border-[#2b2746] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#2b2746] flex items-center justify-between bg-[#120f23]">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-[#9d86e9]" />
                <h3 className="font-display font-bold text-base text-white">
                  Chapter Notes & Annotations
                </h3>
              </div>
              <button 
                onClick={() => setShowNotesModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#7c779b] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notes List & Input */}
            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {/* Add Note Input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300">
                  Add note for Page {currentPage}:
                </label>
                <textarea
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  placeholder="Write your note or thoughts for this page..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#231f3d] border border-[#2b2746] focus:border-[#9d86e9] text-white text-xs placeholder-[#7c779b] outline-none transition-all resize-none"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={!newNoteInput.trim()}
                  className="self-end px-4 py-2 rounded-xl bg-[#9d86e9] hover:bg-[#8b72e0] disabled:opacity-50 text-white font-bold text-xs transition-colors"
                >
                  Save Note
                </button>
              </div>

              {/* Saved Notes for this manga */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-[#2b2746]">
                <span className="text-xs font-bold text-[#9d86e9]">
                  Saved Notes ({chapterNotes.length})
                </span>
                {chapterNotes.length === 0 ? (
                  <p className="text-xs text-[#7c779b] italic py-2">No notes added yet for this manga.</p>
                ) : (
                  chapterNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-xl bg-[#231f3d]/60 border border-[#2b2746] flex items-start justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] text-[#9d86e9] font-bold">
                          <span>{note.chapterName}</span>
                          <span>•</span>
                          <span>Page {note.pageIndex}</span>
                          <span>•</span>
                          <span className="text-slate-400 font-normal">{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-200 whitespace-pre-wrap">{note.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </main>
  );
};

function getDemoPages(): string[] {
  return [];
}

