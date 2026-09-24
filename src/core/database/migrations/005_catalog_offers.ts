export const migration005 = `
CREATE TABLE IF NOT EXISTS catalog_offers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  subtitle TEXT,
  notes TEXT,
  currency TEXT NOT NULL CHECK(currency IN ('COP','USD','EUR')),
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  printed_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_offer_categories (
  offer_id TEXT NOT NULL REFERENCES catalog_offers(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id),
  discount_bp INTEGER NOT NULL DEFAULT 0
    CHECK(discount_bp>=0 AND discount_bp<=10000),
  PRIMARY KEY(offer_id,category_id)
);

CREATE TABLE IF NOT EXISTS catalog_offer_products (
  offer_id TEXT NOT NULL REFERENCES catalog_offers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  discount_bp INTEGER NOT NULL DEFAULT 0
    CHECK(discount_bp>=0 AND discount_bp<=10000),
  PRIMARY KEY(offer_id,product_id)
);

CREATE TABLE IF NOT EXISTS catalog_offer_items (
  offer_id TEXT NOT NULL REFERENCES catalog_offers(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT,
  image_uri TEXT,
  base_price INTEGER NOT NULL CHECK(base_price>=0),
  discount_bp INTEGER NOT NULL DEFAULT 0
    CHECK(discount_bp>=0 AND discount_bp<=10000),
  offer_price INTEGER NOT NULL CHECK(offer_price>=0),
  PRIMARY KEY(offer_id,product_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_offers_validity
  ON catalog_offers(active,printed_at,valid_from,valid_until);

CREATE INDEX IF NOT EXISTS idx_catalog_offer_items_product
  ON catalog_offer_items(product_id,offer_id);

ALTER TABLE sales ADD COLUMN offer_id TEXT;
ALTER TABLE sales ADD COLUMN offer_name TEXT;
ALTER TABLE sales ADD COLUMN offer_discount INTEGER NOT NULL DEFAULT 0
  CHECK(offer_discount>=0);
`;
