import { getDb } from './connection';
export async function inTransaction<T>(work: (db: Awaited<ReturnType<typeof getDb>>) => Promise<T>): Promise<T> {
    const db = await getDb();
    await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
    try {
        const result = await work(db);
        await db.execAsync('COMMIT;');
        return result;
    }
    catch (error) {
        await db.execAsync('ROLLBACK;');
        throw error;
    }
}

