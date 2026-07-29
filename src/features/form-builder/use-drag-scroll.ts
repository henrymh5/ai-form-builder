"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Pointer distance (px) after which a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

interface DragScrollResult<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  /** True while the pointer is actively dragging the strip — use it to suppress the click that follows. */
  isDragging: boolean;
  /** True once the content overflows, so the caller can switch on grab affordances. */
  isScrollable: boolean;
  /** True when scrolled fully left / fully right — used to hide the corresponding edge fade. */
  atStart: boolean;
  atEnd: boolean;
  onPointerDown: (event: React.PointerEvent<T>) => void;
}

/**
 * Makes a horizontally overflowing strip draggable with the pointer.
 *
 * Only engages once the content actually overflows, so short tab lists keep plain click
 * behaviour. Clicks are preserved: the drag only starts after {@link DRAG_THRESHOLD} px of
 * movement, and `isDragging` lets the caller swallow the trailing click of a real drag.
 */
export function useDragScroll<T extends HTMLElement>(): DragScrollResult<T> {
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  // Tracks the in-flight gesture without re-rendering on every pointer move.
  const gesture = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(
    null,
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const maxScroll = element.scrollWidth - element.clientWidth;
      setIsScrollable(maxScroll > 1);
      setEdges({
        atStart: element.scrollLeft <= 1,
        // 1px slack absorbs sub-pixel rounding at the far end.
        atEnd: element.scrollLeft >= maxScroll - 1,
      });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    // Adding/removing/renaming pages changes the content width without resizing the strip.
    const mutations = new MutationObserver(update);
    mutations.observe(element, { childList: true, subtree: true, characterData: true });
    element.addEventListener("scroll", update, { passive: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, []);

  const onPointerDown = useCallback((event: React.PointerEvent<T>) => {
    const element = ref.current;
    if (!element) return;
    // Left button only, and never hijack a dnd-kit drag handle or a nested control's own gesture.
    if (event.button !== 0) return;
    if (element.scrollWidth <= element.clientWidth + 1) return;

    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: element.scrollLeft,
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMove = (event: PointerEvent) => {
      const active = gesture.current;
      if (!active || active.pointerId !== event.pointerId) return;

      const delta = event.clientX - active.startX;
      if (!isDragging && Math.abs(delta) < DRAG_THRESHOLD) return;

      if (!isDragging) setIsDragging(true);
      element.scrollLeft = active.startScrollLeft - delta;
    };

    const handleUp = (event: PointerEvent) => {
      const active = gesture.current;
      if (!active || active.pointerId !== event.pointerId) return;
      gesture.current = null;
      // Cleared on the next frame so the click handler fired by this pointer-up still sees the drag.
      if (isDragging) requestAnimationFrame(() => setIsDragging(false));
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isDragging]);

  return {
    ref,
    isDragging,
    isScrollable,
    atStart: edges.atStart,
    atEnd: edges.atEnd,
    onPointerDown,
  };
}
