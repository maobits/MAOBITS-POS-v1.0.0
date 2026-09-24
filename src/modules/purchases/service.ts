import { AppError } from '@/core/errors';
import { roleRepository } from '@/modules/roles/repository';
import { permissionService } from '@/modules/roles/service';
import { purchaseRepository } from './repository';

export const purchaseService = {
  async page(
    actorId: string,
    search = '',
    page = 1,
    pageSize = 12,
    supplierId?: string | null,
    from?: string,
    to?: string,
  ) {
    await permissionService.require(actorId, 'PURCHASES_VIEW');
    const result = await purchaseRepository.page(
      search,
      page,
      pageSize,
      supplierId,
      from,
      to,
    );
    const mayCost = await roleRepository.hasUserPermission(
      actorId,
      'PRODUCT_COST_VIEW',
    );
    if (mayCost) return result;

    return {
      ...result,
      items: result.items.map((row) => ({
        ...row,
        total: 0,
        payment_total: 0,
      })),
    };
  },

  async detail(actorId: string, id: string) {
    await permissionService.require(actorId, 'PURCHASES_VIEW');
    const row = await purchaseRepository.detail(id);
    if (!row) throw new AppError('errors.notFound');

    const mayCost = await roleRepository.hasUserPermission(
      actorId,
      'PRODUCT_COST_VIEW',
    );
    if (mayCost) return row;

    return {
      ...row,
      total: 0,
      payment_total: 0,
      supplier_balance: 0,
      items: row.items.map((item) => ({
        ...item,
        unit_cost: 0,
        total: 0,
      })),
    };
  },
};
