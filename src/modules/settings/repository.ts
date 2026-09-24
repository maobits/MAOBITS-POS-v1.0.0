import { getDb, type Db } from '@/core/database';
import type { AppSettings, Currency, Locale, ThemeMode } from '@/core/types';
import { nowIso } from '@/shared/id';

export const settingsRepository = {
  async get(key: string, db?: Db) {
    const d = db ?? await getDb();
    const row = await d.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key=?',
      key,
    );
    return row?.value ?? null;
  },

  async set(key: string, value: string, db?: Db) {
    const d = db ?? await getDb();
    await d.runAsync(
      `INSERT INTO settings(key,value,updated_at) VALUES(?,?,?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
      key,
      value,
      nowIso(),
    );
  },

  async load(): Promise<AppSettings> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key,value FROM settings',
    );
    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      businessName: map.business_name ?? 'MAOBITS POS',
      businessLogoUri: map.business_logo_uri || null,
      currency: (map.currency ?? 'COP') as Currency,
      locale: (map.locale ?? 'es') as Locale,
      theme: (map.theme ?? 'system') as ThemeMode,
      configured: map.configured === '1',
    };
  },
};
