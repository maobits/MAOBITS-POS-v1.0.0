import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import { mediaRelativeName, readBase64, writeBase64 } from '@/core/media/files';
import { permissionService } from '@/modules/roles/service';
const TABLES = ['settings', 'roles', 'permissions', 'role_permissions', 'users', 'categories', 'suppliers', 'supplier_account_entries', 'products', 'product_suppliers', 'product_images', 'catalog_offers', 'catalog_offer_categories', 'catalog_offer_products', 'catalog_offer_items', 'catalog_offer_item_images', 'purchases', 'purchase_items', 'inventory_movements', 'customers', 'cash_sessions', 'cash_movements', 'sales', 'sale_items', 'payments', 'customer_account_entries'] as const;
const DELETE_ORDER = [...TABLES].reverse();
type Row = Record<string, unknown>;
interface BackupPayload {
    format: 'maobits.pos.backup';
    backupVersion: 1;
    appVersion: '1.0.0';
    createdAt: string;
    tables: Record<string, Row[]>;
    media: {
        originalUri: string;
        relativeName: string;
        base64: string;
    }[];
}
export async function createBackup(actorId: string) {
    await permissionService.require(actorId, 'BACKUP_MANAGE');
    const db = await getDb(), tables: Record<string, Row[]> = {};
    for (const table of TABLES)
        tables[table] = await db.getAllAsync<Row>(`SELECT * FROM ${table}`);
    const productImages = (tables.product_images ?? []) as {
        uri?: unknown;
    }[];
    const supplierRows = (tables.suppliers ?? []) as {
        logo_uri?: unknown;
    }[];
    const userRows = (tables.users ?? []) as {
        avatar_uri?: unknown;
    }[];
    const settingsRows = (tables.settings ?? []) as { key?: unknown; value?: unknown }[];
    const businessLogo = settingsRows.find((row) => row.key === 'business_logo_uri')?.value;
    const uris = [...productImages.map(r => r.uri), ...supplierRows.map(r => r.logo_uri), businessLogo, ...userRows.map(r => r.avatar_uri)].filter((v): v is string => typeof v === 'string' && Boolean(v));
    const media: BackupPayload['media'] = [];
    for (const uri of [...new Set(uris)]) {
        try {
            media.push({ originalUri: uri, relativeName: mediaRelativeName(uri), base64: await readBase64(uri) });
        } catch {
            // A backup that silently omits a referenced image is not complete.
            throw new AppError('errors.backupInvalid');
        }
    }
    const payload: BackupPayload = { format: 'maobits.pos.backup', backupVersion: 1, appVersion: '1.0.0', createdAt: new Date().toISOString(), tables, media };
    const uri = `${FileSystem.cacheDirectory}MAOBITS-POS-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.maobits-pos-backup.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload));
    return uri;
}
export async function shareBackup(actorId: string) { const uri = await createBackup(actorId); if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'MAOBITS POS Backup' }); return uri; }
export async function pickAndRestoreBackup(actorId: string) {
    await permissionService.require(actorId, 'BACKUP_MANAGE');
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
    if (picked.canceled)
        return false;
    const raw = await FileSystem.readAsStringAsync(picked.assets[0]!.uri);
    let payload: BackupPayload;
    try {
        payload = JSON.parse(raw) as BackupPayload;
    }
    catch {
        throw new AppError('errors.backupInvalid');
    }
    if (payload.format !== 'maobits.pos.backup' || payload.backupVersion !== 1 || payload.appVersion !== '1.0.0' || !payload.tables)
        throw new AppError('errors.backupInvalid');
    for (const table of TABLES) {
        if (!Array.isArray(payload.tables[table])) throw new AppError('errors.backupInvalid');
    }
    if (!Array.isArray(payload.media)) throw new AppError('errors.backupInvalid');
    const mediaUris = new Set(payload.media.map((m) => m.originalUri));
    const referencedMedia = [
        ...(payload.tables.product_images ?? []).map((r) => r.uri),
        ...(payload.tables.suppliers ?? []).map((r) => r.logo_uri),
        ...(payload.tables.settings ?? []).filter((r) => r.key === 'business_logo_uri').map((r) => r.value),
        ...(payload.tables.users ?? []).map((r) => r.avatar_uri),
    ].filter((v): v is string => typeof v === 'string' && Boolean(v));
    for (const uri of referencedMedia) {
        if (!mediaUris.has(uri)) throw new AppError('errors.backupInvalid');
    }
    const uriMap = new Map<string, string>();
    for (const media of payload.media ?? []) {
        try {
            uriMap.set(media.originalUri, await writeBase64(media.relativeName, media.base64));
        }
        catch {
            throw new AppError('errors.backupInvalid');
        }
    }
    await inTransaction(async (db) => { for (const table of DELETE_ORDER)
        await db.runAsync(`DELETE FROM ${table}`); for (const table of TABLES) {
        const rows = payload.tables[table] ?? [];
        for (const original of rows) {
            const row = { ...original };
            if (table === 'product_images' && typeof row.uri === 'string' && uriMap.has(row.uri))
                row.uri = uriMap.get(row.uri)!;
            if (table === 'suppliers' && typeof row.logo_uri === 'string' && uriMap.has(row.logo_uri))
                row.logo_uri = uriMap.get(row.logo_uri)!;
            if (table === 'users' && typeof row.avatar_uri === 'string' && uriMap.has(row.avatar_uri))
                row.avatar_uri = uriMap.get(row.avatar_uri)!;
            if (table === 'settings' && row.key === 'business_logo_uri' && typeof row.value === 'string' && uriMap.has(row.value))
                row.value = uriMap.get(row.value)!;
            const cols = Object.keys(row);
            if (!cols.length)
                continue;
            const placeholders = cols.map(() => '?').join(',');
            await db.runAsync(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${placeholders})`, ...cols.map(c => row[c] as string | number | null));
        }
    } });
    return true;
}

