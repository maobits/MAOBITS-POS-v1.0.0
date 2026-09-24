# Checkpoint 11 — Business UX, Documents and Permission Boundaries

This checkpoint keeps the Screen → Service → Repository → SQLite architecture
while improving day-to-day POS usability.

## Main changes

- Sale detail uses a human-readable `sale/customer` header.
- Sale and cash-close documents use professional ticket-style PDF output.
- PDF sharing uses an explicit cached `.pdf` file.
- Product cards can open a read-only image/detail preview.
- `PRODUCTS_VIEW` and `PRODUCTS_EDIT` remain separate capabilities.
- Suppliers have independent `SUPPLIERS_VIEW` and `SUPPLIERS_EDIT` permissions.
- Checkout quick-customer creation requires name, document and mobile phone.
- Cash received participates in settlement math and change calculation.
- POS and Inventory tabs expose live operational badges.
- Reports support period and custom date filters.
- PIN format is exactly four numeric digits.
- Business branding can include a locally persisted logo used on login and tickets.
- Protected demo/purge actions display their exact confirmation phrase.
- Sale void can use a one-action administrator PIN override without replacing the
  current user session.

## Security rule

A visible action is not authorization. Services continue to enforce canonical
PermissionCode values. The administrator override resolves an administrator
identity and calls `salesService.void` using that administrator as the actor,
so the reversal remains auditable while the cashier session stays open.

## MAOBITS Room assembly

Human action → UI affordance → PermissionCode → Service rule → SQLite/PDF side effect.
