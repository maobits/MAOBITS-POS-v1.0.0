#!/usr/bin/env python3
from pathlib import Path
import json,re,sqlite3,sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]

def fail(msg): errors.append(msg)

# Required architecture
required=[
 'src/core/database/index.ts','src/core/database/migrations/legacy-v1.ts','src/core/permissions/catalog.ts','src/modules/roles/service.ts',
 'src/modules/products/service.ts','src/modules/inventory/service.ts','src/modules/customer-account/service.ts',
 'src/modules/checkout/service.ts','src/modules/cash/service.ts','src/modules/sales/service.ts','src/modules/reports/service.ts',
 'src/core/backup/service.ts','app/(tabs)/pos.tsx','app/checkout.tsx','docs/course/ASSEMBLY-GUIDE.md'
]
for rel in required:
    if not (ROOT/rel).exists(): fail(f'missing {rel}')


# Expo Router invariant: routes live in root app/. src/app would shadow it.
if (ROOT/'src/app').exists(): fail('reserved Expo Router collision: src/app must not exist while routes live in app/')

# Legacy bridge is part of the release contract because old builds use the same DB filename.
legacy=(ROOT/'src/core/database/migrations/legacy-v1.ts').read_text(encoding='utf-8')
for token in ['LEGACY_V1_PIN_SALT_MARKER','supplier_id','unit_cost','legacy_v1_users','foreign_key_check']:
    if token not in legacy: fail(f'legacy migration contract missing: {token}')

# Premium UX must remain native Expo. HTML strings are allowed only for PDF/print
# generation, so DOM-element checks are limited to route/UI source.
for base in ['app','src']:
    for p in (ROOT/base).rglob('*'):
        if p.suffix in {'.ts','.tsx'}:
            text=p.read_text(encoding='utf-8')
            for forbidden in ['tailwindcss','react-dom/client']:
                if forbidden in text: fail(f'web-only runtime dependency {forbidden}: {p.relative_to(ROOT)}')
for p in (ROOT/'app').rglob('*.tsx'):
    text=p.read_text(encoding='utf-8')
    for forbidden in ['<div','<button','className=']:
        if forbidden in text: fail(f'web DOM leaked into Expo route {forbidden}: {p.relative_to(ROOT)}')

# Important user-visible props in Expo routes must use i18n instead of literal text.
# Language-neutral values such as icon names and numeric accessibility labels are not in this set.
visible_props = ['title','subtitle','label','placeholder','eyebrow','hint']
literal_prop = re.compile(r'\\b(' + '|'.join(visible_props) + r')="([^"{}]+)"')
for p in (ROOT/'app').rglob('*.tsx'):
    text=p.read_text(encoding='utf-8')
    for match in literal_prop.finditer(text):
        value=match.group(2).strip()
        if re.search(r'[A-Za-zÁÉÍÓÚáéíóúÑñ]', value):
            fail(f'direct user-visible string without i18n ({match.group(1)}): {p.relative_to(ROOT)} -> {value}')

# No business screen may import SQLite directly.
for p in (ROOT/'app').rglob('*.tsx'):
    s=p.read_text(encoding='utf-8')
    if "@/core/database" in s or "expo-sqlite" in s: fail(f'UI bypasses Service/Repository: {p.relative_to(ROOT)}')

# Critical source cannot contain unfinished markers.
for base in ['app','src']:
    for p in (ROOT/base).rglob('*'):
        if p.suffix in {'.ts','.tsx'}:
            s=p.read_text(encoding='utf-8')
            if re.search(r'\b(TODO|FIXME|HACK)\b',s): fail(f'unfinished marker: {p.relative_to(ROOT)}')

# Permission catalog contract.
perm=(ROOT/'src/core/permissions/catalog.ts').read_text(encoding='utf-8')
expected=['DASHBOARD_VIEW','POS_SELL','CATALOG_PRINT','PRODUCTS_VIEW','PRODUCTS_EDIT','PRODUCT_COST_VIEW','INVENTORY_VIEW','INVENTORY_ADJUST','INVENTORY_PURCHASE','PURCHASES_VIEW','SUPPLIERS_VIEW','SUPPLIERS_EDIT','CUSTOMERS_VIEW','CUSTOMERS_EDIT','CUSTOMER_CREDIT_MANAGE','CASH_OPEN_CLOSE','CASH_MOVEMENTS','SALES_VIEW','SALES_VOID','REPORTS_VIEW','SCANNER_USE','USERS_MANAGE','SETTINGS_MANAGE','BACKUP_MANAGE']
for code in expected:
    if f"'{code}'" not in perm: fail(f'permission missing: {code}')

