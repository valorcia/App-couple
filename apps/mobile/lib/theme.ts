import { useColorScheme } from 'react-native';

/** Tokens identiques au design system web (docs/DESIGN_SYSTEM.md). */
export interface Theme {
  bg: string; bgElevated: string; bgMuted: string; bgBlush: string; bgHoney: string; night: string; nightFg: string; fg: string; fgMuted: string; fgSubtle: string; border: string;
  primary: string; primaryFg: string; secondary: string; secondaryFg: string; accent: string; accentFg: string; honey: string; sage: string; danger: string; success: string;
}

export const palette: { light: Theme; dark: Theme } = {
  // « Papier & encre » : magazine chaleureux années 70. Angles droits, ombres dures, aplats.
  light: {
    bg: '#F3E7D3', bgElevated: '#F8EFE0', bgMuted: '#EADBC2', bgBlush: '#EFCFC4', bgHoney: '#F4DC9A', night: '#271922', nightFg: '#F3E7D3',
    fg: '#271922', fgMuted: '#5E4A55', fgSubtle: '#8A7580', border: '#B9A9A0',
    primary: '#E0582B', primaryFg: '#F8EFE0', secondary: '#271922', secondaryFg: '#F3E7D3',
    accent: '#F2BF45', accentFg: '#271922', honey: '#F2BF45', sage: '#6E7F4B', danger: '#B4311C', success: '#4F6A2E',
  },
  dark: {
    bg: '#1D1418', bgElevated: '#241A1F', bgMuted: '#2D2127', bgBlush: '#4A2F36', bgHoney: '#4A3A1C', night: '#120C0F', nightFg: '#F1E4D0',
    fg: '#F1E4D0', fgMuted: '#C2B0B8', fgSubtle: '#8F7D86', border: '#5A4A52',
    primary: '#F08A5A', primaryFg: '#1D1418', secondary: '#F1E4D0', secondaryFg: '#1D1418',
    accent: '#D9A63A', accentFg: '#1D1418', honey: '#D9A63A', sage: '#93A86A', danger: '#E2655C', success: '#93A86A',
  },
};
export const radius = { sm: 3, md: 6, lg: 10, pill: 999 } as const;
/** Ombre colorée douce (iOS) + élévation (Android). */
/** Ombre portée « imprimée » : dure, décalée, couleur encre. */
export const shadow = { shadowColor: '#271922', shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 3, height: 3 }, elevation: 3 } as const;
export const spacing = (n: number) => n * 4;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}
