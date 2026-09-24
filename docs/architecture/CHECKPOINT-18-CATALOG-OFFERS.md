# Checkpoint 18 — Promotional Catalogs and Offers

## Catalog is a versioned commercial offer

A printed catalog is not just a visual PDF. It is a persistent commercial
version containing:

- selected categories;
- category discount percentages;
- optional per-product discount overrides;
- current prices at print time;
- calculated promotional prices;
- validity start and expiration;
- notes / conditions;
- exact products printed.

When a catalog is printed, MAOBITS POS stores a snapshot in
`catalog_offer_items`.

This allows the POS to apply the same printed promotional prices later,
instead of trusting a discount value held only in UI state.

## Permission

`CATALOG_PRINT`

Human label:

- ES: Imprimir catálogo
- EN: Print catalog

It lives in the **Home and point of sale / Inicio y Punto de venta** role
group.

## Catalog workflow

POS → Catalog → choose categories → optional category/product discounts →
validity → Save / Print.

Printing uses the business logo, product images, descriptions and the
current sale price. Discounted products show original and promotional
prices.

There is deliberately no generic Share PDF button. The catalog can be
printed/saved as PDF using the native print workflow, consistent with
Checkpoint 15.

## Offers configuration

Settings → Offers and catalogs

This module lists printed versions, validity, status, notes and discount
configuration. Editing a catalog invalidates its previous printed snapshot;
it must be printed again before it can be applied in POS.

## Applying an offer in POS

POS shows current printed offers for the active currency.

Applying an offer writes only the offer ID to cart state. Checkout does not
trust a UI discount amount. The Checkout Service reads the printed snapshot,
compares the current product price against the catalog promotional price,
recalculates the valid discount and persists:

- sales.offer_id
- sales.offer_name
- sales.offer_discount

If the current price has fallen below the printed catalog price, applying an
offer never increases the product price.

## Reports

Reports adds an Offers section with:

- sales count by offer;
- gross sales associated with the offer;
- promotional discounts actually applied.

The report follows the same active date filter as sales reporting.
