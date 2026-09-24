# Checkpoint 15 — Dates, Purchase Feedback, Inventory Semantics

## Native date input

Dates are no longer typed manually.

`DatePickerField` owns the platform calendar interaction and emits the
canonical `YYYY-MM-DD` value used by repository/service filters.

This component is used by:

- Reports custom range;
- Purchases date range;
- Cash history date range.

The pattern should be reused for any future custom date field.

## Reports: Today

Reports now support:

- Today;
- 7 days;
- 30 days;
- 90 days;
- 1 year;
- All;
- Custom calendar range.

Today represents the complete current local calendar day.

## Purchase add feedback

Adding a product to a purchase is intentionally visible:

1. line is created/incremented;
2. Android displays a native toast;
3. the Add button temporarily becomes an Added state;
4. the screen scrolls to the Purchase lines section.

This prevents a successful tap from looking like a failed interaction.

## Inventory semantics

The previous top metric called "Units" was the sum of product stock values.
A value such as 5 therefore meant five physical units across the currently
loaded rows, which was not clear enough.

Inventory now reports explicit global metrics independent of the search box:

- Active products;
- Units in stock;
- Low-stock products;
- Out-of-stock products;
- Inventory at cost (permission protected).

Individual product rows display `N units`.

## PDF actions

PDF printing remains supported.

Visible PDF sharing actions were removed from product screens because the
tested Android sharing workflow was not reliable enough for this release.
Backup/export sharing is not changed by this checkpoint.
