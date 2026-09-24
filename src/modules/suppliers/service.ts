import { getDb } from '@/core/database';
import { persistLocalMedia, removeLocalMedia } from '@/core/media/files';
import { AppError } from '@/core/errors';
import { permissionService } from '@/modules/roles/service';
import { uid, nowIso } from '@/shared/id';
import { supplierRepository } from './repository';

export interface SupplierInput {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  logoUri?: string | null;
}

export const supplierService = {
  allActive: supplierRepository.allActive,
  get: supplierRepository.get,
  history: supplierRepository.history,

  async page(
    actorId: string,
    search = '',
    page = 1,
    pageSize = 12,
    includeInactive = false,
  ) {
    await permissionService.require(actorId, 'SUPPLIERS_VIEW');
    return supplierRepository.page(search, page, pageSize, includeInactive);
  },

  async create(actorId: string, input: SupplierInput) {
    await permissionService.require(actorId, 'SUPPLIERS_EDIT');
    if (!input.name.trim()) throw new AppError('errors.validation');
    const db = await getDb();
    const id = uid('sup');
    const stamp = nowIso();
    await db.runAsync(
      `INSERT INTO suppliers(id,name,document,phone,email,address,notes,logo_uri,active,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,1,?,?)`,
      id,
      input.name.trim(),
      input.document?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.address?.trim() || null,
      input.notes?.trim() || null,
      input.logoUri ?? null,
      stamp,
      stamp,
    );
    return id;
  },

  async update(actorId: string, id: string, input: SupplierInput) {
    await permissionService.require(actorId, 'SUPPLIERS_EDIT');
    const db = await getDb();
    await db.runAsync(
      `UPDATE suppliers
       SET name=?,document=?,phone=?,email=?,address=?,notes=?,logo_uri=?,updated_at=?
       WHERE id=?`,
      input.name.trim(),
      input.document?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.address?.trim() || null,
      input.notes?.trim() || null,
      input.logoUri ?? null,
      nowIso(),
      id,
    );
  },

  async setActive(actorId: string, id: string, active: boolean) {
    await permissionService.require(actorId, 'SUPPLIERS_EDIT');
    const db = await getDb();
    await db.runAsync(
      'UPDATE suppliers SET active=?,updated_at=? WHERE id=?',
      active ? 1 : 0,
      nowIso(),
      id,
    );
  },

  async setLogo(actorId: string, id: string, sourceUri: string | null) {
    await permissionService.require(actorId, 'SUPPLIERS_EDIT');
    const db = await getDb();
    const row = await db.getFirstAsync<{ logo_uri: string | null }>(
      'SELECT logo_uri FROM suppliers WHERE id=?',
      id,
    );
    if (!row) throw new AppError('errors.notFound');

    const next = sourceUri
      ? await persistLocalMedia(sourceUri, 'suppliers')
      : null;
    try {
      await db.runAsync(
        'UPDATE suppliers SET logo_uri=?,updated_at=? WHERE id=?',
        next,
        nowIso(),
        id,
      );
    } catch (error) {
      if (next) await removeLocalMedia(next);
      throw error;
    }
    if (row.logo_uri && row.logo_uri !== next) {
      await removeLocalMedia(row.logo_uri);
    }
    return next;
  },
};