# All 15 course manifests must be valid and ordered.
mods=sorted((ROOT/'course/modules').glob('*/module.manifest.json'))
if len(mods)!=15: fail(f'expected 15 module manifests, found {len(mods)}')
for i,p in enumerate(mods,1):
    try: data=json.loads(p.read_text(encoding='utf-8'))
    except Exception as e: fail(f'invalid manifest {p}: {e}'); continue
    if data.get('hito')!=i: fail(f'manifest order mismatch {p}')
    if len(data.get('slides',[]))<7: fail(f'manifest has incomplete slide sequence {p}')

# Execute SQLite migrations in a real sqlite3 engine.
conn=sqlite3.connect(':memory:')
conn.execute('PRAGMA foreign_keys=ON')
for rel in ['src/core/database/migrations/001_foundation.ts','src/core/database/migrations/002_catalog_inventory.ts','src/core/database/migrations/003_sales_customers_cash.ts','src/core/database/migrations/004_supplier_accounts.ts','src/core/database/migrations/005_catalog_offers.ts','src/core/database/migrations/006_catalog_offer_images.ts','src/core/database/migrations/007_user_avatars.ts']:
    s=(ROOT/rel).read_text(encoding='utf-8')
    m=re.search(r'`([\s\S]*)`',s)
    if not m: fail(f'cannot extract migration {rel}'); continue
    try: conn.executescript(m.group(1))
    except Exception as e: fail(f'migration failed {rel}: {e}')
# Check migration 004 backfills purchases created by older modular builds.
try:
    backfill=sqlite3.connect(':memory:')
    backfill.execute('PRAGMA foreign_keys=ON')
    for rel in [
        'src/core/database/migrations/001_foundation.ts',
        'src/core/database/migrations/002_catalog_inventory.ts',
        'src/core/database/migrations/003_sales_customers_cash.ts',
    ]:
        text=(ROOT/rel).read_text(encoding='utf-8')
        match=re.search(r'`([\s\S]*)`',text)
        if not match: raise RuntimeError(f'cannot extract {rel}')
        backfill.executescript(match.group(1))
    backfill.execute("INSERT INTO roles VALUES('r2','Admin',1,1,'x','x')")
    backfill.execute("INSERT INTO users VALUES('u2','Admin','r2','salt','hash',1,'x','x')")
    backfill.execute("INSERT INTO suppliers(id,name,active,created_at,updated_at) VALUES('s2','Supplier',1,'x','x')")
    backfill.execute("INSERT INTO purchases(id,supplier_id,user_id,number,total,notes,created_at) VALUES('p2','s2','u2','P-OLD',50000,NULL,'x')")
    text=(ROOT/'src/core/database/migrations/004_supplier_accounts.ts').read_text(encoding='utf-8')
    match=re.search(r'`([\s\S]*)`',text)
    if not match: raise RuntimeError('cannot extract migration004')
    backfill.executescript(match.group(1))
    row=backfill.execute("SELECT SUM(impact_minor) FROM supplier_account_entries WHERE supplier_id='s2'").fetchone()
    if not row or row[0] != 50000:
        fail('supplier account migration backfill did not preserve previous purchases')
except Exception as e:
    fail(f'supplier account migration backfill failed: {e}')

# Constraints smoke test.
try:
    conn.execute("INSERT INTO roles VALUES('r','Admin',1,1,'x','x')")
    conn.execute("INSERT INTO users(id,name,role_id,pin_salt,pin_hash,active,created_at,updated_at) VALUES('u','Admin','r','salt','hash',1,'x','x')")
    conn.execute("INSERT INTO cash_sessions(id,user_id,opened_at,opening_amount,status) VALUES('c1','u','x',0,'OPEN')")
    try:
        conn.execute("INSERT INTO cash_sessions(id,user_id,opened_at,opening_amount,status) VALUES('c2','u','x',0,'OPEN')")
        fail('unique open cash session constraint did not fire')
    except sqlite3.IntegrityError: pass
    try:
        conn.execute("INSERT INTO products(id,sku,name,purchase_cost,sale_price,tax_rate_bp,stock,minimum_stock,unit,active,created_at,updated_at) VALUES('p','S','P',0,-1,0,0,0,'u',1,'x','x')")
        fail('negative sale price constraint did not fire')
    except sqlite3.IntegrityError: pass
