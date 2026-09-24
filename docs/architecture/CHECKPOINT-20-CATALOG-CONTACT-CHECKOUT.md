# Checkpoint 20 — Catalog image grids, Checkout offers and business contact

## Multiple product images

Printed catalog snapshots now preserve all product images, not only the
featured image.

Migration 006 adds `catalog_offer_item_images`.

Each product continues to occupy one A4 page. The image area is the only
part that becomes a grid:

- 1 image: single large image;
- 2 images: two-column grid;
- 3 images: one wide image plus two supporting images;
- 4 images: balanced 2x2 grid;
- 5+ images: adaptive three-column image-only grid.

Text, pricing, discount notes and business data remain outside the image
grid so the page keeps the visual hierarchy introduced in Checkpoint 19.

## Category organization

The catalog builder now groups products under category headings and each
product also shows an explicit Category badge.

## Offers during Checkout

Checkout now exposes **Discounts and offers** before the payment method.

The operator can:

- open a modal with currently valid printed offers;
- inspect category and product-specific rules;
- apply an offer;
- remove the applied offer.

The cart still stores only the offer ID/name. Checkout Service remains the
authority that revalidates the printed offer and calculates the final
discount before persisting the sale.

## Business contact

Settings now includes, immediately before Currency:

- business email;
- phone number with international/area code.

Values are persisted in the existing `settings` table using:

- `business_email`
- `business_phone`

A phone value must include the leading `+`, for example
`+57 315 377 4638`.

The printed catalog footer includes the business name, email and phone on
every product page.

Because contact data uses the existing Settings table, the current backup
system already preserves it.
