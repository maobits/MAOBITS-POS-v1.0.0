import { configureDb, getDb } from './connection';
import { runMigrations } from './migrations';
export async function initDatabase() {
    const db = await getDb();
    await configureDb(db);
    await runMigrations(db);
    return db;
}
export { getDb } from './connection';
export type { Db } from './connection';