except Exception as e: fail(f'constraint smoke test failed: {e}')

# EAN-13 demo data must be valid.
def check_digit(first12):
    return (10-sum(int(c)*(1 if i%2==0 else 3) for i,c in enumerate(first12))%10)%10
def valid(code): return len(code)==13 and code.isdigit() and check_digit(code[:12])==int(code[-1])
admin=(ROOT/'src/modules/settings/admin-data.ts').read_text(encoding='utf-8')
for code in re.findall(r"'([0-9]{13})'",admin):
    if not valid(code): fail(f'invalid EAN-13 in demo data: {code}')


# Mobile forms safe-area contract.
ui=(ROOT/'src/shared/ui.tsx').read_text(encoding='utf-8')
tabs=(ROOT/'app/(tabs)/_layout.tsx').read_text(encoding='utf-8')
customers=(ROOT/'app/(tabs)/customers.tsx').read_text(encoding='utf-8')
categories=(ROOT/'app/categories.tsx').read_text(encoding='utf-8')
for token in ['useSafeAreaInsets', "behavior={Platform.OS === 'ios' ? 'padding' : 'height'}", 'keyboardShouldPersistTaps="handled"', 'navigationBarTranslucent', 'export function IconPicker']:
    if token not in ui: fail(f'mobile form contract missing in shared UI: {token}')
for token in ['useSafeAreaInsets', 'tabBarHideOnKeyboard', 'Math.max(insets.bottom, 8)']:
    if token not in tabs: fail(f'bottom tab safe-area contract missing: {token}')
for token in ['form.document','form.phone','form.email','form.address','form.notes','customerService.update']:
    if token not in customers: fail(f'complete customer form contract missing: {token}')
if 'IconPicker' not in categories: fail('category icon selector must use IconPicker')
if "label={t('categories.icon')} value={icon} onChangeText={setIcon}" in categories: fail('category icon must not require manual icon-name entry')


# Human-readable permissions UX contract.
roles_ui=(ROOT/'app/roles.tsx').read_text(encoding='utf-8')
perm_es=(ROOT/'src/core/i18n/locales/premium-extra.es.ts').read_text(encoding='utf-8')
perm_en=(ROOT/'src/core/i18n/locales/premium-extra.en.ts').read_text(encoding='utf-8')
for token in ['permissionLabels','permissionDescriptions','technicalCode','selectAll','clearGroup']:
    if token not in roles_ui:
        fail(f'roles human-readable permissions UX missing: {token}')
for code in expected:
    if perm_es.count(code) < 2:
        fail(f'ES permission metadata incomplete: {code}')
    if perm_en.count(code) < 2:
        fail(f'EN permission metadata incomplete: {code}')

# Checkpoint 12 operational contracts.
cp12_required=[
 'src/core/database/migrations/004_supplier_accounts.ts',
 'src/modules/supplier-account/service.ts',
 'src/modules/purchases/repository.ts',
 'src/modules/purchases/service.ts',
 'app/purchases.tsx','app/purchase-form.tsx','app/purchase/[id].tsx',
 'app/cash-history.tsx','assets/audio/scan-beep.wav',
 'assets/branding/servicios-maobits-final.jpg',
]
for rel in cp12_required:
    if not (ROOT/rel).exists(): fail(f'checkpoint12 missing {rel}')

scanner=(ROOT/'app/scanner.tsx').read_text(encoding='utf-8')
for token in ['useAudioPlayer','scan-beep.wav','productScannedAdded','Haptics.NotificationFeedbackType.Success']:
    if token not in scanner: fail(f'scanner feedback contract missing: {token}')

checkout=(ROOT/'app/checkout.tsx').read_text(encoding='utf-8')
for token in ['customerFormOpen','customerSearch','customerPage','SearchBar','Pager']:
    if token not in checkout: fail(f'checkout customer chooser contract missing: {token}')

inventory=(ROOT/'app/(tabs)/inventory.tsx').read_text(encoding='utf-8')
for token in ['stockAdds','stockSubtracts','selected.stock + delta','/purchase-form']:
    if token not in inventory: fail(f'inventory checkpoint12 contract missing: {token}')

purchases=(ROOT/'app/purchases.tsx').read_text(encoding='utf-8')
for token in ['purchaseService.page','reportFilters','/purchase/']:
    if token not in purchases: fail(f'purchases module contract missing: {token}')

