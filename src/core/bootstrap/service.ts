import { initDatabase, type Db } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { ADMIN_PERMISSIONS, PERMISSIONS, type PermissionCode } from '@/core/permissions/catalog';
import { hashPin, newSalt } from '@/core/security/pin';
import type { Currency, Locale, ThemeMode } from '@/core/types';
import { settingsRepository } from '@/modules/settings/repository';
import { nowIso, uid } from '@/shared/id';
import { setLocale } from '@/core/i18n';
import { usePreferencesStore } from '@/stores/preferences';

const permissionArea = (code: string) => code.split('_')[0] ?? 'SYSTEM';

async function syncPermissionCatalog(db: Db) {
  for (const code of PERMISSIONS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO permissions(code,area,description) VALUES(?,?,?)',
      code,
      permissionArea(code),
      code,
    );
  }

  const adminRoles = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM roles
     WHERE is_system=1 AND active=1
       AND (name='Administrador' OR id='rol_legacy_admin')`,
  );
  for (const role of adminRoles) {
    for (const code of ADMIN_PERMISSIONS) {
      await db.runAsync(
        'INSERT OR IGNORE INTO role_permissions(role_id,permission_code) VALUES(?,?)',
        role.id,
        code,
      );
    }
  }
}

export async function bootstrapApp() {
  const db = await initDatabase();
  await syncPermissionCatalog(db);
  const settings = await settingsRepository.load();
  setLocale(settings.locale);
  usePreferencesStore.getState().setLocale(settings.locale);
  usePreferencesStore.getState().setCurrency(settings.currency);
  usePreferencesStore.getState().setTheme(settings.theme);
  return settings;
}

export async function configureFirstRun(input: {
  businessName: string;
  currency: Currency;
  locale: Locale;
  theme: ThemeMode;
  adminName: string;
  adminPin: string;
}) {
  await initDatabase();
  const salt = await newSalt();
  const hash = await hashPin(input.adminPin, salt);
  const roleId = uid('rol');
  const userId = uid('usr');
  const stamp = nowIso();

  await inTransaction(async (db) => {
    for (const code of PERMISSIONS) {
      await db.runAsync(
        'INSERT OR IGNORE INTO permissions(code,area,description) VALUES(?,?,?)',
        code,
        permissionArea(code),
        code,
      );
    }
    await db.runAsync(
      'INSERT INTO roles(id,name,is_system,active,created_at,updated_at) VALUES(?,?,1,1,?,?)',
      roleId,
      'Administrador',
      stamp,
      stamp,
    );
    for (const code of ADMIN_PERMISSIONS) {
      await db.runAsync(
        'INSERT INTO role_permissions(role_id,permission_code) VALUES(?,?)',
        roleId,
        code,
      );
    }
    await db.runAsync(
      'INSERT INTO users(id,name,role_id,pin_salt,pin_hash,active,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)',
      userId,
      input.adminName.trim(),
      roleId,
      salt,
      hash,
      stamp,
      stamp,
    );

    const pairs: [string, string][] = [
      ['business_name', input.businessName.trim()],
      ['business_logo_uri', ''],
      ['currency', input.currency],
      ['locale', input.locale],
      ['theme', input.theme],
      ['configured', '1'],
      ['app_version', '1.0.0'],
    ];
    for (const [key, value] of pairs) {
      await settingsRepository.set(key, value, db);
    }
  });
  return userId;
}

export async function ensurePermissionCatalog() {
  const db = await initDatabase();
  await syncPermissionCatalog(db);
}

export type { PermissionCode };
