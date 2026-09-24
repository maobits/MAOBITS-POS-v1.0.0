# Checkpoint 24 — POS toolbar and product-image lightbox

## POS

The redundant **Apply offer** button located immediately beside
**Print / Save PDF** is removed from the POS toolbar.

Offer application remains available in Checkout under:

Checkout → Discounts and offers → Apply offer

The underlying offer domain and Checkout validation are unchanged.

## Product preview

The product detail opened from the eye action now uses a reusable
`ZoomableImage`.

Tapping the main product image:

1. opens a full-screen native Modal;
2. renders the image with `contain` so it is not cropped;
3. darkens the background for visual focus;
4. provides a visible close button;
5. supports Android back-button close;
6. also closes when the backdrop is tapped.

The normal product-detail modal remains open underneath and is restored
when the enlarged image is closed.

The change is UI-only; product data, images and persistence are unchanged.
