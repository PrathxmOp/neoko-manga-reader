import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeDismissOptions {
  onDismiss: () => void;
  enabled?: boolean;
  threshold?: number;
}

export function useSwipeDismiss<T extends HTMLElement = HTMLDivElement>({
  onDismiss,
  enabled = true,
  threshold = 80,
}: SwipeDismissOptions) {
  const ref = useRef<T | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startY = useRef(0);
  const startTime = useRef(0);
  const isInteracting = useRef(false);

  const handleStart = useCallback(
    (clientY: number) => {
      if (!enabled) return;
      isInteracting.current = true;
      startY.current = clientY;
      startTime.current = Date.now();
      setIsDragging(true);
    },
    [enabled]
  );

  const handleMove = useCallback((clientY: number) => {
    if (!isInteracting.current) return;
    const dy = clientY - startY.current;
    // Only drag downwards
    setOffsetY(Math.max(0, dy));
  }, []);

  const handleEnd = useCallback(() => {
    if (!isInteracting.current) return;
    isInteracting.current = false;
    setIsDragging(false);

    const timeTaken = Math.max(1, Date.now() - startTime.current);
    const velocity = offsetY / timeTaken;

    if (offsetY >= threshold || velocity > 0.35) {
      onDismiss();
    }
    setOffsetY(0);
  }, [offsetY, threshold, onDismiss]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isInteracting.current && e.touches.length === 1) {
        handleMove(e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => handleEnd();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        handleStart(e.clientY);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isInteracting.current) {
        handleMove(e.clientY);
      }
    };

    const onMouseUp = () => handleEnd();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
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
  }, [enabled, handleStart, handleMove, handleEnd]);

  return {
    ref,
    offsetY,
    isDragging,
  };
}
