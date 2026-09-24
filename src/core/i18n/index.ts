import { I18n } from 'i18n-js';
import { es } from './locales/es';
import { en } from './locales/en';
import type { Locale } from '@/core/types';
import { premiumEs } from './locales/premium.es';
import { premiumEn } from './locales/premium.en';
import { premiumExtraEs } from './locales/premium-extra.es';
import { premiumExtraEn } from './locales/premium-extra.en';
export const i18n = new I18n({ es: { ...es, premium: premiumEs, premiumExtra: premiumExtraEs }, en: { ...en, premium: premiumEn, premiumExtra: premiumExtraEn } });
i18n.enableFallback = true;
i18n.defaultLocale = 'es';
export function setLocale(locale: Locale) { i18n.locale = locale; }
export function t(key: string, options?: Record<string, unknown>): string { return i18n.t(key, options); }

