import { useState, useRef, useCallback, useEffect } from 'react';

interface SwipeDismissOptions {
  onDismiss: () => void;
  enabled?: boolean;
  threshold?: number;
}

function findScrollableParent(target: HTMLElement | null, boundary: HTMLElement): HTMLElement | null {
  let curr = target;
  while (curr && curr !== boundary) {
    if (curr.getAttribute && curr.getAttribute('data-scroll-container') !== null) {
      return curr;
    }
    const style = window.getComputedStyle(curr);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && curr.scrollHeight > curr.clientHeight) {
      return curr;
    }
    curr = curr.parentElement;
  }
  return null;
}

export function useSwipeDismiss<T extends HTMLElement = HTMLDivElement>({
  onDismiss,
  enabled = true,
  threshold = 100,
}: SwipeDismissOptions) {
  const ref = useRef<T | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startY = useRef(0);
  const startTime = useRef(0);
  const isInteracting = useRef(false);
  const activeScrollEl = useRef<HTMLElement | null>(null);
  const wasScrolledDuringTouch = useRef(false);

  const handleStart = useCallback(
    (clientY: number, target: HTMLElement | null) => {
      if (!enabled || !ref.current) return;

      const scrollEl = findScrollableParent(target, ref.current);
      activeScrollEl.current = scrollEl;
      wasScrolledDuringTouch.current = false;

      // If touch started inside a scrollable container that is currently scrolled down (scrollTop > 0),
      // DO NOT initiate modal dismiss at all!
      if (scrollEl && scrollEl.scrollTop > 0) {
        isInteracting.current = false;
        return;
      }

      isInteracting.current = true;
      startY.current = clientY;
      startTime.current = Date.now();
      setIsDragging(true);
    },
    [enabled]
  );

  const handleMove = useCallback((clientY: number) => {
    if (!isInteracting.current) return;

    // Check if the scrollable child is currently scrolled or scrolling
    if (activeScrollEl.current) {
      if (activeScrollEl.current.scrollTop > 0) {
        wasScrolledDuringTouch.current = true;
        isInteracting.current = false;
        setIsDragging(false);
        setOffsetY(0);
        return;
      }
    }

    if (wasScrolledDuringTouch.current) {
      setOffsetY(0);
      return;
    }

    const dy = clientY - startY.current;
    // Only drag downwards
    setOffsetY(Math.max(0, dy));
  }, []);

  const handleEnd = useCallback(() => {
    if (!isInteracting.current) {
      setOffsetY(0);
      setIsDragging(false);
      return;
    }
    isInteracting.current = false;
    setIsDragging(false);

    if (wasScrolledDuringTouch.current) {
      setOffsetY(0);
      return;
    }

    const timeTaken = Math.max(1, Date.now() - startTime.current);
    const velocity = offsetY / timeTaken;

    if (offsetY >= threshold || velocity > 0.45) {
      onDismiss();
    }
    setOffsetY(0);
  }, [offsetY, threshold, onDismiss]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientY, e.target as HTMLElement);
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
        handleStart(e.clientY, e.target as HTMLElement);
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
