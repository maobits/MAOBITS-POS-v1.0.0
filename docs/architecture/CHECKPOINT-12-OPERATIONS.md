# Checkpoint 12 — Operational UX, purchases, cash analytics and supplier accounts

This checkpoint extends MAOBITS POS without changing the core architectural
rule: Route/Screen → Service → Repository → SQLite.

## Scanner feedback

A successful scan adds the product to the cart and confirms the action using
three channels: a short local beep (`expo-audio`), success haptics and an
on-screen confirmation. A failed scan keeps the existing error flow.

## Customer checkout

Customer selection is list-first: search and pagination are visible first.
The quick-create form is opened explicitly and requires name, document number
and mobile phone. Shared `ModalSheet` keyboard avoidance keeps the received
cash field and actions above the software keyboard.

## Purchases

Purchases have a dedicated flow and history module. Supplier selection is
searchable and paginated. Purchase creation atomically updates inventory,
purchase history and the supplier current account. Cash payments also create
a cash expense movement. Purchase tickets can be printed or shared as PDF.

## Supplier current account

`migration004` introduces `supplier_account_entries`. Positive impacts mean
money owed to a supplier. Negative impacts are payments or credit balances.
Existing purchases are backfilled as payable entries because earlier product
versions did not persist supplier payments at purchase time.

## Customers

Customer payments and credits generate printable/shareable movement tickets.
Purchase history and current-account ledgers can be exported as reports.

## Cash visibility and analytics

Users with `USERS_MANAGE` are treated as administrators for cash supervision:
they can inspect all cashiers and sessions. Other users only see their own
cash session history. Analytics keep session totals separate from movement
aggregates to avoid duplicate sums when a session has multiple movements.

## Reports

Reports include purchases, supplier accounts and cash analytics. A general
report builder lets the user choose balances for products, categories,
suppliers, sales, cash, cashiers, taxes and inventory before generating PDF.

## Credits and branding

The Credits card links MAOBITS identity and services. It uses the institutional
services artwork bundled in `assets/branding/servicios-maobits-final.jpg`.
The course link is intentionally centralized in `app/settings.tsx`; until a
specific course URL is supplied, it uses the MAOBITS website as the default.
