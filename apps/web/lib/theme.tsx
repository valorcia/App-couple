'use client';
import * as React from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'en_theme';

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

export function useTheme() {
  const [pref, setPref] = React.useState<ThemePref>('system');
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as ThemePref | null;
      if (saved) {
        setPref(saved);
        applyTheme(saved);
      }
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const update = React.useCallback((p: ThemePref) => {
    setPref(p);
    applyTheme(p);
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* ignore */
    }
  }, []);
  return [pref, update] as const;
}

/** Script inline exécuté avant le rendu pour éviter le flash de thème. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;
