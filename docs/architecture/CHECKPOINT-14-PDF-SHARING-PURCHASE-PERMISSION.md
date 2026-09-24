# Checkpoint 14 — Reliable PDF Sharing + Purchase History Permission

## Purchase-history authorization

Purchase history is a different capability from looking at stock.

The permission model now separates:

- `INVENTORY_VIEW`: view stock and inventory movements.
- `INVENTORY_PURCHASE`: register a new supplier purchase.
- `PURCHASES_VIEW`: browse purchase history and open purchase details.

The route in **More**, the button in **Inventory**, and the Purchase Service
all enforce `PURCHASES_VIEW`.

## PDF sharing on Android

The previous direct `file://` URI returned by `expo-print` did not open the
system share sheet on the tested device.

The new flow is:

HTML
→ `Print.printToFileAsync()`
→ `File(rendered.uri)`
→ copy to `Paths.cache`
→ verify file exists and size > 0
→ Android `File.contentUri`
→ `Sharing.shareAsync()`

If Android rejects the content URI, the helper retries with the normal
`file://` URI.

On iOS, the cache file URI is shared with the PDF UTI.

This implementation uses the modern Expo FileSystem `File` and `Paths` API.
