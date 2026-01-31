import { Platform } from 'react-native';

const DB_NAME = 'salesbook.db';

// Platform-specific database implementations
let nativeDb: any = null;
let webDb: any = null;
let initJs: any = null;

// Native implementation using expo-sqlite
async function initNativeDb() {
  if (nativeDb) return nativeDb;
  const SQLite = await import('expo-sqlite');
  nativeDb = await SQLite.openDatabaseAsync(DB_NAME);
  return nativeDb;
}

// Web implementation using sql.js
async function initWebDb() {
  if (webDb) return webDb;
  
  if (!initJs) {
    try {
      // Load sql.js - it exports initSqlJs function
      const sqlJsModule = await import('sql.js');
      
      // Try different ways sql.js might be exported
      let initSqlJs: any = null;
      
      // Method 1: Named export initSqlJs
      if (typeof (sqlJsModule as { initSqlJs?: unknown }).initSqlJs === 'function') {
        initSqlJs = (sqlJsModule as { initSqlJs: (config?: { locateFile?: (f: string) => string }) => Promise<unknown> }).initSqlJs;
      }
      // Method 2: Default export may have initSqlJs (bundler shape)
      else if (sqlJsModule.default && typeof (sqlJsModule.default as unknown as { initSqlJs?: (config?: { locateFile?: (f: string) => string }) => Promise<unknown> }).initSqlJs === 'function') {
        initSqlJs = (sqlJsModule.default as unknown as { initSqlJs: (config?: { locateFile?: (f: string) => string }) => Promise<unknown> }).initSqlJs;
      }
      // Method 3: Default is the function itself
      else if (typeof sqlJsModule.default === 'function') {
        initSqlJs = sqlJsModule.default as (config?: { locateFile?: (f: string) => string }) => Promise<unknown>;
      }
      // Method 4: The module itself is the function
      else if (typeof sqlJsModule === 'function') {
        initSqlJs = sqlJsModule as (config?: { locateFile?: (f: string) => string }) => Promise<unknown>;
      }
      
      if (initSqlJs) {
        initJs = await initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        });
      } else {
        // Last resort: assume the module is already the SQL object
        initJs = sqlJsModule.default || sqlJsModule;
      }
    } catch (e) {
      console.error('Failed to load sql.js:', e);
      throw new Error('sql.js is required for web platform. Please install it: npm install sql.js');
    }
  }
  
  // Try to load existing database from IndexedDB
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
  
  // Initialize sql.js Database - initJs should now be the SQL object with Database constructor
  const SQL = initJs;
  
  // SQL.Database should be available after initSqlJs resolves
  if (!SQL || !SQL.Database || typeof SQL.Database !== 'function') {
    console.error('SQL object:', SQL);
    console.error('SQL.Database:', SQL?.Database);
    throw new Error('sql.js Database constructor not found. Make sure sql.js is properly initialized. SQL object: ' + JSON.stringify(Object.keys(SQL || {})));
  }
  
  const sqlDb = new SQL.Database(dbData || undefined);
  
  // Save function for IndexedDB
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
  
  // Create wrapper with expo-sqlite compatible API
  // Store SQL reference for rollback
  const SQLRef = SQL;
  
  webDb = {
    // Transaction support
    withTransactionAsync: async (callback: () => Promise<void>) => {
      try {
        await callback();
        await saveDb();
      } catch (error) {
        // Rollback by reloading from IndexedDB
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
                    // Replace sqlDb reference
                    Object.keys(sqlDb).forEach(key => delete (sqlDb as any)[key]);
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
    
    // Run query and return lastInsertRowId
    runAsync: async (query: string, params: any[] = []) => {
      // sql.js uses ? placeholders, but we need to use prepare/run
      const stmt = sqlDb.prepare(query);
      try {
        stmt.bind(params);
        stmt.step();
        stmt.free();
      } catch (e) {
        stmt.free();
        throw e;
      }
      
      await saveDb();
      
      // Get last insert rowid using prepare/step/get
      const idStmt = sqlDb.prepare("SELECT last_insert_rowid() as id");
      idStmt.step();
      const idRow = idStmt.getAsObject();
      idStmt.free();
      const lastId = idRow.id || 0;
      
      return {
        lastInsertRowId: lastId
      };
    },
    
    // Get all rows
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
    }
  };
  
  return webDb;
}

// Unified database interface
export const openDatabase = async () => {
  if (Platform.OS === 'web') {
    const db = await initWebDb();
    if (!db || typeof db.runAsync !== 'function') {
      throw new Error('Failed to initialize web database. Database object is invalid.');
    }
    return db;
  } else {
    return await initNativeDb();
  }
};

// Helper to convert sql.js results to expo-sqlite format
function convertWebResult(rows: any[]): any[] {
  return rows.map((row: any) => {
    const obj: any = {};
    for (let i = 0; i < row.values.length; i++) {
      const key = row.columns[i];
      obj[key] = row.values[i];
    }
    return obj;
  });
}

export const executeSql = async (
  query: string,
  params: any[] = []
) => {
  const database = await openDatabase();
  // Both web and native use the same interface now
  await database.runAsync(query, params);
};

export const querySql = async (
  query: string,
  params: any[] = []
) => {
  const database = await openDatabase();
  // Both web and native use the same interface now
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
