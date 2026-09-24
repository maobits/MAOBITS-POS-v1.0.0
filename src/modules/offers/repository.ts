import { getDb, type Db } from '@/core/database';
import type { Currency } from '@/core/types';

export interface CatalogOfferRow {
  id: string;
  name: string;
  subtitle: string | null;
  notes: string | null;
  currency: Currency;
  valid_from: string;
  valid_until: string;
  active: number;
  printed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CatalogCategoryRule {
  category_id: string;
  category_name: string;
  discount_bp: number;
}

export interface CatalogProductRule {
  product_id: string;
  product_name: string;
  category_id: string | null;
  discount_bp: number;
}

export interface CatalogSnapshotItem {
  product_id: string;
  product_name: string;
  category_id: string | null;
  category_name: string | null;
  image_uri: string | null;
  image_uris: string[];
  base_price: number;
  discount_bp: number;
  offer_price: number;
}

export interface CatalogBuilderProduct {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  category_name: string | null;
  sale_price: number;
  featured_image_uri: string | null;
}

function offerDateTime(
  value: string,
  endOfDay = false,
) {
  const direct = Date.parse(value);

  if (Number.isFinite(direct)) {
    return direct;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    value.trim(),
  );

  if (!match) return Number.NaN;

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  ).getTime();
}

