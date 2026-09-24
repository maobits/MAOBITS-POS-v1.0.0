import { getDb } from '@/core/database';
import { inTransaction } from '@/core/database/transaction';
import { AppError } from '@/core/errors';
import { verifyPin, hashPin, newSalt } from '@/core/security/pin';
import { ADMIN_PERMISSIONS } from '@/core/permissions/catalog';
import { uid, nowIso } from '@/shared/id';
import { purgeLocalMedia } from '@/core/media/files';
async function verifyAdministrator(actorId: string, pin: string) { const db = await getDb(); const u = await db.getFirstAsync<{
    pin_salt: string;
    pin_hash: string;
    is_system: number;
}>('SELECT u.pin_salt,u.pin_hash,r.is_system FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=? AND u.active=1', actorId); if (!u || !u.is_system || !await verifyPin(pin, u.pin_salt, u.pin_hash))
    throw new AppError('errors.invalidPin'); }
export async function loadDemoData(actorId: string, pin: string, phrase: string) {
    await verifyAdministrator(actorId, pin);
    if (phrase !== 'CARGAR DATOS DEMO')
        throw new AppError('errors.validation');
    await inTransaction(async (db) => {
        const stamp = nowIso();
        const exists = await db.getFirstAsync<{
            id: string;
        }>('SELECT id FROM categories WHERE name=\'Bebidas DEMO\'');
        if (exists)
            return;
        const cat1 = uid('cat'), cat2 = uid('cat'), cat3 = uid('cat'), sup1 = uid('sup'), sup2 = uid('sup');
        for (const [id, name, icon] of [[cat1, 'Bebidas DEMO', 'cafe-outline'], [cat2, 'Tecnología DEMO', 'hardware-chip-outline'], [cat3, 'Hogar DEMO', 'home-outline']] as const)
            await db.runAsync('INSERT INTO categories(id,name,icon,active,created_at,updated_at) VALUES(?,?,?,1,?,?)', id, name, icon, stamp, stamp);
        for (const [id, name] of [[sup1, 'Proveedor Demo A'], [sup2, 'Proveedor Demo B']] as const)
            await db.runAsync(`INSERT INTO suppliers(id,name,active,created_at,updated_at) VALUES(?,?,1,?,?)`, id, name, stamp, stamp);
        const products = [[uid('prd'), 'DEMO-001', '7700000000019', 'Café Demo', cat1, 8500, 12000, 20, sup1], [uid('prd'), 'DEMO-002', '7700000000026', 'Agua Demo', cat1, 1200, 2500, 30, sup1], [uid('prd'), 'DEMO-003', '7700000000033', 'Teclado Demo', cat2, 45000, 69000, 8, sup2], [uid('prd'), 'DEMO-004', '7700000000040', 'Mouse Demo', cat2, 22000, 39000, 10, sup2]] as const;
        for (const [id, sku, barcode, name, cat, cost, price, stock, supplier] of products) {
            await db.runAsync(`INSERT INTO products(id,sku,barcode,name,description,category_id,purchase_cost,sale_price,tax_rate_bp,stock,minimum_stock,unit,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)`, id, sku, barcode, name, 'MAOBITS demo', cat, cost, price, 0, stock, 3, 'und', stamp, stamp);
            await db.runAsync('INSERT INTO product_suppliers(product_id,supplier_id,preferred,last_cost) VALUES(?,?,1,?)', id, supplier, cost);
            await db.runAsync(`INSERT INTO inventory_movements(id,product_id,type,quantity,before_stock,after_stock,reference_type,reference_id,note,user_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`, uid('imv'), id, 'INITIAL', stock, 0, stock, 'DEMO', id, 'Demo seed', actorId, stamp);
        }
        for (const name of ['Cliente mostrador DEMO', 'Cliente crédito DEMO'])
            await db.runAsync(`INSERT INTO customers(id,name,notes,active,created_at,updated_at) VALUES(?,?,?,1,?,?)`, uid('cus'), name, 'MAOBITS demo', stamp, stamp);
        for (const roleName of ['Cajera A DEMO', 'Cajera B DEMO']) {
            const r = uid('rol');
            await db.runAsync('INSERT INTO roles(id,name,is_system,active,created_at,updated_at) VALUES(?,?,0,1,?,?)', r, roleName, stamp, stamp);
            const perms = roleName.startsWith('Cajera A') ? ['POS_SELL', 'PRODUCTS_VIEW', 'CUSTOMERS_VIEW', 'CUSTOMERS_EDIT', 'CASH_OPEN_CLOSE', 'CASH_MOVEMENTS', 'SCANNER_USE'] : ['POS_SELL', 'PRODUCTS_VIEW', 'PRODUCTS_EDIT', 'INVENTORY_VIEW', 'INVENTORY_ADJUST', 'INVENTORY_PURCHASE', 'SCANNER_USE'];
            for (const p of perms)
                await db.runAsync('INSERT OR IGNORE INTO role_permissions(role_id,permission_code) VALUES(?,?)', r, p);
        }
    });
}
export async function purgeOperationalData(actorId: string, pin: string, phrase: string) { await verifyAdministrator(actorId, pin); if (phrase !== 'ELIMINAR TODOS LOS DATOS')
    throw new AppError('errors.validation'); const tables = ['customer_account_entries', 'payments', 'sale_items', 'sales', 'cash_movements', 'cash_sessions', 'inventory_movements', 'purchase_items', 'purchases', 'product_images', 'product_suppliers', 'products', 'suppliers', 'categories', 'customers']; await inTransaction(async (db) => { for (const table of tables)
    await db.runAsync(`DELETE FROM ${table}`); }); await purgeLocalMedia(); }

