# Esquema SQLite

## Migración 001 — Foundation

`schema_migrations`, `settings`, `roles`, `permissions`, `role_permissions`, `users`.

## Migración 002 — Catálogo e inventario

`categories`, `suppliers`, `products`, `product_suppliers`, `product_images`, `purchases`, `purchase_items`, `inventory_movements`.

## Migración 003 — Clientes, ventas y caja

`customers`, `cash_sessions`, `cash_movements`, `sales`, `sale_items`, `payments`, `customer_account_entries`.

## Principios

- claves foráneas activas;
- SQL parametrizado;
- índices en búsquedas y relaciones relevantes;
- dinero en unidades mínimas enteras;
- movimientos para inventario y cuenta corriente;
- venta/checkout dentro de transacción;
- ventas anuladas se conservan y revierten, no se eliminan.
