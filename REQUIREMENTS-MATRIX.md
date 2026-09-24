# Matriz de requisitos — MAOBITS POS v1.0.0

| Requisito | Área | Hito | Estado | Evidencia / pendiente |
|---|---|---:|---|---|
| Expo/Router/TypeScript | `core/app` | H1 | **IMPLEMENTED_SOURCE** | Real SDK typecheck pending npm install |
| Theme light/dark/system | `core/theme` | H1 | **IMPLEMENTED_SOURCE** | Device visual QA pending |
| ES/EN i18n | `core/i18n` | H1 | **IMPLEMENTED_SOURCE** | Device navigation QA pending |
| COP/USD/EUR + MoneyField | `core/money` | H1 | **AUX_VERIFIED** | Native field QA pending |
| SQLite connection/migrations | `core/database` | H2 | **VERIFIED_AUX** | 3 migrations executed in sqlite3 |
| Foreign keys/constraints | `core/database` | H2 | **VERIFIED_AUX** | Smoke constraints passed |
| Repository/Service boundary | `architecture` | H2 | **VERIFIED_AUX** | UI SQLite import audit passed |
| First admin + PIN hash/salt | `auth/security` | H3 | **IMPLEMENTED_SOURCE** | Device login QA pending |
| Login/logout/session | `auth` | H3 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Custom roles CRUD | `roles` | H4 | **IMPLEMENTED_SOURCE** | Device QA pending |
| 20 granular permissions | `roles` | H4 | **VERIFIED_AUX** | Catalog presence verified |
| Permission checks in Services | `roles/core` | H4 | **IMPLEMENTED_SOURCE** | Scenario QA pending |
| PRODUCT_COST_VIEW | `products/inventory` | H4 | **IMPLEMENTED_SOURCE** | Role scenario QA pending |
| Suppliers CRUD/search/page | `suppliers` | H5 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Supplier logo persistent | `suppliers/media` | H5 | **IMPLEMENTED_SOURCE** | Image Picker QA pending |
| Categories CRUD/icons/page | `categories` | H5 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Category reports | `categories/reports` | H5 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Products CRUD/search/page | `products` | H6 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Category modal selector | `products` | H6 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Multiple suppliers | `products` | H6 | **IMPLEMENTED_SOURCE** | Integration QA pending |
| Multiple persistent images | `products/media` | H6 | **IMPLEMENTED_SOURCE** | Native media QA pending |
| Featured image | `products/media` | H6 | **IMPLEMENTED_SOURCE** | Native media QA pending |
| EAN-13 generation/checksum | `barcode` | H6 | **VERIFIED_AUX** | Demo checksums verified |
| EAN-13 PDF label print/share | `barcode/pdf` | H6 | **IMPLEMENTED_SOURCE** | Native print/share pending |
| Product mini report | `products/reports` | H6 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Inventory movement ledger | `inventory` | H7 | **IMPLEMENTED_SOURCE** | Integration QA pending |
| Stock adjustment | `inventory` | H7 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Purchases by supplier | `inventory` | H7 | **IMPLEMENTED_SOURCE** | Integration QA pending |
| Low/out stock alerts | `inventory/reports` | H7 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Customers CRUD/active/page | `customers` | H8 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Purchase history + stats | `customers` | H8 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Customer account ledger | `customer-account` | H8 | **IMPLEMENTED_SOURCE** | Integration QA pending |
| Debt/credit/payment | `customer-account` | H8 | **IMPLEMENTED_SOURCE** | Scenario QA pending |
| POS catalog/search/categories/page | `pos` | H9 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Toast add/remove + undo | `pos/cart` | H9 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Floating cart/scanner | `pos` | H9 | **IMPLEMENTED_SOURCE** | Native camera pending |
| Editable cart | `pos/cart` | H9 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Checkout customer select/create | `checkout` | H10 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Prior debt separated from sale | `checkout/math` | H10 | **IMPLEMENTED_SOURCE** | Vitest pending npm install |
| Apply credit balance | `checkout/math` | H10 | **IMPLEMENTED_SOURCE** | Vitest pending npm install |
| Credit sale requires customer | `checkout` | H10 | **IMPLEMENTED_SOURCE** | Integration QA pending |
| Atomic sale transaction | `checkout/database` | H10 | **IMPLEMENTED_SOURCE** | Real Expo SQLite QA pending |
| Cash session open/close | `cash` | H11 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Single open cash constraint | `cash/database` | H11 | **VERIFIED_AUX** | SQLite constraint passed |
| Cash movements/expected/count | `cash` | H11 | **IMPLEMENTED_SOURCE** | Scenario QA pending |
| Sales history quick filters | `sales` | H12 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Advanced sales filters | `sales` | H12 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Void/reversal with audit | `sales` | H12 | **IMPLEMENTED_SOURCE** | Scenario QA pending |
| Receipt PDF/print/share | `sales/pdf` | H12 | **IMPLEMENTED_SOURCE** | Native print/share pending |
| Dashboard real SQLite KPIs | `reports` | H13 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Bar/line/donut charts | `shared/reports` | H13 | **IMPLEMENTED_SOURCE** | Visual QA pending |
| Supplier purchase report | `reports` | H13 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Customer account report | `reports` | H13 | **IMPLEMENTED_SOURCE** | Dataset QA pending |
| Integral backup data+media | `backup` | H14 | **IMPLEMENTED_SOURCE** | Native E2E restore pending |
| Supplier/product media in backup | `backup/media` | H14 | **IMPLEMENTED_SOURCE** | Native E2E restore pending |
| Protected demo seed | `settings` | H14 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Protected operational purge | `settings` | H14 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Business settings | `settings` | H14 | **IMPLEMENTED_SOURCE** | Device QA pending |
| Keyboard avoidance global | `shared/ui` | H14 | **IMPLEMENTED_SOURCE** | Android/iOS QA pending |
| MAOBITS Room manifests | `course` | H15 | **VERIFIED_AUX** | 15 modules |
| MAOBITS Room slide scenes | `course` | H15 | **VERIFIED_AUX** | 105 scenes |
| Module exporter | `course/scripts` | H15 | **VERIFIED_AUX** | H6 export smoke passed |
| Assembly graph | `maobits-room` | H15 | **VERIFIED_AUX** | Contract verifier passed |
| Real npm typecheck/tests/doctor | `qa` | H15 | **PENDING_ENV** | npm registry unavailable in generator |
| Android/iOS native validation | `qa` | H15 | **PENDING_DEVICE** | Requires device/emulator |
| Migración automática legacy v1 → modular | `core/database/migrations/legacy-v1` | H2 | **VERIFIED_AUX** | SQLite simulation + FK check passed |
| Upgrade de PIN legacy tras login | `auth/security` | H3 | **IMPLEMENTED_SOURCE** | Real-device legacy login pending |
| Expo Router única raíz `app/` | `app/core` | H1 | **VERIFIED_AUX** | Validator rejects `src/app` collision |
| Premium native Design System | `core/theme/shared/ui` | H1 | **VERIFIED_AUX** | Token/accessibility tests defined |
| GUI 100% React Native / no Tailwind DOM | `app/shared/ui` | H1 | **VERIFIED_AUX** | Source validator passed |
| Responsive móvil/tablet | `shared/ui/screens` | H1 | **IMPLEMENTED_SOURCE** | Device visual QA pending |
| Touch targets >=44 px | `core/theme/shared/ui` | H1 | **IMPLEMENTED_SOURCE** | Test defined; device QA pending |
| Premium ES/EN copy parity | `core/i18n` | H1 | **IMPLEMENTED_SOURCE** | Static contract + Vitest defined |
| UX assembly map | `maobits-room/ui-assembly-map.json` | H15 | **VERIFIED_AUX** | Source path/structure verified |
| Supplier persistent logo | `suppliers/media` | H5 | **IMPLEMENTED_SOURCE** | Native Image Picker QA pending |
| Backup rejects missing referenced media | `core/backup` | H14 | **IMPLEMENTED_SOURCE** | Native E2E restore pending |
| 7 Vitest files / 23 defined cases | `tests` | H15 | **DEFINED** | Execute after npm install |
