export const migration004 = `
CREATE TABLE IF NOT EXISTS supplier_account_entries (
  id TEXT PRIMARY KEY NOT NULL,
  supplier_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('PURCHASE','PAYMENT','CREDIT','ADJUSTMENT','PURCHASE_REVERSAL')),
  impact_minor INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  note TEXT,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_account
  ON supplier_account_entries(supplier_id, created_at DESC);

-- Purchases created before supplier accounts existed were all account purchases:
-- the previous product version did not record a supplier payment at purchase time.
INSERT OR IGNORE INTO supplier_account_entries(
  id,supplier_id,type,impact_minor,reference_type,reference_id,
  note,user_id,created_at
)
SELECT
  'sae_migrated_' || p.id,
  p.supplier_id,
  'PURCHASE',
  p.total,
  'PURCHASE',
  p.id,
  COALESCE(p.notes,'Migrated purchase balance'),
  p.user_id,
  p.created_at
FROM purchases p;
`;
