export const migration003 = `
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(active, name COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS cash_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  opened_at TEXT NOT NULL,
  opening_amount INTEGER NOT NULL CHECK(opening_amount >= 0),
  status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED')),
  closed_at TEXT,
  expected_amount INTEGER,
  counted_amount INTEGER,
  difference INTEGER,
  notes TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_cash_session ON cash_sessions(status) WHERE status='OPEN';
CREATE TABLE IF NOT EXISTS cash_movements (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('SALE','SALE_REVERSAL','CUSTOMER_PAYMENT','INCOME','WITHDRAWAL','EXPENSE')),
  amount INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id, created_at DESC);
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY NOT NULL,
  number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  customer_id TEXT,
  cash_session_id TEXT,
  subtotal INTEGER NOT NULL CHECK(subtotal >= 0),
  discount INTEGER NOT NULL DEFAULT 0 CHECK(discount >= 0),
  tax INTEGER NOT NULL DEFAULT 0 CHECK(tax >= 0),
  total INTEGER NOT NULL CHECK(total >= 0),
  applied_credit INTEGER NOT NULL DEFAULT 0 CHECK(applied_credit >= 0),
  paid_total INTEGER NOT NULL DEFAULT 0 CHECK(paid_total >= 0),
  new_debt INTEGER NOT NULL DEFAULT 0 CHECK(new_debt >= 0),
  status TEXT NOT NULL CHECK(status IN ('COMPLETED','VOID')),
  created_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by TEXT,
  void_reason TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY(cash_session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY(voided_by) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id, created_at DESC);
CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  discount INTEGER NOT NULL DEFAULT 0 CHECK(discount >= 0),
  tax INTEGER NOT NULL DEFAULT 0 CHECK(tax >= 0),
  total INTEGER NOT NULL CHECK(total >= 0),
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('CASH','CARD','TRANSFER','OTHER')),
  amount INTEGER NOT NULL CHECK(amount >= 0),
  received INTEGER,
  change_amount INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
CREATE TABLE IF NOT EXISTS customer_account_entries (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('SALE_CREDIT','PAYMENT','CREDIT','CREDIT_USE','ADJUSTMENT','SALE_REVERSAL')),
  impact_minor INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  note TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_customer_account ON customer_account_entries(customer_id, created_at DESC);
`;