customer_ui=(ROOT/'app/(tabs)/customers.tsx').read_text(encoding='utf-8')
for token in ['customerHistoryReportHtml','accountReportHtml','accountMovementTicketHtml']:
    if token not in customer_ui: fail(f'customer report/ticket contract missing: {token}')

supplier_ui=(ROOT/'app/suppliers.tsx').read_text(encoding='utf-8')
for token in ['supplierAccountService','supplierCurrentAccount','purchaseHistory','accountReportHtml']:
    if token not in supplier_ui: fail(f'supplier current-account contract missing: {token}')

cash_history=(ROOT/'app/cash-history.tsx').read_text(encoding='utf-8')
for token in ['cashService.analytics','cashService.sessionPage','DonutChart','BarChart','shareReceipt']:
    if token not in cash_history: fail(f'cash analytics contract missing: {token}')

reports_ui=(ROOT/'app/reports.tsx').read_text(encoding='utf-8')
for token in ['generalReport','chooseReportModules','balanceProducts','supplierAccounts','cashSummary','purchaseSummary']:
    if token not in reports_ui: fail(f'reports checkpoint12 contract missing: {token}')

settings_ui=(ROOT/'app/settings.tsx').read_text(encoding='utf-8')
for token in ['servicios-maobits-final.jpg','accessCourse','viewServices','admin@moabits.com']:
    if token not in settings_ui: fail(f'credits/services contract missing: {token}')

more_ui=(ROOT/'app/(tabs)/more.tsx').read_text(encoding='utf-8')
for token in ["route: '/purchases'",'usePreferencesStore','nav.purchases']:
    if token not in more_ui: fail(f'More multilingual purchases contract missing: {token}')

backup=(ROOT/'src/core/backup/service.ts').read_text(encoding='utf-8')
if "'supplier_account_entries'" not in backup:
    fail('backup must include supplier_account_entries')

if 'checkpoint12:' not in perm_es or 'checkpoint12:' not in perm_en:
    fail('checkpoint12 ES/EN translations missing')

if errors:
    print('SOURCE VALIDATION FAILED')
    for e in errors: print(' -',e)
    sys.exit(1)
print('SOURCE VALIDATION OK')
print(f' - critical architecture files: {len(required)}')
print(f' - permissions: {len(expected)}')
print(f' - course manifests: {len(mods)}')
print(' - SQLite migrations: executable (1-7)')
print(' - SQLite constraints: verified')
print(' - demo EAN-13: verified')
print(' - checkpoint 12 operational contracts: verified')


# Checkpoint 13 regressions.
receipt13=(ROOT/'src/core/pdf/receipt.ts').read_text(encoding='utf-8')
reports13=(ROOT/'src/modules/reports/service.ts').read_text(encoding='utf-8')
settings13=(ROOT/'app/settings.tsx').read_text(encoding='utf-8')
cash13=(ROOT/'app/cash.tsx').read_text(encoding='utf-8')
labels13=(ROOT/'src/modules/cash/labels.ts').read_text(encoding='utf-8')

if 'Sharing.shareAsync(rendered.uri' not in receipt13:
    fail('checkpoint13 direct PDF sharing missing')
if 'FileSystem.copyAsync' in receipt13:
    fail('checkpoint13 obsolete PDF copy is still present')
if "range('cs', filter, 'opened_at')" not in reports13:
    fail('checkpoint13 cash report must filter by opened_at')
if 'julianday(${field})>=julianday(?)' not in reports13:
    fail('checkpoint13 robust date range missing')
if 'servicesImageHeight' not in settings13:
    fail('checkpoint13 responsive credits image missing')
if 'cashMovementLabel' not in cash13 or 'SALE_REVERSAL' not in labels13:
    fail('checkpoint13 cash movement localization missing')


# Checkpoint 14 contracts.
receipt14=(ROOT/'src/core/pdf/receipt.ts').read_text(encoding='utf-8')
catalog14=(ROOT/'src/core/permissions/catalog.ts').read_text(encoding='utf-8')
inventory14=(ROOT/'app/(tabs)/inventory.tsx').read_text(encoding='utf-8')
more14=(ROOT/'app/(tabs)/more.tsx').read_text(encoding='utf-8')
purchase_service14=(ROOT/'src/modules/purchases/service.ts').read_text(encoding='utf-8')

