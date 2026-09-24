# Checkpoint 16 — Inventory Pagination

The Inventory product list now uses database pagination.

## Contract

The inventory list requests 12 rows at a time:

`inventoryService.overview(actorId, search, page, 12)`

SQLite performs:

- filtered `COUNT(*)`;
- `LIMIT`;
- `OFFSET`.

The UI receives:

- `items`;
- `total`;
- `page`;
- `pageSize`;
- `pages`.

## Search

Changing the search text resets the list to page 1.

## Metrics

Inventory headline metrics remain global and independent from the current
search/page:

- Active products;
- Physical units in stock;
- Low-stock products;
- Out-of-stock products;
- Inventory at cost when authorized.

Pagination only affects the product-list section.
