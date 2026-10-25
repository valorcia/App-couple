/**
 * Mode démo : l'application tourne sans serveur, avec une API simulée dans le navigateur
 * et des données fictives stockées en local. Jamais de données réelles, jamais de réseau.
 * Désactivable au build avec NEXT_PUBLIC_DEMO_MODE=off (obligatoire en production publique).
 */
export const DEMO_FLAG_KEY = 'en_demo';
export const DEMO_STATE_KEY = 'en_demo_state';

export function demoAvailable(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'off';
}

export function isDemo(): boolean {
  if (!demoAvailable() || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function enterDemo(): void {
  try {
    window.localStorage.setItem(DEMO_FLAG_KEY, '1');
  } catch {
    /* stockage indisponible : la démo ne survivra pas au rechargement, mais fonctionne */
  }
}

export function exitDemo(): void {
  try {
    window.localStorage.removeItem(DEMO_FLAG_KEY);
    window.localStorage.removeItem(DEMO_STATE_KEY);
  } catch {
    /* ignore */
  }
}
