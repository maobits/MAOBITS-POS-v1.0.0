# Checkpoint 17 — Cash Denominations and Physical Counter

## Purpose

Cash closing now supports an actual physical denomination count instead of
requiring the cashier to calculate the total manually.

## Settings

Path:

Settings → Currency → Cash denominations

Configuration is independent for:

- COP
- USD
- EUR

Each currency has two editable groups:

- Coins
- Banknotes

The configuration is persisted in the existing `settings` table:

- `cash_denominations_COP`
- `cash_denominations_USD`
- `cash_denominations_EUR`

No schema migration is required.

Because the settings table is already part of MAOBITS POS backups, the
denomination configuration travels with normal backup/restore.

## Money representation

MAOBITS POS stores integer minor units.

- COP uses whole pesos.
- USD uses cents.
- EUR uses cents.

Examples:

- COP 5,000 = `5000`
- USD $1.00 = `100`
- EUR €2.00 = `200`

The denomination editor accepts normal human amounts and converts them to
the correct internal representation.

## Closing cash

Path:

Cash → Close cash

Next to **Counted cash** there is a calculator action.

The counter contains:

1. Coins.
2. Banknotes.
3. Quantity per denomination.
4. Subtotal per denomination.
5. Running total.
6. Apply count.

When **Apply count** is pressed, the calculated total becomes the value of
`counted` used by the existing cash-closing Service.

The expected amount and difference calculations remain unchanged.
