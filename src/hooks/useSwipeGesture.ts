import { useRef, useEffect, useState, useCallback } from 'react';

export interface SwipeConfig {
  threshold?: number; // Minimum distance in px to register a swipe (default: 50)
  velocityThreshold?: number; // Minimum speed in px/ms to register a flick (default: 0.3)
  preventScroll?: boolean; // Whether to call preventDefault during drag
  direction?: 'horizontal' | 'vertical' | 'both';
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: (deltaX: number, deltaY: number, swiped: boolean) => void;
}

export function useSwipeGesture<T extends HTMLElement = HTMLDivElement>(config: SwipeConfig = {}) {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    direction = 'both',
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onDragMove,
    onDragEnd,
  } = config;

  const ref = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deltaX, setDeltaX] = useState(0);
  const [deltaY, setDeltaY] = useState(0);

  const startPos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const isInteracting = useRef(false);

  // Store active callbacks in ref to avoid re-binding event listeners on callback change
  const callbacksRef = useRef({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onDragMove,
    onDragEnd,
  });

  useEffect(() => {
    callbacksRef.current = {
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onDragMove,
      onDragEnd,
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDragMove, onDragEnd]);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    isInteracting.current = true;
    startPos.current = { x: clientX, y: clientY, time: Date.now() };
    setIsDragging(true);
    setDeltaX(0);
    setDeltaY(0);
  }, []);

  const handleMove = useCallback(
    (clientX: number, clientY: number, e?: Event) => {
      if (!isInteracting.current) return;

      const dX = clientX - startPos.current.x;
      const dY = clientY - startPos.current.y;

      // Filter based on lock direction if needed
      let activeX = dX;
      let activeY = dY;

      if (direction === 'horizontal') activeY = 0;
      if (direction === 'vertical') activeX = 0;

      if (preventScroll && e && e.cancelable) {
        if (direction === 'horizontal' && Math.abs(dX) > Math.abs(dY)) {
          e.preventDefault();
        } else if (direction === 'vertical' && Math.abs(dY) > Math.abs(dX)) {
          e.preventDefault();
        } else if (direction === 'both') {
          e.preventDefault();
        }
      }

      setDeltaX(activeX);
      setDeltaY(activeY);
      if (callbacksRef.current.onDragMove) {
        callbacksRef.current.onDragMove(activeX, activeY);
      }
    },
    [direction, preventScroll]
  );

  const handleEnd = useCallback(() => {
    if (!isInteracting.current) return;
    isInteracting.current = false;
    setIsDragging(false);

    const timeTaken = Math.max(1, Date.now() - startPos.current.time);
    const vx = Math.abs(deltaX) / timeTaken;
    const vy = Math.abs(deltaY) / timeTaken;

    let swiped = false;

    if (direction !== 'vertical' && (Math.abs(deltaX) >= threshold || vx >= velocityThreshold)) {
      if (deltaX < 0 && callbacksRef.current.onSwipeLeft) {
        callbacksRef.current.onSwipeLeft();
        swiped = true;
      } else if (deltaX > 0 && callbacksRef.current.onSwipeRight) {
        callbacksRef.current.onSwipeRight();
        swiped = true;
      }
    }

    if (!swiped && direction !== 'horizontal' && (Math.abs(deltaY) >= threshold || vy >= velocityThreshold)) {
      if (deltaY < 0 && callbacksRef.current.onSwipeUp) {
        callbacksRef.current.onSwipeUp();
        swiped = true;
      } else if (deltaY > 0 && callbacksRef.current.onSwipeDown) {
        callbacksRef.current.onSwipeDown();
        swiped = true;
      }
    }

    if (callbacksRef.current.onDragEnd) {
      callbacksRef.current.onDragEnd(deltaX, deltaY, swiped);
    }

    setDeltaX(0);
    setDeltaY(0);
  }, [deltaX, deltaY, direction, threshold, velocityThreshold]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }
    };

    const onTouchEnd = () => handleEnd();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only primary left click
      handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY, e);

    const onMouseUp = () => handleEnd();

    el.addEventListener('touchstart', onTouchStart, { passive: !preventScroll });
    el.addEventListener('touchmove', onTouchMove, { passive: !preventScroll });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);

      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleStart, handleMove, handleEnd, preventScroll]);

  return {
    ref,
    isDragging,
    deltaX,
    deltaY,
  };
}
