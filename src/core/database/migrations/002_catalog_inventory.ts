export const migration002 = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  icon TEXT NOT NULL DEFAULT 'cube-outline',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  logo_uri TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  sku TEXT NOT NULL UNIQUE COLLATE NOCASE,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id TEXT,
  purchase_cost INTEGER NOT NULL DEFAULT 0 CHECK(purchase_cost >= 0),
  sale_price INTEGER NOT NULL CHECK(sale_price >= 0),
  tax_rate_bp INTEGER NOT NULL DEFAULT 0 CHECK(tax_rate_bp >= 0 AND tax_rate_bp <= 10000),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 0 CHECK(minimum_stock >= 0),
  unit TEXT NOT NULL DEFAULT 'und',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, active);
CREATE TABLE IF NOT EXISTS product_suppliers (
  product_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_sku TEXT,
  last_cost INTEGER CHECK(last_cost IS NULL OR last_cost >= 0),
  preferred INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(product_id, supplier_id),
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL,
  uri TEXT NOT NULL,
  is_featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_one_featured ON product_images(product_id) WHERE is_featured=1;
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY NOT NULL,
  supplier_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  number TEXT NOT NULL UNIQUE,
  total INTEGER NOT NULL CHECK(total >= 0),
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY NOT NULL,
  purchase_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_cost INTEGER NOT NULL CHECK(unit_cost >= 0),
  total INTEGER NOT NULL CHECK(total >= 0),
  FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('INITIAL','PURCHASE','SALE','ADJUSTMENT_IN','ADJUSTMENT_OUT','SALE_REVERSAL')),
  quantity INTEGER NOT NULL,
  before_stock INTEGER NOT NULL CHECK(before_stock >= 0),
  after_stock INTEGER NOT NULL CHECK(after_stock >= 0),
  supplier_id TEXT,
  unit_cost INTEGER,
  reference_type TEXT,
  reference_id TEXT,
  note TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory_movements(supplier_id, created_at DESC);
`;

