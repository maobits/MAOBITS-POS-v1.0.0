import { useColorScheme } from 'react-native';
import { tokens } from './tokens';
import { usePreferencesStore } from '@/stores/preferences';

export function useAppTheme() {
  const system = useColorScheme();
  const mode = usePreferencesStore((s) => s.theme);
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');

  return {
    dark,
    colors: {
      background: dark ? '#09111F' : tokens.colors.slate50,
      elevated: dark ? '#101C2E' : tokens.colors.white,
      surface: dark ? '#111F33' : tokens.colors.white,
      surfaceAlt: dark ? '#16263D' : tokens.colors.slate100,
      text: dark ? '#F8FAFC' : tokens.colors.slate800,
      heading: dark ? '#FFFFFF' : tokens.colors.slate900,
      muted: dark ? '#9FB0C7' : tokens.colors.slate500,
      subtle: dark ? '#6E839F' : tokens.colors.slate400,
      border: dark ? '#243A57' : tokens.colors.slate200,
      borderStrong: dark ? '#36516F' : tokens.colors.slate300,
      primary: tokens.colors.indigo600,
      primarySoft: dark ? '#25255D' : tokens.colors.indigo50,
      primaryText: dark ? '#C7D2FE' : tokens.colors.indigo700,
      accent: tokens.colors.cyan500,
      success: tokens.colors.emerald500,
      successSoft: dark ? '#12382E' : tokens.colors.emerald50,
      warning: tokens.colors.amber500,
      warningSoft: dark ? '#3A2B10' : tokens.colors.amber50,
      danger: tokens.colors.rose500,
      dangerSoft: dark ? '#431A28' : tokens.colors.rose50,
      overlay: 'rgba(15,23,42,0.55)',
    },
    tokens,
  };
}