if "'PURCHASES_VIEW'" not in catalog14:
    fail('checkpoint14 PURCHASES_VIEW missing')
if "has('PURCHASES_VIEW')" not in inventory14:
    fail('checkpoint14 inventory purchase-history permission missing')
if "permission: 'PURCHASES_VIEW'" not in more14:
    fail('checkpoint14 More/Purchases permission missing')
if "permissionService.require(actorId, 'PURCHASES_VIEW')" not in purchase_service14:
    fail('checkpoint14 Purchase Service authorization missing')
for token in [
    "import { File, Paths } from 'expo-file-system';",
    'target.contentUri',
    'Paths.cache',
    'target.size',
]:
    if token not in receipt14:
        fail(f'checkpoint14 reliable PDF sharing missing: {token}')


# Checkpoint 15 UX contracts.
shared15=(ROOT/'src/shared/ui.tsx').read_text(encoding='utf-8')
reports15=(ROOT/'app/reports.tsx').read_text(encoding='utf-8')
purchases15=(ROOT/'app/purchases.tsx').read_text(encoding='utf-8')
cash_history15=(ROOT/'app/cash-history.tsx').read_text(encoding='utf-8')
purchase_form15=(ROOT/'app/purchase-form.tsx').read_text(encoding='utf-8')
inventory15=(ROOT/'app/(tabs)/inventory.tsx').read_text(encoding='utf-8')
inventory_service15=(ROOT/'src/modules/inventory/service.ts').read_text(encoding='utf-8')

if 'export function DatePickerField' not in shared15:
    fail('checkpoint15 DatePickerField missing')
for name,source in [
    ('reports',reports15),
    ('purchases',purchases15),
    ('cash-history',cash_history15),
]:
    if '<DatePickerField' not in source:
        fail(f'checkpoint15 calendar missing in {name}')
if "period === 'today'" not in reports15 or 'period_today' not in reports15:
    fail('checkpoint15 Today report filter missing')
for token in ['ToastAndroid.show','lastAddedProductId','scrollTo','linesAnchorY']:
    if token not in purchase_form15:
        fail(f'checkpoint15 purchase feedback missing: {token}')
for token in ['activeProducts','unitsInStock','inventoryService.summary']:
    if token not in inventory15:
        fail(f'checkpoint15 inventory semantic metric missing: {token}')
if 'async summary(actorId: string)' not in inventory_service15:
    fail('checkpoint15 inventory summary service missing')

for path15 in (ROOT/'app').rglob('*.tsx'):
    source15=path15.read_text(encoding='utf-8')
    if 'icon="share-outline"' in source15:
        fail(f'checkpoint15 visible share button remains: {path15.relative_to(ROOT)}')


# Checkpoint 16 Inventory pagination.
inventory_service16=(ROOT/'src/modules/inventory/service.ts').read_text(encoding='utf-8')
inventory_ui16=(ROOT/'app/(tabs)/inventory.tsx').read_text(encoding='utf-8')

for token in [
    'pageSize = 12',
    'COUNT(*) count',
    'LIMIT ? OFFSET ?',
    'Math.ceil(total / safePageSize)',
]:
    if token not in inventory_service16:
        fail(f'checkpoint16 inventory service pagination missing: {token}')

for token in [
    'const [page, setPage] = useState(1)',
    'inventoryService.overview(user.id, search, page, 12)',
    '<Pager',
    'onChange={setPage}',
]:
    if token not in inventory_ui16:
        fail(f'checkpoint16 inventory UI pagination missing: {token}')


# Checkpoint 17 cash denominations.
denom17=(ROOT/'src/modules/settings/cash-denominations.ts').read_text(encoding='utf-8')
counter17=(ROOT/'src/modules/cash/ui/CashCounterModal.tsx').read_text(encoding='utf-8')
denom_ui17=(ROOT/'src/modules/settings/ui/DenominationSettingsModal.tsx').read_text(encoding='utf-8')
cash17=(ROOT/'app/cash.tsx').read_text(encoding='utf-8')
settings17=(ROOT/'app/settings.tsx').read_text(encoding='utf-8')

for token in [
    'DEFAULT_CASH_DENOMINATIONS',
    'cash_denominations_${currency}',
    'parseDenominationAmount',
]:
    if token not in denom17:
        fail(f'checkpoint17 denomination service missing: {token}')

for token in [
    'countCoins',
    'countBanknotes',
    'onApply(total)',
]:
    if token not in counter17:
        fail(f'checkpoint17 cash counter missing: {token}')

