import { getDb } from '@/core/database';
import { AppError } from '@/core/errors';
import { hashPin, newSalt, verifyPin } from '@/core/security/pin';
import { LEGACY_V1_PIN_SALT_MARKER } from '@/core/database/migrations/legacy-v1';
import type { SessionUser } from '@/core/types';
import { roleRepository } from '@/modules/roles/repository';
import { nowIso } from '@/shared/id';
import { authRepository } from './repository';

async function upgradeLegacyPinIfNeeded(
  userId: string,
  pin: string,
  pinSalt: string,
): Promise<void> {
  if (pinSalt !== LEGACY_V1_PIN_SALT_MARKER) return;
  const salt = await newSalt();
  const hash = await hashPin(pin, salt);
  const db = await getDb();
  await db.runAsync(
    `UPDATE users
     SET pin_salt=?,pin_hash=?,updated_at=?
     WHERE id=? AND pin_salt=?`,
    salt,
    hash,
    nowIso(),
    userId,
    LEGACY_V1_PIN_SALT_MARKER,
  );
}

export const authService = {
  users: authRepository.users,

  async login(userId: string, pin: string): Promise<SessionUser> {
    const user = await authRepository.user(userId);
    if (!user || !(await verifyPin(pin, user.pin_salt, user.pin_hash))) {
      throw new AppError('errors.invalidPin');
    }
    await upgradeLegacyPinIfNeeded(user.id, pin, user.pin_salt);
    const permissions = await roleRepository.permissions(user.role_id);
    return {
      id: user.id,
      name: user.name,
      avatarUri: user.avatar_uri,
      roleId: user.role_id,
      roleName: user.role_name,
      permissions,
    };
  },

  async authorizeAdministrator(pin: string) {
    if (!/^\d{4}$/.test(pin)) throw new AppError('errors.invalidPin');
    const db = await getDb();
    const admins = await db.getAllAsync<{
      id: string;
      name: string;
      pin_salt: string;
      pin_hash: string;
    }>(
      `SELECT u.id,u.name,u.pin_salt,u.pin_hash
       FROM users u
       JOIN roles r ON r.id=u.role_id
       WHERE u.active=1
         AND r.is_system=1
         AND EXISTS (
           SELECT 1 FROM role_permissions rp
           WHERE rp.role_id=r.id AND rp.permission_code='SALES_VOID'
         )
         AND EXISTS (
           SELECT 1 FROM role_permissions rp
           WHERE rp.role_id=r.id AND rp.permission_code='USERS_MANAGE'
         )
       ORDER BY u.created_at`,
    );

    for (const admin of admins) {
      if (await verifyPin(pin, admin.pin_salt, admin.pin_hash)) {
        await upgradeLegacyPinIfNeeded(admin.id, pin, admin.pin_salt);
        return { id: admin.id, name: admin.name };
      }
    }
    throw new AppError('errors.invalidPin');
  },
};
