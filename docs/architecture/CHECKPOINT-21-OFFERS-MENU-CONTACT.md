# Checkpoint 21 — Offers availability, More menu and catalog contact

## Offers moved to More

Offers and catalogs are an operational commercial module, not a general
application setting.

The route is now exposed in:

More → Offers and catalogs

with permission:

`CATALOG_PRINT`

The old Settings card is removed.

## Offer publication timing

Checkpoint 20 marked a catalog as printed only after the platform print
dialog returned.

On Android / Expo Go that made offer availability dependent on the native
print dialog lifecycle.

Checkpoint 21 freezes and records the catalog version immediately before
opening the native print dialog.

That means clicking **Print / Save PDF** publishes the exact promotional
version first and then opens the native print workflow.

Existing catalogs created before Checkpoint 21 should be printed once again
after applying this patch so they receive a reliable published snapshot.

## Current-offer filtering

Current offers are no longer filtered with SQLite `datetime()`.

The repository now:

1. loads active published offers for the current currency;
2. parses validity with JavaScript timestamps;
3. keeps only offers whose start/end range contains the current time;
4. hydrates category rules, product rules and snapshot items;
5. rejects offers that have no printed snapshot products.

This avoids SQLite date-format/timezone edge cases while keeping the same
business rule.

## Business contact in catalog

The business-contact editor now lives inside the business identity section,
immediately after the business name.

Every catalog page footer contains:

- configured business logo;
- business name;
- email;
- phone with country/area code;
- catalog validity/version text.

Email and phone are displayed with explicit labels so it is clear when a
field is still not configured.
