import { getDb } from '@/core/database';
import { AppError } from '@/core/errors';
import {
  persistLocalMedia,
  removeLocalMedia,
} from '@/core/media/files';
import {
  hashPin,
  newSalt,
} from '@/core/security/pin';
import { permissionService } from '@/modules/roles/service';
import {
  uid,
  nowIso,
} from '@/shared/id';

export interface UserAdminRow {
  id: string;
  name: string;
  role_id: string;
  role_name: string;
  avatar_uri: string | null;
  active: number;
  created_at: string;
}

export const userService = {
  async list(actorId: string) {
    await permissionService.require(
      actorId,
      'USERS_MANAGE',
    );

    const db = await getDb();

    return db.getAllAsync<UserAdminRow>(
      `SELECT
         u.id,
         u.name,
         u.role_id,
         r.name role_name,
         u.avatar_uri,
         u.active,
         u.created_at
       FROM users u
       JOIN roles r
         ON r.id=u.role_id
       ORDER BY u.name COLLATE NOCASE`,
    );
  },

  async create(
    actorId: string,
    input: {
      name: string;
      roleId: string;
      pin: string;
    },
  ) {
    await permissionService.require(
      actorId,
      'USERS_MANAGE',
    );

    if (!input.name.trim()) {
      throw new AppError(
        'errors.validation',
      );
    }

    const db = await getDb();
    const salt = await newSalt();
    const hash = await hashPin(
      input.pin,
      salt,
    );
    const id = uid('usr');
    const stamp = nowIso();

    await db.runAsync(
      `INSERT INTO users(
        id,name,role_id,pin_salt,pin_hash,
        active,created_at,updated_at
      ) VALUES(?,?,?,?,?,1,?,?)`,
      id,
      input.name.trim(),
      input.roleId,
      salt,
      hash,
      stamp,
      stamp,
    );

    return id;
  },

  async update(
    actorId: string,
    userId: string,
    input: {
      name: string;
      roleId: string;
    },
  ) {
    await permissionService.require(
      actorId,
      'USERS_MANAGE',
    );

    if (!input.name.trim()) {
      throw new AppError(
        'errors.validation',
      );
    }

    const db = await getDb();

    await db.runAsync(
      `UPDATE users
       SET name=?,
           role_id=?,
           updated_at=?
       WHERE id=?`,
      input.name.trim(),
      input.roleId,
      nowIso(),
      userId,
    );
  },

  async setAvatar(
    actorId: string,
    userId: string,
    sourceUri: string | null,
  ) {
    await permissionService.require(
      actorId,
      'USERS_MANAGE',
    );

    const db = await getDb();

    const current =
      await db.getFirstAsync<{
        avatar_uri: string | null;
      }>(
        `SELECT avatar_uri
         FROM users
         WHERE id=?`,
        userId,
      );

    if (!current) {
      throw new AppError(
        'errors.notFound',
      );
    }

    if (!sourceUri) {
      await db.runAsync(
        `UPDATE users
         SET avatar_uri=NULL,
             updated_at=?
         WHERE id=?`,
        nowIso(),
        userId,
      );

      if (current.avatar_uri) {
        await removeLocalMedia(
          current.avatar_uri,
        );
      }

      return null;
    }

    const nextUri =
      await persistLocalMedia(
        sourceUri,
        'users',
      );

    try {
      await db.runAsync(
        `UPDATE users
         SET avatar_uri=?,
             updated_at=?
         WHERE id=?`,
        nextUri,
        nowIso(),
        userId,
      );
    } catch (error) {
      await removeLocalMedia(
        nextUri,
      );
      throw error;
    }

    if (
      current.avatar_uri &&
      current.avatar_uri !==
        nextUri
    ) {
      await removeLocalMedia(
        current.avatar_uri,
      );
    }

    return nextUri;
  },

  async setActive(
    actorId: string,
    userId: string,
    active: boolean,
  ) {
    await permissionService.require(
      actorId,
      'USERS_MANAGE',
    );

    if (
      actorId === userId &&
      !active
    ) {
      throw new AppError(
        'errors.validation',
      );
    }

    const db = await getDb();

    await db.runAsync(
      `UPDATE users
       SET active=?,
           updated_at=?
       WHERE id=?`,
      active ? 1 : 0,
      nowIso(),
      userId,
    );
  },

  async resetPin(
    actorId: string,
    userId: string,
    pin: string,
  ) {
    await permissionService.require(
      actorId,
      'USERS_MANAGE',
    );

    const salt = await newSalt();
    const hash = await hashPin(
      pin,
      salt,
    );
    const db = await getDb();

    await db.runAsync(
      `UPDATE users
       SET pin_salt=?,
           pin_hash=?,
           updated_at=?
       WHERE id=?`,
      salt,
      hash,
      nowIso(),
      userId,
    );
  },
};
