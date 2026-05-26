import { useEffect } from 'react';

export function UxfThemeInitializer() {
  useEffect(() => {
    document.documentElement.classList.add('uxf');
    return () => {
      document.documentElement.classList.remove('uxf');
    };
  }, []);
  return null;
}
