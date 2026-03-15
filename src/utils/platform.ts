export type Platform = 'web' | 'extension' | 'android';

export function getPlatform(): Platform {
  if (import.meta.env.VITE_PLATFORM === 'extension') return 'extension';
  if ((window as unknown as Record<string, unknown>).Capacitor) return 'android';
  return 'web';
}

export const isExtension = () => getPlatform() === 'extension';
export const isAndroid = () => getPlatform() === 'android';
export const isWeb = () => getPlatform() === 'web';
