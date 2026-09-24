# Checkpoint 19 — Catalog presentation polish

## Demo-data notification

The protected Settings action no longer calls the nonexistent
`common.ok` translation after loading demo data.

It now displays explicit localized success messages:

- Demo data loaded successfully.
- Operational data deleted successfully.

## Category selector

Catalog categories now render the actual Ionicons glyph stored by each
category. The raw icon name is never shown to the user.

When a category is selected:

- category name remains white;
- category-discount label remains white;
- discount input has a white surface and black text for legibility.

## Discount priority

Both discount levels remain valid:

1. Category discount is the default for products in that category.
2. Product-specific discount overrides the category discount when the
   product has an explicit value.

An explicit product value of 0% is also an override and therefore suppresses
the inherited category discount for that product.

The repository already implemented this business rule with:

`WHEN opr.product_id IS NOT NULL THEN opr.discount_bp ELSE ocr.discount_bp`

Checkpoint 19 makes that rule explicit in the UI and tests.

## Before / after prices

The catalog builder shows for every product:

- Price before.
- Price after.

The printed catalog uses the same two-price presentation for every product,
including products without an effective discount.

## One product per page

Each catalog product is now rendered on its own A4 page.

Every page preserves the established visual language:

- purple/indigo MAOBITS promotional header;
- configured business logo;
- business name;
- catalog name;
- category;
- validity;
- large product image;
- before/after prices;
- discount source and percentage;
- offer terms;
- catalog-version footer.

This layout is optimized for a polished catalog that can be printed or saved
as PDF and then distributed through channels such as WhatsApp.
