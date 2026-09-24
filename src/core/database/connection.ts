import * as SQLite from 'expo-sqlite';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
export function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!dbPromise)
        dbPromise = SQLite.openDatabaseAsync('maobits-pos.db');
    return dbPromise;
}
export async function configureDb(db: SQLite.SQLiteDatabase) {
    await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
}
export type Db = SQLite.SQLiteDatabase;