if '<CashCounterModal' not in cash17 or 'setCounted(total)' not in cash17:
    fail('checkpoint17 cash close integration missing')

if '<DenominationSettingsModal' not in settings17:
    fail('checkpoint17 Settings denomination editor missing')


# Checkpoint 18 promotional catalogs and offers.
catalog18=(ROOT/'src/core/permissions/catalog.ts').read_text(encoding='utf-8')
migration18=(ROOT/'src/core/database/migrations/005_catalog_offers.ts').read_text(encoding='utf-8')
checkout18=(ROOT/'src/modules/checkout/service.ts').read_text(encoding='utf-8')
cart18=(ROOT/'src/stores/cart.ts').read_text(encoding='utf-8')
pos18=(ROOT/'app/(tabs)/pos.tsx').read_text(encoding='utf-8')
reports_service18=(ROOT/'src/modules/reports/service.ts').read_text(encoding='utf-8')
reports_ui18=(ROOT/'app/reports.tsx').read_text(encoding='utf-8')

if "'CATALOG_PRINT'" not in catalog18:
    fail('checkpoint18 CATALOG_PRINT missing')

for token in [
    'catalog_offers',
    'catalog_offer_categories',
    'catalog_offer_products',
    'catalog_offer_items',
    'offer_discount',
]:
    if token not in migration18:
        fail(f'checkpoint18 migration contract missing: {token}')

for rel in [
    'src/modules/offers/repository.ts',
    'src/modules/offers/service.ts',
    'src/modules/offers/catalog-print.ts',
    'app/catalog-builder.tsx',
    'app/offers.tsx',
]:
    if not (ROOT/rel).exists():
        fail(f'checkpoint18 missing {rel}')

for token in ['offerId?: string | null','catalog_offer_items','offer_discount']:
    if token not in checkout18:
        fail(f'checkpoint18 checkout offer contract missing: {token}')

for token in ['appliedOfferId','applyOffer','clearOffer']:
    if token not in cart18:
        fail(f'checkpoint18 cart offer contract missing: {token}')

for token in ['offerService.activeForPos','offersOpen','/catalog-builder']:
    if token not in pos18:
        fail(f'checkpoint18 POS offer contract missing: {token}')

if 'async offersSummary' not in reports_service18 or 'offerAnalytics' not in reports_ui18:
    fail('checkpoint18 reports offers section missing')


# Checkpoint 19 catalog presentation contracts.
builder19=(ROOT/'app/catalog-builder.tsx').read_text(encoding='utf-8')
catalog_print19=(ROOT/'src/modules/offers/catalog-print.ts').read_text(encoding='utf-8')
settings19=(ROOT/'app/settings.tsx').read_text(encoding='utf-8')
repository19=(ROOT/'src/modules/offers/repository.ts').read_text(encoding='utf-8')

for token in [
    "import { Ionicons } from '@expo/vector-icons';",
    'name={categoryIcon(',
    'checkpoint19.categoryDiscountInput',
    'checkpoint19.priceBefore',
    'checkpoint19.priceAfter',
    'hasProductOverride',
]:
    if token not in builder19:
        fail(f'checkpoint19 catalog builder missing: {token}')

for token in [
    'class="product-page"',
    'page-break-after: always',
    '${logo}',
    'width: 210mm',
    'height: 297mm',
    "before: 'Precio antes'",
    "after: 'Precio después'",
]:
    if token not in catalog_print19:
        fail(f'checkpoint19 catalog print missing: {token}')

if 'WHEN opr.product_id IS NOT NULL' not in repository19:
    fail('checkpoint19 product-specific priority contract missing')

if 'checkpoint19.demoDataLoaded' not in settings19:
    fail('checkpoint19 demo success translation missing in Settings')
if "Alert.alert('MAOBITS POS', t('common.ok'))" in settings19:
    fail('checkpoint19 obsolete common.ok demo notification remains')


# Checkpoint 20 catalog/contact/checkout contracts.
repo20=(ROOT/'src/modules/offers/repository.ts').read_text(encoding='utf-8')
print20=(ROOT/'src/modules/offers/catalog-print.ts').read_text(encoding='utf-8')
builder20=(ROOT/'app/catalog-builder.tsx').read_text(encoding='utf-8')
checkout20=(ROOT/'app/checkout.tsx').read_text(encoding='utf-8')
settings20=(ROOT/'app/settings.tsx').read_text(encoding='utf-8')
contact20=(ROOT/'src/modules/settings/business-contact.ts').read_text(encoding='utf-8')
migration20=(ROOT/'src/core/database/migrations/006_catalog_offer_images.ts').read_text(encoding='utf-8')

