# Checkpoint 13 — PDF sharing, reports and cash i18n

## PDF sharing

`Print.printToFileAsync()` already returns a local PDF URI in the app cache.
The application now shares that URI directly with `expo-sharing`.

Flow:

HTML -> Print.printToFileAsync() -> local PDF URI -> Sharing.shareAsync()

No extra copy operation is required.

## Report period filters

`cash_sessions` stores its date in `opened_at`, not `created_at`.

Checkpoint 12 used the generic `created_at` range helper for cash sessions.
That only failed when a date filter was active, which explains why the
unfiltered **All** view worked.

The date-range helper now accepts the physical date column and uses
SQLite `julianday()` so ISO and legacy date strings are compared safely.

Cash uses:

`range('cs', filter, 'opened_at')`

Sales and purchases continue using `created_at`.

The 7, 30 and 90 day filters now represent complete local calendar days.

## Cash movement localization

Database values remain stable domain codes:

- SALE
- SALE_REVERSAL
- CUSTOMER_PAYMENT
- INCOME
- WITHDRAWAL
- EXPENSE

Presentation uses `cashMovementLabel(type, locale)`.

This preserves database contracts while exposing human-readable ES/EN
labels in the app and cash tickets.

## Credits image

The MAOBITS services artwork is constrained by both screen width and screen
height, keeping its aspect ratio with `resizeMode="contain"`.
