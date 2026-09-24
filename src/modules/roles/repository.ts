import { getDb, type Db } from '@/core/database';
export interface RoleRow {
    id: string;
    name: string;
    is_system: number;
    active: number;
    created_at: string;
    updated_at: string;
}
export const roleRepository = {
    async list() { const db = await getDb(); return db.getAllAsync<RoleRow>('SELECT * FROM roles WHERE active=1 ORDER BY is_system DESC,name COLLATE NOCASE'); },
    async permissions(roleId: string, db?: Db) { const d = db ?? await getDb(); const rows = await d.getAllAsync<{
        permission_code: string;
    }>('SELECT permission_code FROM role_permissions WHERE role_id=? ORDER BY permission_code', roleId); return rows.map(r => r.permission_code); },
    async hasUserPermission(userId: string, code: string, db?: Db) { const d = db ?? await getDb(); const row = await d.getFirstAsync<{
        ok: number;
    }>(`SELECT 1 ok FROM users u JOIN role_permissions rp ON rp.role_id=u.role_id WHERE u.id=? AND u.active=1 AND rp.permission_code=? LIMIT 1`, userId, code); return Boolean(row?.ok); },
};

