import { useEffect, useState } from 'react';
import type { ShardStatus } from '../../modules/network-status/roundStore';

/**
 * Colours for the hand-drawn parts of the network page (canvas, SVG, charts).
 *
 * Each colour has one job:
 * - `activity` (brand orange): a round that carried commitments, and data series.
 * - `good` (brand lime): healthy consensus — a root's signature, a shard keeping up.
 * - `warn` / `bad`: degraded / failed state; always paired with a label or icon.
 * - `ink*` / `grid`: everything else stays neutral.
 */
export interface NetworkPalette {
  readonly activity: string;
  readonly activityGlow: string;
  readonly good: string;
  readonly goodGlow: string;
  readonly warn: string;
  readonly bad: string;
  readonly ink: string;
  readonly inkMuted: string;
  readonly inkFaint: string;
  readonly cellEmpty: string;
  readonly cellEmptyStroke: string;
  readonly grid: string;
}

const DARK: NetworkPalette = {
  activity: '#FF6F00',
  activityGlow: 'rgba(255, 111, 0, 0.55)',
  good: '#A3E635',
  goodGlow: 'rgba(163, 230, 53, 0.5)',
  warn: '#F59E0B',
  bad: '#F87171',
  ink: 'rgba(255, 255, 255, 0.92)',
  inkMuted: 'rgba(255, 255, 255, 0.5)',
  inkFaint: 'rgba(255, 255, 255, 0.28)',
  cellEmpty: 'rgba(255, 255, 255, 0.05)',
  cellEmptyStroke: 'rgba(255, 255, 255, 0.16)',
  grid: 'rgba(255, 255, 255, 0.07)',
};

const LIGHT: NetworkPalette = {
  activity: '#EA580C',
  activityGlow: 'rgba(234, 88, 12, 0.35)',
  good: '#4D7C0F',
  goodGlow: 'rgba(77, 124, 15, 0.3)',
  warn: '#B45309',
  bad: '#DC2626',
  ink: 'rgba(0, 0, 0, 0.88)',
  inkMuted: 'rgba(0, 0, 0, 0.55)',
  inkFaint: 'rgba(0, 0, 0, 0.3)',
  cellEmpty: 'rgba(0, 0, 0, 0.04)',
  cellEmptyStroke: 'rgba(0, 0, 0, 0.18)',
  grid: 'rgba(0, 0, 0, 0.08)',
};

function isDark(): boolean {
  return typeof document === 'undefined' || document.documentElement.classList.contains('dark');
}

/** Follows the `dark` class the theme system toggles on `<html>`. */
export function useNetworkPalette(): NetworkPalette {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}

export function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function statusColor(status: ShardStatus, palette: NetworkPalette): string {
  switch (status) {
    case 'ok':
      return palette.good;
    case 'stale':
      return palette.warn;
    case 'unreachable':
      return palette.bad;
    default:
      return palette.inkFaint;
  }
}
