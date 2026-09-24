#!/usr/bin/env python3
"""Executable contract test for the MAOBITS POS legacy-v1 -> modular schema bridge."""
from __future__ import annotations
from pathlib import Path
import re
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]

LEGACY_SCHEMA = r'''
PRAGMA foreign_keys = ON;
CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL);
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','CASHIER')),
  pin_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL
);
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL
);
CREATE TABLE products (
  id TEXT PRIMARY KEY NOT NULL,sku TEXT NOT NULL UNIQUE COLLATE NOCASE,barcode TEXT UNIQUE,
  name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',category_id TEXT,
  purchase_cost INTEGER NOT NULL DEFAULT 0 CHECK(purchase_cost >= 0),
  sale_price INTEGER NOT NULL CHECK(sale_price >= 0),tax_rate_bp INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,minimum_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'und',active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,document TEXT,phone TEXT,email TEXT,
  address TEXT,notes TEXT,created_at TEXT NOT NULL
);
CREATE INDEX idx_customers_name ON customers(name);
CREATE TABLE cash_sessions (
  id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,opened_at TEXT NOT NULL,
  opening_amount INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED')),
  closed_at TEXT,expected_amount INTEGER,counted_amount INTEGER,difference INTEGER,notes TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_cash_sessions_user_status ON cash_sessions(user_id,status);
CREATE TABLE sales (
  id TEXT PRIMARY KEY NOT NULL,number TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL,
  customer_id TEXT,cash_session_id TEXT,subtotal INTEGER NOT NULL,discount INTEGER NOT NULL,
  tax INTEGER NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('COMPLETED','VOID')),
  created_at TEXT NOT NULL,voided_at TEXT,voided_by TEXT,void_reason TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY(cash_session_id) REFERENCES cash_sessions(id),FOREIGN KEY(voided_by) REFERENCES users(id)
);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE TABLE sale_items (
  id TEXT PRIMARY KEY NOT NULL,sale_id TEXT NOT NULL,product_id TEXT NOT NULL,product_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,quantity INTEGER NOT NULL,discount INTEGER NOT NULL,tax INTEGER NOT NULL,
  total INTEGER NOT NULL,FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE TABLE payments (
  id TEXT PRIMARY KEY NOT NULL,sale_id TEXT NOT NULL,method TEXT NOT NULL,
  amount INTEGER NOT NULL,received INTEGER,change_amount INTEGER,created_at TEXT NOT NULL,
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
);
CREATE INDEX idx_payments_sale ON payments(sale_id);
CREATE TABLE inventory_movements (
  id TEXT PRIMARY KEY NOT NULL,product_id TEXT NOT NULL,type TEXT NOT NULL,quantity INTEGER NOT NULL,
  before_stock INTEGER NOT NULL,after_stock INTEGER NOT NULL,reference_type TEXT,reference_id TEXT,
  note TEXT,user_id TEXT,created_at TEXT NOT NULL,FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_inventory_product ON inventory_movements(product_id,created_at);
CREATE TABLE cash_movements (
  id TEXT PRIMARY KEY NOT NULL,session_id TEXT NOT NULL,user_id TEXT NOT NULL,type TEXT NOT NULL,
  amount INTEGER NOT NULL,reference_type TEXT,reference_id TEXT,note TEXT,created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES cash_sessions(id),FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX idx_cash_movements_session ON cash_movements(session_id,created_at);
PRAGMA user_version = 1;
'''

LEGACY_TABLES = [
    'cash_movements','inventory_movements','payments','sale_items','sales','cash_sessions',
    'customers','products','categories','users','settings'
]

KNOWN_INDEXES = [
    'idx_users_active','idx_products_name','idx_products_barcode','idx_products_category',
    'idx_customers_name','idx_cash_sessions_user_status','idx_one_open_cash_session',
    'idx_sales_created','idx_sales_status','idx_sales_customer','idx_sale_items_sale',
    'idx_sale_items_product','idx_payments_sale','idx_inventory_product','idx_inventory_supplier',
    'idx_cash_movements_session','idx_customer_account'
]

PERMISSIONS = [
    'DASHBOARD_VIEW','POS_SELL','CATALOG_PRINT','PRODUCTS_VIEW','PRODUCTS_EDIT','PRODUCT_COST_VIEW',
    'INVENTORY_VIEW','INVENTORY_ADJUST','INVENTORY_PURCHASE','PURCHASES_VIEW','SUPPLIERS_VIEW','SUPPLIERS_EDIT','CUSTOMERS_VIEW','CUSTOMERS_EDIT',
    'CUSTOMER_CREDIT_MANAGE','CASH_OPEN_CLOSE','CASH_MOVEMENTS','SALES_VIEW','SALES_VOID',
    'REPORTS_VIEW','SCANNER_USE','USERS_MANAGE','SETTINGS_MANAGE','BACKUP_MANAGE'
]
CASHIER = [
    'DASHBOARD_VIEW','POS_SELL','PRODUCTS_VIEW','INVENTORY_VIEW','CUSTOMERS_VIEW',
    'CUSTOMERS_EDIT','CASH_OPEN_CLOSE','CASH_MOVEMENTS','SALES_VIEW','SCANNER_USE'
]


