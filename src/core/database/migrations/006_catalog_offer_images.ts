export const migration006 = `
CREATE TABLE IF NOT EXISTS catalog_offer_item_images (
  offer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  uri TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(offer_id,product_id,sort_order),
  FOREIGN KEY(offer_id,product_id)
    REFERENCES catalog_offer_items(offer_id,product_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_catalog_offer_item_images_offer
  ON catalog_offer_item_images(offer_id,product_id,sort_order);
`;