for token in [
    'catalog_offer_item_images',
    'image_uris: string[]',
    'INSERT INTO catalog_offer_item_images',
]:
    if token not in repo20 and token not in migration20:
        fail(f'checkpoint20 multi-image snapshot missing: {token}')

for token in [
    'product.images.length',
    'class="image-cell"',
    '.image-grid.many',
    'businessContactService.get()',
    'class="business-contact"',
]:
    if token not in print20:
        fail(f'checkpoint20 catalog print missing: {token}')

for token in [
    'selectedCategories.map((categoryId)',
    'categoryProducts',
    'checkpoint20.categoryLabel',
]:
    if token not in builder20:
        fail(f'checkpoint20 catalog grouping missing: {token}')

for token in [
    'offerService.activeForPos',
    'checkoutOffersOpen',
    'applyOffer(offer.id, offer.name)',
    'checkpoint20.discountOffers',
]:
    if token not in checkout20:
        fail(f'checkpoint20 checkout offers missing: {token}')

if '<BusinessContactSettings' not in settings20:
    fail('checkpoint20 business contact UI missing')
if "const EMAIL_KEY = 'business_email'" not in contact20:
    fail('checkpoint20 business email storage missing')
if "const PHONE_KEY = 'business_phone'" not in contact20:
    fail('checkpoint20 business phone storage missing')


# Checkpoint 21 offers/menu/contact contracts.
more21=(ROOT/'app/(tabs)/more.tsx').read_text(encoding='utf-8')
settings21=(ROOT/'app/settings.tsx').read_text(encoding='utf-8')
repo21=(ROOT/'src/modules/offers/repository.ts').read_text(encoding='utf-8')
print21=(ROOT/'src/modules/offers/catalog-print.ts').read_text(encoding='utf-8')

if "route: '/offers'" not in more21 or "permission: 'CATALOG_PRINT'" not in more21:
    fail('checkpoint21 Offers must be in More with CATALOG_PRINT')
if 'checkpoint18.settingsOfferTitle' in settings21:
    fail('checkpoint21 old Offers Settings card still present')
if 'function offerDateTime' not in repo21:
    fail('checkpoint21 JS offer date parser missing')
if 'const currentOffers = offers.filter' not in repo21:
    fail('checkpoint21 current offer JS filter missing')
if 'AND datetime(valid_from)<=datetime(?)' in repo21:
    fail('checkpoint21 obsolete SQLite datetime offer filter remains')
if 'offer.snapshotItems.length > 0' not in repo21:
    fail('checkpoint21 published snapshot guard missing')

publish21=print21.find('offerService.recordPrinted(')
native_print21=print21.find('Print.printAsync')
if publish21 < 0 or native_print21 < 0 or publish21 > native_print21:
    fail('checkpoint21 catalog must publish before native print dialog')
for token in [
    'class="footer-logo"',
    'class="business-contact-details"',
    'contact.email',
    'contact.phone',
]:
    if token not in print21:
        fail(f'checkpoint21 catalog footer contact missing: {token}')


# Checkpoint 24 POS toolbar + product image lightbox.
pos24=(ROOT/'app/(tabs)/pos.tsx').read_text(encoding='utf-8')
preview24=(ROOT/'src/modules/products/ui/ProductPreviewModal.tsx').read_text(encoding='utf-8')
zoom24=(ROOT/'src/shared/ZoomableImage.tsx').read_text(encoding='utf-8')
checkout24=(ROOT/'app/checkout.tsx').read_text(encoding='utf-8')

print_pos24=pos24.find('premiumExtra.checkpoint18.printCatalog')
active_card24=pos24.find('{activeOffers.length ? (', print_pos24)

if print_pos24 < 0 or active_card24 < 0:
    fail('checkpoint24 POS catalog toolbar markers missing')

toolbar24=pos24[print_pos24:active_card24]

if 'premiumExtra.checkpoint18.applyOffer' in toolbar24:
    fail('checkpoint24 redundant Apply offer button remains beside Print catalog')

if 'premiumExtra.checkpoint20.discountOffers' not in checkout24:
    fail('checkpoint24 Checkout offers must remain available')