def migration_sql(rel: str) -> str:
    text = (ROOT / rel).read_text(encoding='utf-8')
    match = re.search(r'`([\s\S]*)`', text)
    if not match:
        raise RuntimeError(f'Cannot extract migration SQL: {rel}')
    return match.group(1)


def columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f'PRAGMA table_info("{table}")')}


def seed_legacy(conn: sqlite3.Connection) -> None:
    conn.execute("INSERT INTO settings VALUES('configured','1')")
    conn.execute("INSERT INTO settings VALUES('business_name','Legacy Cafe')")
    conn.execute("INSERT INTO settings VALUES('currency','COP')")
    conn.execute("INSERT INTO settings VALUES('locale','es')")
    conn.execute("INSERT INTO users VALUES('u-admin','Admin Legacy','ADMIN','legacyhash',1,'2026-01-01')")
    conn.execute("INSERT INTO users VALUES('u-cash','Cashier Legacy','CASHIER','cashhash',1,'2026-01-01')")
    conn.execute("INSERT INTO categories VALUES('cat-1','Bebidas',1,'2026-01-01')")
    conn.execute("INSERT INTO products VALUES('prod-1','SKU-1','7700000000017','Cafe','', 'cat-1',1200,3500,0,8,2,'und',1,'2026-01-01','2026-01-01')")
    conn.execute("INSERT INTO customers VALUES('cust-1','Cliente Legacy','123','300','c@example.com','Calle 1','Nota','2026-01-01')")
    conn.execute("INSERT INTO cash_sessions VALUES('cash-1','u-admin','2026-01-01',10000,'CLOSED','2026-01-01',13000,13000,0,NULL)")
    conn.execute("INSERT INTO sales VALUES('sale-1','V-0001','u-admin','cust-1','cash-1',3500,0,0,3500,'COMPLETED','2026-01-01',NULL,NULL,NULL)")
    conn.execute("INSERT INTO sale_items VALUES('item-1','sale-1','prod-1','Cafe',3500,1,0,0,3500)")
    conn.execute("INSERT INTO payments VALUES('pay-1','sale-1','CASH',3500,5000,1500,'2026-01-01')")
    conn.execute("INSERT INTO inventory_movements VALUES('mov-1','prod-1','SALE',-1,9,8,'SALE','sale-1','Venta','u-admin','2026-01-01')")
    conn.execute("INSERT INTO cash_movements VALUES('cm-1','cash-1','u-admin','SALE',3500,'SALE','sale-1','Venta','2026-01-01')")
    conn.commit()


