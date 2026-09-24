import { getDb } from '@/core/database';

export interface UserLoginRow {
  id: string;
  name: string;
  role_id: string;
  role_name: string;
  pin_salt: string;
  pin_hash: string;
  avatar_uri: string | null;
  active: number;
}

export const authRepository = {
  async users() {
    const db = await getDb();

    return db.getAllAsync<{
      id: string;
      name: string;
      role_name: string;
      avatar_uri: string | null;
    }>(
      `SELECT
         u.id,
         u.name,
         r.name role_name,
         u.avatar_uri
       FROM users u
       JOIN roles r
         ON r.id=u.role_id
       WHERE u.active=1
       ORDER BY u.name COLLATE NOCASE`,
    );
  },

  async user(id: string) {
    const db = await getDb();

    return db.getFirstAsync<UserLoginRow>(
      `SELECT
         u.*,
         r.name role_name
       FROM users u
       JOIN roles r
         ON r.id=u.role_id
       WHERE u.id=?
         AND u.active=1`,
      id,
    );
  },
};
