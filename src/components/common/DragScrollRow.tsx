import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DragScrollRowProps {
  /**
   * Row items. Each should carry `shrink-0 snap-start` so it keeps its width
   * and the track settles on a card edge rather than mid-card.
   */
  children: ReactNode;
  /**
   * Names the row in the scroll buttons' accessible labels, e.g. passing
   * "featured projects" yields "Scroll featured projects right".
   */
  label: string;
  /** Extra classes for the scroll track — hosts differ in vertical padding. */
  trackClassName?: string;
}

/** Width of the fade at an edge that has more content past it. */
const FADE = '3rem';

/**
 * A horizontally scrolling row that reads as one.
 *
 * The bare pattern — `overflow-x-auto` plus `scrollbar-hide` — renders a row
 * of tiles with no scrollbar, no arrows and no half-visible card, which looks
 * exactly like a grid that happens to fit. Nothing tells a viewer that more
 * items are one drag to the right, so they never drag, and everything past
 * the fold is effectively invisible.
 *
 * Three affordances fix that: arrows in whichever direction has more to show,
 * a fade at those same edges, and scroll snapping.
 *
 * The fade is a CSS mask, not a gradient painted in the background colour.
 * A coloured overlay has to know what it sits on, which is wrong the moment
 * the same row appears on a second surface — the desktop's background is not
 * Explore's. A mask fades the content's own alpha and is right on any
 * background.
 */
export function DragScrollRow({ children, label, trackClassName = '' }: DragScrollRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftRef = useRef(0);
  const moved = useRef(false);

  const [overflow, setOverflow] = useState({ left: false, right: false });

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
    // Reset after a tick so onClickCapture can still block the current click.
    setTimeout(() => { moved.current = false; }, 0);
  }, []);

  // Global mouseup prevents a stuck drag when the pointer leaves the window.
  useEffect(() => {
    window.addEventListener('mouseup', stopDrag);
    return () => window.removeEventListener('mouseup', stopDrag);
  }, [stopDrag]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    moved.current = false;
    startX.current = e.pageX;
    scrollLeftRef.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    const walk = (e.pageX - startX.current) * 1.2;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walk;
    if (Math.abs(walk) > 5) moved.current = true;
  }, []);

  const syncOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 1px slack: fractional scroll widths otherwise leave the right arrow
    // showing forever at the end of the track.
    setOverflow({
      left:  el.scrollLeft > 1,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    syncOverflow();
    const el = scrollRef.current;
    if (!el) return;
    // Observes the track AND its content: the row also becomes scrollable
    // when items finish loading, which never resizes the track itself. A
    // window listener would miss both that and the sidebar opening.
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [syncOverflow, children]);

  /**
   * One "page" of scroll is the visible width less a sliver, so a partially
   * seen card stays partially seen instead of jumping out of view.
   */
  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth - 96), behavior: 'smooth' });
  }, []);

  const maskImage = overflow.left || overflow.right
    ? `linear-gradient(to right, transparent 0, #000 ${overflow.left ? FADE : '0px'}, #000 calc(100% - ${overflow.right ? FADE : '0px'}), transparent 100%)`
    : undefined;

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-20 grid place-items-center w-9 h-9 rounded-full ' +
    'bg-white/90 dark:bg-white/12 backdrop-blur border border-neutral-200 dark:border-white/15 ' +
    'text-neutral-700 dark:text-white shadow-lg hover:bg-white dark:hover:bg-white/20 ' +
    'transition-colors cursor-pointer';

  return (
    <div className="relative">
      {/* Real buttons, not decoration: drag-to-scroll is invisible to keyboard
          users and to anyone on a trackpad who never thinks to try it. Each is
          rendered only while there is something in that direction. */}
      {overflow.left && (
        <button
          type="button"
          aria-label={`Scroll ${label} left`}
          onClick={() => scrollByPage(-1)}
          className={`${arrowClass} left-1`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {overflow.right && (
        <button
          type="button"
          aria-label={`Scroll ${label} right`}
          onClick={() => scrollByPage(1)}
          className={`${arrowClass} right-1`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={syncOverflow}
        onDragStart={e => e.preventDefault()}
        onMouseDown={e => { e.preventDefault(); onMouseDown(e); }}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onClickCapture={e => { if (moved.current) { e.preventDefault(); e.stopPropagation(); } }}
        className={`flex gap-4 overflow-x-auto scrollbar-hide select-none snap-x ${trackClassName}`}
        style={{ cursor: 'grab', userSelect: 'none', WebkitMaskImage: maskImage, maskImage }}
      >
        {children}
      </div>
    </div>
  );
}
