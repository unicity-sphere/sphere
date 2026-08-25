/**
 * framer-motion replaced by plain elements, so the only thing driving a test is
 * its own fake timers. The real frame loop captures the timer environment it
 * first sees, and re-installing fake timers per test leaves it driving nothing —
 * step transitions then stall part-way through a suite.
 *
 * Nothing under test depends on the animation itself: components are armed by
 * MOUNT, which this preserves.
 */
import type React from 'react';

const MOTION_ONLY = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants', 'layout', 'layoutId', 'drag',
  'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'onAnimationComplete',
]);

export async function framerMotionStub(): Promise<{
  motion: Record<string, React.ElementType>;
  AnimatePresence: React.ElementType;
}> {
  const react = await import('react');
  const cache = new Map<string, React.ElementType>();
  const strip = (props: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(props).filter(([key]) => !MOTION_ONLY.has(key)));
  const motion = new Proxy({} as Record<string, React.ElementType>, {
    get(_target, tag) {
      if (typeof tag !== 'string') return undefined;
      if (!cache.has(tag)) {
        // Cached per tag: a fresh identity on every read would remount the whole
        // subtree each render (and re-arm anything keyed off mount, forever).
        const Component = ({
          children,
          ...props
        }: Record<string, unknown> & { children?: React.ReactNode }): React.ReactElement =>
          react.createElement(tag, strip(props), children);
        Component.displayName = `motion.${tag}`;
        cache.set(tag, Component);
      }
      return cache.get(tag);
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      react.createElement(react.Fragment, null, children),
  };
}