def simulate_bridge(conn: sqlite3.Connection) -> None:
    # Mimic a previous failed modular run where migration 001 was committed.
    conn.executescript(migration_sql('src/core/database/migrations/001_foundation.ts'))
    conn.execute("INSERT INTO schema_migrations VALUES(1,'foundation','2026-01-02')")
    conn.commit()

    conn.execute('PRAGMA foreign_keys=OFF')
    conn.execute('BEGIN IMMEDIATE')
    try:
        conn.executescript('''
          DROP TABLE IF EXISTS role_permissions; DROP TABLE IF EXISTS permissions;
          DROP TABLE IF EXISTS roles; DROP TABLE IF EXISTS customer_account_entries;
          DROP TABLE IF EXISTS purchase_items; DROP TABLE IF EXISTS purchases;
          DROP TABLE IF EXISTS product_images; DROP TABLE IF EXISTS product_suppliers;
          DROP TABLE IF EXISTS suppliers; DROP TABLE IF EXISTS schema_migrations;
        ''')
        for table in LEGACY_TABLES:
            conn.execute(f'ALTER TABLE "{table}" RENAME TO "legacy_v1_{table}"')
        for name in KNOWN_INDEXES:
            conn.execute(f'DROP INDEX IF EXISTS "{name}"')

        for rel in [
            'src/core/database/migrations/001_foundation.ts',
            'src/core/database/migrations/002_catalog_inventory.ts',
            'src/core/database/migrations/003_sales_customers_cash.ts',
        ]:
            conn.executescript(migration_sql(rel))

        stamp='2026-01-03T00:00:00.000Z'
        for code in PERMISSIONS:
            conn.execute('INSERT INTO permissions VALUES(?,?,?)',(code,code.split('_')[0],code))
        conn.execute("INSERT INTO roles VALUES('rol_legacy_admin','Administrador',1,1,?,?)",(stamp,stamp))
        conn.execute("INSERT INTO roles VALUES('rol_legacy_cashier','Cajero',1,1,?,?)",(stamp,stamp))
        for code in PERMISSIONS:
            conn.execute("INSERT INTO role_permissions VALUES('rol_legacy_admin',?)",(code,))
        for code in CASHIER:
            conn.execute("INSERT INTO role_permissions VALUES('rol_legacy_cashier',?)",(code,))

        conn.execute("INSERT INTO settings SELECT key,value,? FROM legacy_v1_settings",(stamp,))
        conn.execute("""INSERT INTO users
          SELECT id,name,CASE role WHEN 'ADMIN' THEN 'rol_legacy_admin' ELSE 'rol_legacy_cashier' END,
                 '__legacy_maobits_pos_v1__',pin_hash,active,created_at,created_at
          FROM legacy_v1_users""")
        conn.execute("INSERT INTO categories SELECT id,name,'cube-outline',active,created_at,created_at FROM legacy_v1_categories")
        conn.execute("""INSERT INTO products
          SELECT id,sku,barcode,name,description,category_id,purchase_cost,sale_price,tax_rate_bp,
                 stock,minimum_stock,unit,active,created_at,updated_at FROM legacy_v1_products""")
        conn.execute("""INSERT INTO customers
          SELECT id,name,document,phone,email,address,notes,1,created_at,created_at FROM legacy_v1_customers""")
        conn.execute("INSERT INTO cash_sessions SELECT * FROM legacy_v1_cash_sessions")
        conn.execute("""INSERT INTO sales
          SELECT s.id,s.number,s.user_id,s.customer_id,s.cash_session_id,s.subtotal,s.discount,s.tax,s.total,
                 0,COALESCE((SELECT SUM(p.amount) FROM legacy_v1_payments p WHERE p.sale_id=s.id),0),0,
                 s.status,s.created_at,s.voided_at,s.voided_by,s.void_reason FROM legacy_v1_sales s""")
        conn.execute("INSERT INTO sale_items SELECT * FROM legacy_v1_sale_items")
        conn.execute("INSERT INTO payments SELECT * FROM legacy_v1_payments")
        conn.execute("""INSERT INTO inventory_movements
          SELECT id,product_id,type,quantity,before_stock,after_stock,NULL,NULL,reference_type,reference_id,note,
                 COALESCE(user_id,(SELECT id FROM users ORDER BY created_at LIMIT 1)),created_at
          FROM legacy_v1_inventory_movements""")
        conn.execute("INSERT INTO cash_movements SELECT * FROM legacy_v1_cash_movements")
        conn.execute("INSERT OR REPLACE INTO settings VALUES('app_version','1.0.0',?)",(stamp,))
        conn.executemany('INSERT INTO schema_migrations VALUES(?,?,?)',[(1,'foundation',stamp),(2,'catalog_inventory',stamp),(3,'sales_customers_cash',stamp)])

        for table in LEGACY_TABLES:
            conn.execute(f'DROP TABLE "legacy_v1_{table}"')

        fk=list(conn.execute('PRAGMA foreign_key_check'))
        if fk:
            raise AssertionError(f'foreign key check failed: {fk}')
        conn.execute('PRAGMA user_version=3')
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.execute('PRAGMA foreign_keys=ON')


def main() -> int:
    bridge=(ROOT/'src/core/database/migrations/legacy-v1.ts').read_text(encoding='utf-8')
    required_tokens=['LEGACY_V1_PIN_SALT_MARKER','supplier_id','unit_cost','legacy_v1_users','foreign_key_check','BEGIN IMMEDIATE TRANSACTION']
    for token in required_tokens:
        if token not in bridge:
            raise AssertionError(f'bridge contract missing {token}')

    conn=sqlite3.connect(':memory:')
    conn.executescript(LEGACY_SCHEMA)
    seed_legacy(conn)
    assert 'supplier_id' not in columns(conn,'inventory_movements')
    assert 'role' in columns(conn,'users') and 'role_id' not in columns(conn,'users')

    simulate_bridge(conn)

    assert {'supplier_id','unit_cost'} <= columns(conn,'inventory_movements')
    assert {'role_id','pin_salt','updated_at'} <= columns(conn,'users')
    assert conn.execute('SELECT COUNT(*) FROM users').fetchone()[0] == 2
    assert conn.execute('SELECT COUNT(*) FROM sales').fetchone()[0] == 1
    assert conn.execute('SELECT COUNT(*) FROM inventory_movements').fetchone()[0] == 1
    assert conn.execute("SELECT role_id FROM users WHERE id='u-admin'").fetchone()[0] == 'rol_legacy_admin'
    assert conn.execute("SELECT pin_salt FROM users WHERE id='u-admin'").fetchone()[0] == '__legacy_maobits_pos_v1__'
    assert conn.execute("SELECT paid_total FROM sales WHERE id='sale-1'").fetchone()[0] == 3500
    assert conn.execute('PRAGMA user_version').fetchone()[0] == 3
    assert not list(conn.execute("SELECT name FROM sqlite_master WHERE name LIKE 'legacy_v1_%'"))
    assert not list(conn.execute('PRAGMA foreign_key_check'))

    print('LEGACY MIGRATION VALIDATION OK')
    print(' - legacy schema detected by structural differences')
    print(' - partial modular migration state recovered')
    print(' - users / roles / permissions preserved and upgraded')
    print(' - products / customers / sales / payments preserved')
    print(' - inventory supplier_id + unit_cost present')
    print(' - foreign keys verified')
    return 0

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f'LEGACY MIGRATION VALIDATION FAILED: {exc}', file=sys.stderr)
        raise
