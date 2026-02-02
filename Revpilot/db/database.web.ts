/**
 * Web-only database implementation using sql.js.
 * This file is used when building for web; database.native.ts is used for iOS/Android.
 */

const DB_NAME = 'salesbook.db';
let webDb: any = null;
let initJs: any = null;

async function initWebDb() {
  if (webDb) return webDb;

  if (!initJs) {
    try {
      const sqlJsModule = await import('sql.js');
      let initSqlJs: any = null;

      if (typeof (sqlJsModule as { initSqlJs?: unknown }).initSqlJs === 'function') {
        initSqlJs = (sqlJsModule as { initSqlJs: (config?: { locateFile?: (f: string) => string }) => Promise<unknown> }).initSqlJs;
      } else if (sqlJsModule.default && typeof (sqlJsModule.default as unknown as { initSqlJs?: (config?: { locateFile?: (f: string) => string }) => Promise<unknown> }).initSqlJs === 'function') {
        initSqlJs = (sqlJsModule.default as unknown as { initSqlJs: (config?: { locateFile?: (f: string) => string }) => Promise<unknown> }).initSqlJs;
      } else if (typeof sqlJsModule.default === 'function') {
        initSqlJs = sqlJsModule.default as (config?: { locateFile?: (f: string) => string }) => Promise<unknown>;
      } else if (typeof sqlJsModule === 'function') {
        initSqlJs = sqlJsModule as (config?: { locateFile?: (f: string) => string }) => Promise<unknown>;
      }

      if (initSqlJs) {
        initJs = await initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        });
      } else {
        initJs = sqlJsModule.default || sqlJsModule;
      }
    } catch (e) {
      console.error('Failed to load sql.js:', e);
      throw new Error('sql.js is required for web platform. Please install it: npm install sql.js');
    }
  }

  const dbKey = `sqljs_${DB_NAME}`;
  let dbData: Uint8Array | null = null;

  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      const request = indexedDB.open('RevPilotDB', 1);
      await new Promise<void>((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(dbKey)) {
            resolve();
            return;
          }
          const transaction = db.transaction([dbKey], 'readonly');
          const store = transaction.objectStore(dbKey);
          const getRequest = store.get('data');
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              dbData = new Uint8Array(getRequest.result);
            }
            resolve();
          };
          getRequest.onerror = () => resolve();
        };
        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(dbKey)) {
            db.createObjectStore(dbKey);
          }
        };
      });
    } catch (e) {
      console.warn('Failed to load from IndexedDB:', e);
    }
  }

  const SQL = initJs;
  if (!SQL || !SQL.Database || typeof SQL.Database !== 'function') {
    throw new Error('sql.js Database constructor not found.');
  }

  const sqlDb = new SQL.Database(dbData || undefined);

  const saveDb = async () => {
    if (typeof window !== 'undefined' && window.indexedDB && sqlDb) {
      try {
        const data = sqlDb.export();
        const request = indexedDB.open('RevPilotDB', 1);
        await new Promise<void>((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction([dbKey], 'readwrite');
            const store = transaction.objectStore(dbKey);
            store.put(data, 'data');
            resolve();
          };
          request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(dbKey)) {
              db.createObjectStore(dbKey);
            }
          };
        });
      } catch (e) {
        console.warn('Failed to save to IndexedDB:', e);
      }
    }
  };

  const SQLRef = SQL;

  webDb = {
    withTransactionAsync: async (callback: () => Promise<void>) => {
      try {
        await callback();
        await saveDb();
      } catch (error) {
        if (typeof window !== 'undefined' && window.indexedDB) {
          try {
            const request = indexedDB.open('RevPilotDB', 1);
            await new Promise<void>((resolve) => {
              request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction([dbKey], 'readonly');
                const store = transaction.objectStore(dbKey);
                const getRequest = store.get('data');
                getRequest.onsuccess = () => {
                  if (getRequest.result) {
                    const newData = new Uint8Array(getRequest.result);
                    sqlDb.close();
                    const newDb = new SQLRef.Database(newData);
                    Object.keys(sqlDb).forEach((key) => delete (sqlDb as any)[key]);
                    Object.assign(sqlDb, newDb);
                  }
                  resolve();
                };
                getRequest.onerror = () => resolve();
              };
            });
          } catch (e) {
            console.warn('Failed to rollback:', e);
          }
        }
        throw error;
      }
    },
    runAsync: async (query: string, params: any[] = []) => {
      const stmt = sqlDb.prepare(query);
      try {
        stmt.bind(params);
        stmt.step();
        stmt.free();
      } catch (e) {
        stmt.free();
        throw e;
      }
      const idStmt = sqlDb.prepare('SELECT last_insert_rowid() as id');
      idStmt.step();
      const idRow = idStmt.getAsObject();
      idStmt.free();
      const insertId = Number(idRow.id) || 0;
      await saveDb();
      return { lastInsertRowId: insertId };
    },
    getAllAsync: async (query: string, params: any[] = []) => {
      const stmt = sqlDb.prepare(query);
      try {
        stmt.bind(params);
        const rows: any[] = [];
        while (stmt.step()) {
          const row: any = {};
          const columns = stmt.getColumnNames();
          const values = stmt.get();
          columns.forEach((col: string, idx: number) => {
            row[col] = values[idx];
          });
          rows.push(row);
        }
        stmt.free();
        return rows;
      } catch (e) {
        stmt.free();
        throw e;
      }
    },
  };

  return webDb;
}

export const openDatabase = async () => {
  const db = await initWebDb();
  if (!db || typeof db.runAsync !== 'function') {
    throw new Error('Failed to initialize web database.');
  }
  return db;
};

export const executeSql = async (query: string, params: any[] = []) => {
  const database = await openDatabase();
  await database.runAsync(query, params);
};

export const querySql = async (query: string, params: any[] = []) => {
  const database = await openDatabase();
  return await database.getAllAsync(query, params);
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