if "import { ZoomableImage } from '@/shared/ZoomableImage';" not in preview24:
    fail('checkpoint24 ZoomableImage import missing from product preview')
if '<ZoomableImage' not in preview24:
    fail('checkpoint24 product preview image is not zoomable')

for token in [
    '<Modal',
    'setOpen(true)',
    'resizeMode="contain"',
    'name="close"',
]:
    if token not in zoom24:
        fail(f'checkpoint24 image lightbox missing: {token}')


# Checkpoint 25 user avatars + horizontal login.
login25=(ROOT/'app/login.tsx').read_text(encoding='utf-8')
users25=(ROOT/'app/users.tsx').read_text(encoding='utf-8')
user_service25=(ROOT/'src/modules/users/service.ts').read_text(encoding='utf-8')
auth_repo25=(ROOT/'src/modules/auth/repository.ts').read_text(encoding='utf-8')
auth_service25=(ROOT/'src/modules/auth/service.ts').read_text(encoding='utf-8')
types25=(ROOT/'src/core/types.ts').read_text(encoding='utf-8')
media25=(ROOT/'src/core/media/files.ts').read_text(encoding='utf-8')
backup25=(ROOT/'src/core/backup/service.ts').read_text(encoding='utf-8')
migration25=(ROOT/'src/core/database/migrations/007_user_avatars.ts').read_text(encoding='utf-8')

for token in [
    '<ScrollView',
    'horizontal',
    'showsHorizontalScrollIndicator',
    'user.avatar_uri',
]:
    if token not in login25:
        fail(f'checkpoint25 horizontal login missing: {token}')

for token in [
    'launchImageLibraryAsync',
    'userService.setAvatar',
    'removeAvatarDraft',
]:
    if token not in users25:
        fail(f'checkpoint25 avatar admin UI missing: {token}')

for token in [
    'async setAvatar(',
    "persistLocalMedia(",
    "'users'",
]:
    if token not in user_service25:
        fail(f'checkpoint25 user avatar service missing: {token}')

if 'u.avatar_uri' not in auth_repo25:
    fail('checkpoint25 auth users do not expose avatar_uri')
if 'avatarUri: user.avatar_uri' not in auth_service25:
    fail('checkpoint25 session login avatar missing')
if 'avatarUri: string | null' not in types25:
    fail('checkpoint25 SessionUser avatar type missing')
if "'products' | 'suppliers' | 'users'" not in media25:
    fail('checkpoint25 local media users kind missing')
if 'ADD COLUMN avatar_uri TEXT' not in migration25:
    fail('checkpoint25 migration avatar_uri missing')

for token in [
    'tables.users',
    'avatar_uri',
    "table === 'users'",
]:
    if token not in backup25:
        fail(f'checkpoint25 backup avatar contract missing: {token}')


# Checkpoint 26 login safe area.
login26=(ROOT/'app/login.tsx').read_text(encoding='utf-8')

for token in [
    "from 'react-native-safe-area-context'",
    'useSafeAreaInsets()',
    "edges={['top', 'bottom']}",
    'paddingBottom: insets.bottom + 24',
    'keyboardShouldPersistTaps="handled"',
    'showsVerticalScrollIndicator={false}',
]:
    if token not in login26:
        fail(f'checkpoint26 login safe-area contract missing: {token}')

if 'user.avatar_uri' not in login26 or 'horizontal' not in login26:
    fail('checkpoint26 must preserve horizontal avatar user selector')


# Checkpoint 27 login PIN label.
login27=(ROOT/'app/login.tsx').read_text(encoding='utf-8')
es27=(ROOT/'src/core/i18n/locales/premium-extra.es.ts').read_text(encoding='utf-8')
en27=(ROOT/'src/core/i18n/locales/premium-extra.en.ts').read_text(encoding='utf-8')

if "pinForUser: 'PIN de {name}'" in es27:
    fail('checkpoint27 ES literal {name} placeholder remains')
if "pinForUser: 'PIN for {name}'" in en27:
    fail('checkpoint27 EN literal {name} placeholder remains')

if "pinForUser: 'PIN de'" not in es27:
    fail('checkpoint27 ES PIN label prefix missing')
if "pinForUser: 'PIN for'" not in en27:
    fail('checkpoint27 EN PIN label prefix missing')

if "selectedUser?.name" not in login27:
    fail('checkpoint27 selected user name missing from login PIN label')

