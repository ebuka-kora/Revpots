/**
 * Native (iOS/Android) database implementation using expo-sqlite.
 * This file is used when building for native; database.web.ts is used for web.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'salesbook.db';
let nativeDb: SQLite.SQLiteDatabase | null = null;

async function initNativeDb() {
  if (nativeDb) return nativeDb;
  nativeDb = await SQLite.openDatabaseAsync(DB_NAME);
  return nativeDb;
}

export const openDatabase = async () => {
  return await initNativeDb();
};

export const executeSql = async (query: string, params: any[] = []) => {
  const database = await openDatabase();
  await database.runAsync(query, params);
};

export const querySql = async (query: string, params: any[] = []) => {
  const database = await openDatabase();
  const result = await database.getAllAsync(query, params);
  return result as any[];
};

export const initDatabase = async () => {
  await executeSql(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      costPrice REAL NOT NULL,
      sellingPrice REAL NOT NULL,
      quantity INTEGER NOT NULL,
      lowStockLevel INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      syncedAt TEXT,
      serverId TEXT
    );
  `);
  await executeSql(`
    UPDATE products
    SET lowStockLevel = CASE
      WHEN quantity > 10 THEN 5
      WHEN quantity > 4 THEN 2
      ELSE 0
    END
  `);
  await executeSql(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      totalAmount REAL NOT NULL,
      totalItems INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      syncedAt TEXT,
      serverId TEXT
    );
  `);
  await executeSql(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER NOT NULL,
      productId INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL
    );
  `);
};
