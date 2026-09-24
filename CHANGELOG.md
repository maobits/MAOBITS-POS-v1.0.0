## Checkpoint 27

- Fixed the Login PIN label rendering `PIN de {name}` literally.
- Removed unsupported variable interpolation from the current i18n helper usage.
- Login now composes the localized PIN prefix with the selected user's real name.

## Checkpoint 26

- Added Safe Area protection to Login on Android/iOS.
- Login action now remains above the device navigation area.
- Login form can scroll vertically on short screens.
- Preserved horizontal avatar-based user selector and authentication behavior.

## Checkpoint 25

- Added optional local avatars for POS users.
- Added migration 007 with users.avatar_uri.
- User administration can select, replace and remove avatar images.
- Login user selector is now a horizontal scrollable identity panel.
- Login cards display avatar, user name, role and selected state.
- SessionUser carries avatarUri for authenticated UI.
- User avatars are included in backup and remapped on restore.

## Checkpoint 24

- Removed the redundant Apply Offer button beside Print / Save PDF in POS.
- Offer selection remains available in Checkout.
- Product preview main image can now be expanded to a full-screen lightbox.
- Added backdrop close, visible close control and Android back-button support.
- Product persistence and image data remain unchanged.

## Checkpoint 21

- Moved Offers and Catalogs from Settings to the More operational menu.
- Catalog versions are now published before the native print dialog opens.
- Replaced SQLite datetime offer filtering with robust JavaScript validity checks.
- Current offers require an actual printed snapshot with products.
- Moved business email/phone next to the business name configuration.
- Added business logo, name, email and phone to every catalog-page footer.

## Checkpoint 20

- Printed catalogs now use an image-only grid when a product has multiple images.
- Added migration 006 to preserve every image in printed catalog snapshots.
- Catalog builder now groups products by category and labels each product category.
- Checkout can select and apply a current catalog offer from the discount area.
- Settings now stores business email and phone with international/area code.
- Catalog footer now includes business name, email and phone on every page.

## Checkpoint 19

- Fixed localized success notifications for demo-data load and purge.
- Catalog category selector now renders real Ionicons instead of icon names.
- Improved selected category discount readability.
- Made product-specific discounts explicitly higher priority than category discounts.
- Catalog builder now shows before/after price for every product.
- Printed catalog now uses one product per A4 page with the configured business logo.
- Preserved the existing MAOBITS indigo/purple promotional visual language.

## Checkpoint 18

- Added CATALOG_PRINT permission in Home/POS role group.
- Added promotional catalog builder with category/product discounts.
- Printed catalogs persist an exact product/price promotional snapshot.
- Added Offers and Catalogs configuration module.
- POS can apply a current printed offer without trusting UI discount values.
- Checkout revalidates and persists offer discounts transactionally.
- Reports now include promotional discounts actually applied.
- Catalog/offer tables are included in backup and restore.

## Checkpoint 17

- Added configurable cash denominations for COP, USD and EUR.
- Added coin/banknote denomination editor under Currency settings.
- Added physical cash counter to Close Cash.
- Counted denomination total can be applied directly to counted cash.
- Denomination settings are persisted in the existing settings table.

## Checkpoint 16

- Added SQLite pagination to the Inventory product list.
- Inventory loads 12 products per page with COUNT/LIMIT/OFFSET.
- Search resets inventory pagination to page 1.
- Global inventory metrics remain independent from pagination.

## Checkpoint 15

- Replaced manual custom-date entry with native calendar pickers.
- Added Today to analytics report periods.
- Added observable feedback when adding products to supplier purchases.
- Clarified inventory counts as active products vs physical units in stock.
- Removed visible PDF sharing actions while preserving printing.
- Added regression tests for the new UX contracts.

## Checkpoint 14

- Added PURCHASES_VIEW permission for purchase history.
- Separated purchase-history access from inventory browsing.
- Reworked PDF sharing with Expo FileSystem File/Paths.
- Android sharing now prefers a content:// URI with file:// fallback.
- Added PDF file existence/size validation before opening the share sheet.

## Checkpoint 13

- Fixed PDF sharing by sharing the expo-print PDF URI directly.
- Made the MAOBITS services artwork responsive in Credits.
- Localized cash movement codes in Spanish and English.
- Fixed report period filters using cash_sessions.opened_at.
- Added SQLite julianday comparisons and full local-day ranges.

# Changelog

## 1.0.0 — Expo Premium Modular Rebuild

### UX / accesibilidad
- Reconstrucción visual completa en React Native/Expo inspirada en la experiencia React + Tailwind + Vite suministrada.
- Design System nativo con tokens, primitives, patterns y pantallas.
- Responsive móvil/tablet, superficies premium, navegación clara, estados y jerarquía visual.
- Controles táctiles >= 44 px, labels de accesibilidad y keyboard avoidance.
- POS premium, dashboard, inventario, clientes, checkout, caja y administración rediseñados.
- No se usa Tailwind, Vite ni DOM en la app móvil.

### Arquitectura
- `Screen → Service → Repository → SQLite` preservado.
- Root Expo Router consolidada en `app/`.
- Protección contra recrear `src/app/`.
- Roles/permisos protegidos también en Services.
- PRODUCT_COST_VIEW no puede filtrarse mediante edición indirecta.

### Datos y compatibilidad
- Puente de migración legacy → esquema modular.
- Preservación de usuarios, categorías, productos, clientes, ventas, pagos, inventario y caja.
- Upgrade del PIN legacy al nuevo hash/salt tras autenticación correcta.
- `PRAGMA foreign_key_check` antes del commit de migración.

### Funcionalidad
- Proveedores con logo persistente.
- Productos multi-proveedor/multi-imagen, featured image y EAN-13.
- Inventario, compras, current account, POS, checkout, caja, ventas, reversión y reportes.
- Backup integral endurecido: falla ante medios referenciados faltantes y valida estructura antes de restaurar.
- ES/EN ampliado para toda la nueva UI premium.


### Checkpoint 12 — Operación avanzada
- Escáner con confirmación sonora, háptica y visual al agregar al carrito.
- Selector de clientes filtrado/paginado y alta rápida explícita en checkout.
- Compras con historial, filtros, detalle, ticket PDF y cuenta corriente de proveedor.
- Abonos/créditos de clientes y proveedores con comprobantes y reportes imprimibles/compartibles.
- Supervisión de caja por cajero, cuadres, faltantes, gastos/retiros y reportes administrativos.
- Reporte general componible: productos, categorías, proveedores, ventas, caja, cajeros, impuestos e inventario.
- Módulos de Más reactivos al idioma ES/EN.
- Créditos MAOBITS ampliados con enlaces, servicios e imagen institucional.

### MAOBITS Room
- 15 módulos pedagógicos y 105 escenas.
- UX Design System documentado como contenido desmontable.
- `ui-assembly-map.json` añadido para explicar el ensamblaje visual.
- Flujo didáctico: necesidad → token → primitive → pattern → screen → Service → data → checkpoint.

### QA
- Validator de arquitectura, Expo Router, permisos, SQLite, legacy migration, EAN y web-runtime leakage.
- 8 archivos Vitest / 26 casos definidos.
- Typecheck auxiliar con stubs pasa en el entorno de generación.
