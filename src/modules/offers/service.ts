import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import type { Currency } from '@/core/types';
import { permissionService } from '@/modules/roles/service';
import { nowIso, uid } from '@/shared/id';
import {
  offerRepository,
  type CatalogSnapshotItem,
} from './repository';

function clampBp(value: number) {
  return Math.max(
    0,
    Math.min(10000, Math.round(value)),
  );
}

export interface SaveCatalogOfferInput {
  id?: string;
  name: string;
  subtitle?: string;
  notes?: string;
  currency: Currency;
  validFrom: string;
  validUntil: string;
  active?: boolean;
  categories: {
    categoryId: string;
    discountBp: number;
  }[];
  products: {
    productId: string;
    discountBp: number;
  }[];
}

export const offerService = {
  async list(actorId: string) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );
    return offerRepository.list();
  },

  async builderData(actorId: string) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );
    return offerRepository.builderData();
  },

  async detail(actorId: string, id: string) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );
    const detail = await offerRepository.detail(id);
    if (!detail) throw new AppError('errors.notFound');
    return detail;
  },

  async save(
    actorId: string,
    input: SaveCatalogOfferInput,
  ) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );

    const name = input.name.trim();
    if (
      !name ||
      !input.validFrom ||
      !input.validUntil ||
      !input.categories.length
    ) {
      throw new AppError('errors.validation');
    }

    const from = new Date(input.validFrom);
    const until = new Date(input.validUntil);

    if (
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(until.getTime()) ||
      until.getTime() < from.getTime()
    ) {
      throw new AppError('errors.validation');
    }

    const categoryIds = new Set(
      input.categories.map((rule) => rule.categoryId),
    );

    const categories = input.categories.map((rule) => ({
      categoryId: rule.categoryId,
      discountBp: clampBp(rule.discountBp),
    }));

    const products = input.products.map((rule) => ({
      productId: rule.productId,
      discountBp: clampBp(rule.discountBp),
    }));

    const stamp = nowIso();
    const id = input.id ?? uid('off');

    await inTransaction(async (db) => {
      const current = input.id
        ? await offerRepository.header(id, db)
        : null;

      if (input.id && !current) {
        throw new AppError('errors.notFound');
      }

      if (current) {
        await offerRepository.updateHeader(
          {
            id,
            name,
            subtitle: input.subtitle?.trim() || null,
            notes: input.notes?.trim() || null,
            currency: input.currency,
            valid_from: input.validFrom,
            valid_until: input.validUntil,
            active: input.active === false ? 0 : 1,
            updated_at: stamp,
          },
          db,
        );
      } else {
        await offerRepository.insertHeader(
          {
            id,
            name,
            subtitle: input.subtitle?.trim() || null,
            notes: input.notes?.trim() || null,
            currency: input.currency,
            valid_from: input.validFrom,
            valid_until: input.validUntil,
            active: input.active === false ? 0 : 1,
            printed_at: null,
            created_by: actorId,
            created_at: stamp,
            updated_at: stamp,
          },
          db,
        );
      }

      const builder = await offerRepository.builderData(db);
      const allowedProducts = new Set(
        builder.products
          .filter(
            (product) =>
              product.category_id &&
              categoryIds.has(product.category_id),
          )
          .map((product) => product.id),
      );

      await offerRepository.replaceRules(
        id,
        categories,
        products.filter((rule) =>
          allowedProducts.has(rule.productId),
        ),
        db,
      );
    });

    return id;
  },

  async setActive(
    actorId: string,
    id: string,
    active: boolean,
  ) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );
    await offerRepository.setActive(
      id,
      active,
      nowIso(),
    );
  },

  async previewForPrint(
    actorId: string,
    id: string,
  ) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );

    const offer = await offerRepository.detail(id);
    if (!offer) throw new AppError('errors.notFound');

    const items = await offerRepository.previewItems(id);
    if (!items.length) {
      throw new AppError('errors.validation');
    }

    return { offer, items };
  },

  async recordPrinted(
    actorId: string,
    id: string,
    items: CatalogSnapshotItem[],
  ) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );

    const stamp = nowIso();

    await inTransaction(async (db) => {
      const offer = await offerRepository.header(id, db);
      if (!offer) throw new AppError('errors.notFound');

      await offerRepository.recordSnapshot(
        id,
        items,
        stamp,
        db,
      );
    });
  },

  async repairPublishedOffer(
    id: string,
    printedAt: string,
  ) {
    return inTransaction(async (db) =>
      offerRepository.repairPublishedSnapshot(
        id,
        printedAt,
        db,
      ),
    );
  },

  async activeForPos(
    actorId: string,
    currency: Currency,
  ) {
    await permissionService.require(
      actorId,
      'POS_SELL',
    );

    const offers =
      await offerRepository.activeForPos(
        currency,
        nowIso(),
      );

    const repaired = [];

    for (const offer of offers) {
      if (offer.snapshotItems.length) {
        repaired.push(offer);
        continue;
      }

      if (!offer.printed_at) {
        continue;
      }

      const snapshot =
        await this.repairPublishedOffer(
          offer.id,
          offer.printed_at,
        );

      if (!snapshot.length) {
        continue;
      }

      repaired.push({
        ...offer,
        snapshotItems: snapshot,
      });
    }

    return repaired;
  },

  async deleteOffer(
    actorId: string,
    id: string,
  ) {
    await permissionService.require(
      actorId,
      'CATALOG_PRINT',
    );

    await inTransaction(async (db) => {
      const offer =
        await offerRepository.header(
          id,
          db,
        );

      if (!offer) {
        throw new AppError(
          'errors.notFound',
        );
      }

      await offerRepository.deleteOffer(
        id,
        db,
      );
    });
  },

  async quote(
    actorId: string,
    offerId: string,
    items: {
      productId: string;
      quantity: number;
    }[],
  ) {
    await permissionService.require(
      actorId,
      'POS_SELL',
    );

    const offer = await offerRepository.header(offerId);

    if (
      !offer ||
      !offer.active ||
      !offer.printed_at
    ) {
      throw new AppError('errors.validation');
    }

    const now = Date.now();
    if (
      new Date(offer.valid_from).getTime() > now ||
      new Date(offer.valid_until).getTime() < now
    ) {
      throw new AppError('errors.validation');
    }

    const rows = await offerRepository.quoteRows(
      offerId,
      items.map((item) => item.productId),
    );
    const map = new Map(
      rows.map((row) => [row.product_id, row]),
    );

    let discount = 0;
    let eligibleUnits = 0;

    for (const item of items) {
      const row = map.get(item.productId);
      if (!row || item.quantity <= 0) continue;

      const unitDiscount = Math.max(
        0,
        row.current_price - row.offer_price,
      );

      discount += unitDiscount * item.quantity;
      eligibleUnits += item.quantity;
    }

    return {
      offerId: offer.id,
      name: offer.name,
      notes: offer.notes,
      validUntil: offer.valid_until,
      discount: Math.max(0, Math.round(discount)),
      eligibleUnits,
    };
  },
};
