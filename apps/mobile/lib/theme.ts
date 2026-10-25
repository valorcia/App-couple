import { useColorScheme } from 'react-native';

/** Tokens identiques au design system web (docs/DESIGN_SYSTEM.md). */
export interface Theme {
  bg: string; bgElevated: string; bgMuted: string; bgBlush: string; fg: string; fgMuted: string; fgSubtle: string; border: string;
  primary: string; primaryFg: string; secondary: string; secondaryFg: string; accent: string; accentFg: string; danger: string; success: string;
}

export const palette: { light: Theme; dark: Theme } = {
  light: {
    bg: '#F8F3EC', bgElevated: '#FFFDF9', bgMuted: '#F1E9DF', bgBlush: '#F6E4E1',
    fg: '#2B2A2E', fgMuted: '#6B6670', fgSubtle: '#978F9B', border: '#EADFD3',
    primary: '#E0705A', primaryFg: '#FFFFFF', secondary: '#4A2A4F', secondaryFg: '#FFFFFF',
    accent: '#E9D7B4', accentFg: '#5A4523', danger: '#C4453C', success: '#3F8F6B',
  },
  dark: {
    bg: '#1A191C', bgElevated: '#242328', bgMuted: '#2D2B31', bgBlush: '#3A2D31',
    fg: '#F3EDE4', fgMuted: '#B3ABB0', fgSubtle: '#837B82', border: '#35323A',
    primary: '#F08A74', primaryFg: '#1A191C', secondary: '#D9C2DB', secondaryFg: '#1A191C',
    accent: '#8A7249', accentFg: '#F6ECD6', danger: '#E2655C', success: '#5FB08A',
  },
};
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const spacing = (n: number) => n * 4;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? palette.dark : palette.light;
}
