import { create } from 'zustand';
import type { Currency, Locale, ThemeMode } from '@/core/types';
interface PreferencesState {
    locale: Locale;
    currency: Currency;
    theme: ThemeMode;
    setLocale(v: Locale): void;
    setCurrency(v: Currency): void;
    setTheme(v: ThemeMode): void;
}
export const usePreferencesStore = create<PreferencesState>(set => ({
    locale: 'es', currency: 'COP', theme: 'system',
    setLocale: locale => set({ locale }), setCurrency: currency => set({ currency }), setTheme: theme => set({ theme }),
}));

