import type { PermissionCode } from '@/core/permissions/catalog';
import { PERMISSIONS } from '@/core/permissions/catalog';
import { AppError } from '@/core/errors';
import { inTransaction } from '@/core/database/transaction';
import { getDb } from '@/core/database';
import { uid, nowIso } from '@/shared/id';
import { roleRepository } from './repository';
export const permissionService = {
    async require(userId: string, code: PermissionCode, db?: Awaited<ReturnType<typeof getDb>>) { if (!await roleRepository.hasUserPermission(userId, code, db))
        throw new AppError('errors.permission'); },
};
export const roleService = {
    list: roleRepository.list,
    permissions: roleRepository.permissions,
    async create(actorId: string, input: {
        name: string;
        permissions: PermissionCode[];
    }) {
        await permissionService.require(actorId, 'USERS_MANAGE');
        if (!input.name.trim())
            throw new AppError('errors.validation');
        const id = uid('rol');
        const stamp = nowIso();
        await inTransaction(async (db) => {
            await db.runAsync('INSERT INTO roles(id,name,is_system,active,created_at,updated_at) VALUES(?,?,0,1,?,?)', id, input.name.trim(), stamp, stamp);
            for (const p of [...new Set(input.permissions)].filter(p => PERMISSIONS.includes(p)))
                await db.runAsync('INSERT INTO role_permissions(role_id,permission_code) VALUES(?,?)', id, p);
        });
        return id;
    },
    async update(actorId: string, roleId: string, input: {
        name: string;
        permissions: PermissionCode[];
    }) {
        await permissionService.require(actorId, 'USERS_MANAGE');
        const db = await getDb();
        const role = await db.getFirstAsync<{
            is_system: number;
        }>('SELECT is_system FROM roles WHERE id=?', roleId);
        if (!role)
            throw new AppError('errors.notFound');
        if (role.is_system)
            throw new AppError('errors.validation');
        await inTransaction(async (tx) => { await tx.runAsync('UPDATE roles SET name=?,updated_at=? WHERE id=?', input.name.trim(), nowIso(), roleId); await tx.runAsync('DELETE FROM role_permissions WHERE role_id=?', roleId); for (const p of [...new Set(input.permissions)].filter(p => PERMISSIONS.includes(p)))
            await tx.runAsync('INSERT INTO role_permissions(role_id,permission_code) VALUES(?,?)', roleId, p); });
    },
    async updatePermissions(actorId: string, roleId: string, permissions: PermissionCode[]) {
        await permissionService.require(actorId, 'USERS_MANAGE');
        const db = await getDb();
        const role = await db.getFirstAsync<{ is_system: number }>('SELECT is_system FROM roles WHERE id=?', roleId);
        if (!role) throw new AppError('errors.notFound');
        if (role.is_system) throw new AppError('errors.validation');
        await inTransaction(async (tx) => { await tx.runAsync('DELETE FROM role_permissions WHERE role_id=?', roleId); for (const p of [...new Set(permissions)].filter(p => PERMISSIONS.includes(p)))
            await tx.runAsync('INSERT INTO role_permissions(role_id,permission_code) VALUES(?,?)', roleId, p); await tx.runAsync('UPDATE roles SET updated_at=? WHERE id=?', nowIso(), roleId); });
    },
};

