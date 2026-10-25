import { useColorScheme } from 'react-native';

/** Tokens identiques au design system web (docs/DESIGN_SYSTEM.md). */
export interface Theme {
  bg: string; bgElevated: string; bgMuted: string; bgBlush: string; bgHoney: string; night: string; nightFg: string; fg: string; fgMuted: string; fgSubtle: string; border: string;
  primary: string; primaryFg: string; secondary: string; secondaryFg: string; accent: string; accentFg: string; honey: string; sage: string; danger: string; success: string;
}

export const palette: { light: Theme; dark: Theme } = {
  // « Un soir d'hiver à deux » : lumière chaude et basse (clair), veilleuse brun-prune (sombre).
  light: {
    bg: '#F8F1E7', bgElevated: '#FFFAF3', bgMuted: '#F1E6D8', bgBlush: '#F7E3DC', bgHoney: '#F6E8C9', night: '#2F1D33', nightFg: '#F7ECE4',
    fg: '#2D2530', fgMuted: '#6C6168', fgSubtle: '#9A8F95', border: '#EAD9C8',
    primary: '#D8664D', primaryFg: '#FFFFFF', secondary: '#4B2A46', secondaryFg: '#FFFFFF',
    accent: '#ECD9B4', accentFg: '#5A4523', honey: '#D9A441', sage: '#6E9B7F', danger: '#C4453C', success: '#3F8F6B',
  },
  dark: {
    bg: '#1C1519', bgElevated: '#261D23', bgMuted: '#30262E', bgBlush: '#3B2A32', bgHoney: '#3A2F22', night: '#16101A', nightFg: '#F7ECE4',
    fg: '#F5ECE2', fgMuted: '#B9ADB3', fgSubtle: '#87797F', border: '#3A2D36',
    primary: '#F08F78', primaryFg: '#1C1519', secondary: '#DDC3DD', secondaryFg: '#1C1519',
    accent: '#8F7449', accentFg: '#F8ECD6', honey: '#E3B35C', sage: '#7FB391', danger: '#E2655C', success: '#5FB08A',
  },
};
export const radius = { sm: 12, md: 18, lg: 28, pill: 999 } as const;
/** Ombre colorée douce (iOS) + élévation (Android). */
export const shadow = { shadowColor: '#4B2A46', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 } as const;
export const spacing = (n: number) => n * 4;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}