export const offerRepository = {
  async list(db?: Db) {
    const d = db ?? await getDb();
    return d.getAllAsync<
      CatalogOfferRow & {
        categories: number;
        product_rules: number;
        snapshot_items: number;
      }
    >(
      `SELECT o.*,
              (SELECT COUNT(*) FROM catalog_offer_categories c
               WHERE c.offer_id=o.id) categories,
              (SELECT COUNT(*) FROM catalog_offer_products p
               WHERE p.offer_id=o.id) product_rules,
              (SELECT COUNT(*) FROM catalog_offer_items i
               WHERE i.offer_id=o.id) snapshot_items
       FROM catalog_offers o
       ORDER BY o.created_at DESC`,
    );
  },

  async header(id: string, db?: Db) {
    const d = db ?? await getDb();
    return d.getFirstAsync<CatalogOfferRow>(
      `SELECT * FROM catalog_offers WHERE id=?`,
      id,
    );
  },

  async categoryRules(id: string, db?: Db) {
    const d = db ?? await getDb();
    return d.getAllAsync<CatalogCategoryRule>(
      `SELECT r.category_id,
              c.name category_name,
              r.discount_bp
       FROM catalog_offer_categories r
       JOIN categories c ON c.id=r.category_id
       WHERE r.offer_id=?
       ORDER BY c.name COLLATE NOCASE`,
      id,
    );
  },

  async productRules(id: string, db?: Db) {
    const d = db ?? await getDb();
    return d.getAllAsync<CatalogProductRule>(
      `SELECT r.product_id,
              p.name product_name,
              p.category_id,
              r.discount_bp
       FROM catalog_offer_products r
       JOIN products p ON p.id=r.product_id
       WHERE r.offer_id=?
       ORDER BY p.name COLLATE NOCASE`,
      id,
    );
  },

  async snapshotItems(id: string, db?: Db) {
    const d = db ?? await getDb();

    const items = await d.getAllAsync<
      Omit<CatalogSnapshotItem, 'image_uris'>
    >(
      `SELECT product_id,product_name,category_id,category_name,
              image_uri,base_price,discount_bp,offer_price
       FROM catalog_offer_items
       WHERE offer_id=?
       ORDER BY category_name COLLATE NOCASE,
                product_name COLLATE NOCASE`,
      id,
    );

    if (!items.length) return [];

    const images = await d.getAllAsync<{
      product_id: string;
      uri: string;
      sort_order: number;
    }>(
      `SELECT product_id,uri,sort_order
       FROM catalog_offer_item_images
       WHERE offer_id=?
       ORDER BY product_id,sort_order`,
      id,
    );

    const byProduct = new Map<string, string[]>();

    for (const image of images) {
      const current =
        byProduct.get(image.product_id) ?? [];
      current.push(image.uri);
      byProduct.set(image.product_id, current);
    }

    return items.map((item) => ({
      ...item,
      image_uris:
        byProduct.get(item.product_id) ??
        (item.image_uri ? [item.image_uri] : []),
    }));
  },

  async detail(id: string, db?: Db) {
    const header = await this.header(id, db);
    if (!header) return null;

    const [categoryRules, productRules, snapshotItems] =
      await Promise.all([
        this.categoryRules(id, db),
        this.productRules(id, db),
        this.snapshotItems(id, db),
      ]);

    return {
      ...header,
      categoryRules,
      productRules,
      snapshotItems,
    };
  },

  async builderData(db?: Db) {
    const d = db ?? await getDb();

    const categories = await d.getAllAsync<{
      id: string;
      name: string;
      icon: string;
    }>(
      `SELECT id,name,icon
       FROM categories
       WHERE active=1
       ORDER BY name COLLATE NOCASE`,
    );

    const products = await d.getAllAsync<CatalogBuilderProduct>(
      `SELECT p.id,p.name,p.description,p.category_id,
              c.name category_name,p.sale_price,
              (
                SELECT pi.uri
                FROM product_images pi
                WHERE pi.product_id=p.id
                ORDER BY pi.is_featured DESC,pi.sort_order,pi.id
                LIMIT 1
              ) featured_image_uri
       FROM products p
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.active=1
       ORDER BY c.name COLLATE NOCASE,p.name COLLATE NOCASE`,
    );

    return { categories, products };
  },

  async insertHeader(
    row: CatalogOfferRow,
    db: Db,
  ) {
    await db.runAsync(
      `INSERT INTO catalog_offers(
        id,name,subtitle,notes,currency,valid_from,valid_until,
        active,printed_at,created_by,created_at,updated_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      row.id,
      row.name,
      row.subtitle,
      row.notes,
      row.currency,
      row.valid_from,
      row.valid_until,
      row.active,
      row.printed_at,
      row.created_by,
      row.created_at,
      row.updated_at,
    );
  },

  async updateHeader(
    row: Pick<
      CatalogOfferRow,
      | 'id'
      | 'name'
      | 'subtitle'
      | 'notes'
      | 'currency'
      | 'valid_from'
      | 'valid_until'
      | 'active'
      | 'updated_at'
    >,
    db: Db,
  ) {
    await db.runAsync(
      `UPDATE catalog_offers
       SET name=?,subtitle=?,notes=?,currency=?,
           valid_from=?,valid_until=?,active=?,
           printed_at=NULL,updated_at=?
       WHERE id=?`,
      row.name,
      row.subtitle,
      row.notes,
      row.currency,
      row.valid_from,
      row.valid_until,
      row.active,
      row.updated_at,
      row.id,
    );
  },

  async replaceRules(
    offerId: string,
    categories: {
      categoryId: string;
      discountBp: number;
    }[],
    products: {
      productId: string;
      discountBp: number;
    }[],
    db: Db,
  ) {
    await db.runAsync(
      'DELETE FROM catalog_offer_categories WHERE offer_id=?',
      offerId,
    );
    await db.runAsync(
      'DELETE FROM catalog_offer_products WHERE offer_id=?',
      offerId,
    );
    await db.runAsync(
      'DELETE FROM catalog_offer_items WHERE offer_id=?',
      offerId,
    );

    for (const rule of categories) {
      await db.runAsync(
        `INSERT INTO catalog_offer_categories(
          offer_id,category_id,discount_bp
        ) VALUES(?,?,?)`,
        offerId,
        rule.categoryId,
        rule.discountBp,
      );
    }

    for (const rule of products) {
      await db.runAsync(
        `INSERT INTO catalog_offer_products(
          offer_id,product_id,discount_bp
        ) VALUES(?,?,?)`,
        offerId,
        rule.productId,
        rule.discountBp,
      );
    }
  },

  async previewItems(id: string, db?: Db) {
    const d = db ?? await getDb();

    const items = await d.getAllAsync<
      Omit<CatalogSnapshotItem, 'image_uris'> & {
        description: string;
      }
    >(
      `SELECT p.id product_id,
              p.name product_name,
              p.category_id,
              c.name category_name,
              p.description,
              (
                SELECT pi.uri
                FROM product_images pi
                WHERE pi.product_id=p.id
                ORDER BY pi.is_featured DESC,pi.sort_order,pi.id
                LIMIT 1
              ) image_uri,
              p.sale_price base_price,
              CASE
                WHEN opr.product_id IS NOT NULL
                  THEN opr.discount_bp
                ELSE ocr.discount_bp
              END discount_bp,
              MAX(
                0,
                p.sale_price -
                ROUND(
                  p.sale_price *
                  (
                    CASE
                      WHEN opr.product_id IS NOT NULL
                        THEN opr.discount_bp
                      ELSE ocr.discount_bp
                    END
                  ) / 10000.0
                )
              ) offer_price
       FROM catalog_offer_categories ocr
       JOIN categories c ON c.id=ocr.category_id
       JOIN products p
         ON p.category_id=ocr.category_id
        AND p.active=1
       LEFT JOIN catalog_offer_products opr
         ON opr.offer_id=ocr.offer_id
        AND opr.product_id=p.id
       WHERE ocr.offer_id=?
       ORDER BY c.name COLLATE NOCASE,p.name COLLATE NOCASE`,
      id,
    );

    if (!items.length) return [];

    const ids = items.map((item) => item.product_id);
    const placeholders = ids.map(() => '?').join(',');

    const images = await d.getAllAsync<{
      product_id: string;
      uri: string;
    }>(
      `SELECT product_id,uri
       FROM product_images
       WHERE product_id IN (${placeholders})
       ORDER BY product_id,is_featured DESC,sort_order,id`,
      ...ids,
    );

    const byProduct = new Map<string, string[]>();

    for (const image of images) {
      const current =
        byProduct.get(image.product_id) ?? [];
      current.push(image.uri);
      byProduct.set(image.product_id, current);
    }

    return items.map((item) => ({
      ...item,
      image_uris:
        byProduct.get(item.product_id) ??
        (item.image_uri ? [item.image_uri] : []),
    }));
  },

  async recordSnapshot(
    id: string,
    items: CatalogSnapshotItem[],
    printedAt: string,
    db: Db,
  ) {
    await db.runAsync(
      'DELETE FROM catalog_offer_item_images WHERE offer_id=?',
      id,
    );
    await db.runAsync(
      'DELETE FROM catalog_offer_items WHERE offer_id=?',
      id,
    );

    for (const item of items) {
      const images = item.image_uris.length
        ? item.image_uris
        : item.image_uri
          ? [item.image_uri]
          : [];

      await db.runAsync(
        `INSERT INTO catalog_offer_items(
          offer_id,product_id,product_name,category_id,category_name,
          image_uri,base_price,discount_bp,offer_price
        ) VALUES(?,?,?,?,?,?,?,?,?)`,
        id,
        item.product_id,
        item.product_name,
        item.category_id,
        item.category_name,
        images[0] ?? null,
        item.base_price,
        item.discount_bp,
        item.offer_price,
      );

      for (
        let sortOrder = 0;
        sortOrder < images.length;
        sortOrder += 1
      ) {
        await db.runAsync(
          `INSERT INTO catalog_offer_item_images(
            offer_id,product_id,uri,sort_order
          ) VALUES(?,?,?,?)`,
          id,
          item.product_id,
          images[sortOrder],
          sortOrder,
        );
      }
    }

    await db.runAsync(
      `UPDATE catalog_offers
       SET printed_at=?,updated_at=?
       WHERE id=?`,
      printedAt,
      printedAt,
      id,
    );
  },

  async setActive(
    id: string,
    active: boolean,
    updatedAt: string,
    db?: Db,
  ) {
    const d = db ?? await getDb();
    await d.runAsync(
      `UPDATE catalog_offers
       SET active=?,updated_at=?
       WHERE id=?`,
      active ? 1 : 0,
      updatedAt,
      id,
    );
  },

  async publishedCandidates(
    currency: Currency,
    now: string,
    db?: Db,
  ) {
    const d = db ?? await getDb();

    const offers =
      await d.getAllAsync<CatalogOfferRow>(
        `SELECT *
         FROM catalog_offers
         WHERE active=1
           AND printed_at IS NOT NULL
           AND currency=?
         ORDER BY valid_until,created_at DESC`,
        currency,
      );

    const nowTime = Date.parse(now);

    return offers.filter((offer) => {
      const from = offerDateTime(
        offer.valid_from,
      );
      const until = offerDateTime(
        offer.valid_until,
        true,
      );

      return (
        Number.isFinite(nowTime) &&
        Number.isFinite(from) &&
        Number.isFinite(until) &&
        from <= nowTime &&
        until >= nowTime
      );
    });
  },

  async activeForPos(
    currency: Currency,
    now: string,
    db?: Db,
  ) {
    const d = db ?? await getDb();

    const candidates =
      await this.publishedCandidates(
        currency,
        now,
        d,
      );

    return Promise.all(
      candidates.map(async (offer) => ({
        ...offer,
        categoryRules:
          await this.categoryRules(
            offer.id,
            d,
          ),
        productRules:
          await this.productRules(
            offer.id,
            d,
          ),
        snapshotItems:
          await this.snapshotItems(
            offer.id,
            d,
          ),
      })),
    );
  },

  async repairPublishedSnapshot(
    id: string,
    printedAt: string,
    db: Db,
  ) {
    const existing =
      await this.snapshotItems(
        id,
        db,
      );

    if (existing.length) {
      return existing;
    }

    const preview =
      await this.previewItems(
        id,
        db,
      );

    if (!preview.length) {
      return [];
    }

    await this.recordSnapshot(
      id,
      preview,
      printedAt,
      db,
    );

    return preview;
  },

  async deleteOffer(
    id: string,
    db?: Db,
  ) {
    const d = db ?? await getDb();

    await d.runAsync(
      `DELETE FROM catalog_offers
       WHERE id=?`,
      id,
    );
  },

  async quoteRows(
    offerId: string,
    productIds: string[],
    db?: Db,
  ) {
    if (!productIds.length) return [];

    const d = db ?? await getDb();
    const placeholders = productIds.map(() => '?').join(',');

    return d.getAllAsync<{
      product_id: string;
      current_price: number;
      offer_price: number;
      discount_bp: number;
    }>(
      `SELECT i.product_id,
              p.sale_price current_price,
              i.offer_price,
              i.discount_bp
       FROM catalog_offer_items i
       JOIN products p ON p.id=i.product_id
       WHERE i.offer_id=?
         AND p.active=1
         AND i.product_id IN (${placeholders})`,
      offerId,
      ...productIds,
    );
  },
};
