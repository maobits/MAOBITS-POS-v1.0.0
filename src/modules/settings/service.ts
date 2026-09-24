import { setLocale } from '@/core/i18n';
import type { Currency, Locale, ThemeMode } from '@/core/types';
import { permissionService } from '@/modules/roles/service';
import { persistLocalMedia, readBase64, removeLocalMedia } from '@/core/media/files';
import { settingsRepository } from './repository';
import { usePreferencesStore } from '@/stores/preferences';

function mimeFromUri(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

export const settingsService = {
  load: settingsRepository.load,

  async receiptBranding() {
    const settings = await settingsRepository.load();
    let logoDataUri: string | null = null;
    if (settings.businessLogoUri) {
      try {
        const base64 = await readBase64(settings.businessLogoUri);
        logoDataUri = `data:${mimeFromUri(settings.businessLogoUri)};base64,${base64}`;
      } catch {
        logoDataUri = null;
      }
    }
    return { businessName: settings.businessName, logoDataUri };
  },

  async setLocale(actorId: string, locale: Locale) {
    await permissionService.require(actorId, 'SETTINGS_MANAGE');
    await settingsRepository.set('locale', locale);
    setLocale(locale);
    usePreferencesStore.getState().setLocale(locale);
  },

  async setCurrency(actorId: string, currency: Currency) {
    await permissionService.require(actorId, 'SETTINGS_MANAGE');
    await settingsRepository.set('currency', currency);
    usePreferencesStore.getState().setCurrency(currency);
  },

  async setTheme(actorId: string, theme: ThemeMode) {
    await permissionService.require(actorId, 'SETTINGS_MANAGE');
    await settingsRepository.set('theme', theme);
    usePreferencesStore.getState().setTheme(theme);
  },

  async setBusinessName(actorId: string, name: string) {
    await permissionService.require(actorId, 'SETTINGS_MANAGE');
    await settingsRepository.set('business_name', name.trim());
  },

  async setBusinessLogo(actorId: string, sourceUri: string | null) {
    await permissionService.require(actorId, 'SETTINGS_MANAGE');
    const previous = await settingsRepository.get('business_logo_uri');
    if (!sourceUri) {
      await settingsRepository.set('business_logo_uri', '');
      if (previous) await removeLocalMedia(previous);
      return null;
    }
    const next = await persistLocalMedia(sourceUri, 'branding');
    await settingsRepository.set('business_logo_uri', next);
    if (previous && previous !== next) await removeLocalMedia(previous);
    return next;
  },
};
