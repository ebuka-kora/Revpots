import { openDatabase, querySql, executeSql } from '@/db/database';
import { api } from './api';

const DEVICE_ID_KEY = 'device_id_storage';

// Get or create device ID (using AsyncStorage fallback)
const getDeviceId = async (): Promise<string> => {
  try {
    // Try to use SecureStore if available
    const SecureStore = await import('expo-secure-store').catch(() => null);
    if (SecureStore) {
      let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    }
  } catch {
    // Fallback to localStorage (web) or generate new
  }
  
  // Fallback: generate and store in memory (will regenerate on app restart)
  // In production, you might want to use AsyncStorage here
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

type ProductRow = {
  id: number;
  name: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  lowStockLevel: number;
  createdAt: string;
  syncedAt?: string;
  serverId?: string;
};

type InvoiceRow = {
  id: number;
  totalAmount: number;
  totalItems: number;
  createdAt: string;
  syncedAt?: string;
  serverId?: string;
};

type InvoiceItemRow = {
  id: number;
  invoiceId: number;
  productId: number;
  quantity: number;
  price: number;
};

// Add sync tracking columns to database
export const initSyncTables = async () => {
  const db = await openDatabase();
  
  // Add sync columns if they don't exist
  try {
    await db.runAsync(`
      ALTER TABLE products ADD COLUMN syncedAt TEXT;
    `);
  } catch {
    // Column already exists
  }

  try {
    await db.runAsync(`
      ALTER TABLE products ADD COLUMN serverId TEXT;
    `);
  } catch {
    // Column already exists
  }

  try {
    await db.runAsync(`
      ALTER TABLE invoices ADD COLUMN syncedAt TEXT;
    `);
  } catch {
    // Column already exists
  }

  try {
    await db.runAsync(`
      ALTER TABLE invoices ADD COLUMN serverId TEXT;
    `);
  } catch {
    // Column already exists
  }
};

// Pull data from server
export const pullFromServer = async (): Promise<{ products: ProductRow[]; invoices: InvoiceRow[] }> => {
  try {
    const data = await api.get<{ products: any[]; invoices: any[] }>('/sync/all');
    
    const db = await openDatabase();
    const deviceId = await getDeviceId();

    await db.withTransactionAsync(async () => {
      // Sync products
      for (const serverProduct of data.products) {
        // Check if we already have this product locally
        const existing = (await querySql(
          'SELECT * FROM products WHERE serverId = ? OR id = ?',
          [serverProduct._id || serverProduct.id, serverProduct.id]
        )) as ProductRow[];

        if (existing.length > 0) {
          // Update existing
          await db.runAsync(
            `UPDATE products 
             SET name = ?, costPrice = ?, sellingPrice = ?, quantity = ?, 
                 lowStockLevel = ?, syncedAt = ?, serverId = ?
             WHERE id = ?`,
            [
              serverProduct.name,
              serverProduct.costPrice,
              serverProduct.sellingPrice,
              serverProduct.quantity,
              serverProduct.lowStockLevel,
              new Date().toISOString(),
              serverProduct._id || serverProduct.id,
              existing[0].id,
            ]
          );
        } else {
          // Insert new
          await db.runAsync(
            `INSERT INTO products (name, costPrice, sellingPrice, quantity, lowStockLevel, createdAt, syncedAt, serverId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              serverProduct.name,
              serverProduct.costPrice,
              serverProduct.sellingPrice,
              serverProduct.quantity,
              serverProduct.lowStockLevel,
              serverProduct.createdAt || new Date().toISOString(),
              new Date().toISOString(),
              serverProduct._id || serverProduct.id,
            ]
          );
        }
      }

      // Sync invoices
      for (const serverInvoice of data.invoices) {
        const existing = (await querySql(
          'SELECT * FROM invoices WHERE serverId = ? OR id = ?',
          [serverInvoice._id || serverInvoice.id, serverInvoice.id]
        )) as InvoiceRow[];

        if (existing.length > 0) {
          await db.runAsync(
            `UPDATE invoices 
             SET totalAmount = ?, totalItems = ?, createdAt = ?, syncedAt = ?, serverId = ?
             WHERE id = ?`,
            [
              serverInvoice.totalAmount,
              serverInvoice.totalItems,
              serverInvoice.createdAt,
              new Date().toISOString(),
              serverInvoice._id || serverInvoice.id,
              existing[0].id,
            ]
          );
        } else {
          await db.runAsync(
            `INSERT INTO invoices (totalAmount, totalItems, createdAt, syncedAt, serverId)
             VALUES (?, ?, ?, ?, ?)`,
            [
              serverInvoice.totalAmount,
              serverInvoice.totalItems,
              serverInvoice.createdAt || new Date().toISOString(),
              new Date().toISOString(),
              serverInvoice._id || serverInvoice.id,
            ]
          );
        }

        // Sync invoice items
        if (serverInvoice.items && Array.isArray(serverInvoice.items)) {
          const localInvoiceId = existing.length > 0 ? existing[0].id : 
            (await querySql('SELECT id FROM invoices WHERE serverId = ?', [serverInvoice._id || serverInvoice.id]))[0]?.id;

          if (localInvoiceId) {
            // Delete old items
            await db.runAsync('DELETE FROM invoice_items WHERE invoiceId = ?', [localInvoiceId]);

            // Insert new items
            for (const item of serverInvoice.items) {
              const productId = item.productId?._id || item.productId || item.productId;
              const localProduct = (await querySql(
                'SELECT id FROM products WHERE serverId = ? OR id = ?',
                [productId, productId]
              ))[0];

              if (localProduct) {
                await db.runAsync(
                  `INSERT INTO invoice_items (invoiceId, productId, quantity, price)
                   VALUES (?, ?, ?, ?)`,
                  [localInvoiceId, localProduct.id, item.quantity, item.price]
                );
              }
            }
          }
        }
      }
    });

    return { products: data.products as any, invoices: data.invoices as any };
  } catch (error) {
    throw new Error(`Failed to pull from server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Push local data to server
export const pushToServer = async (): Promise<void> => {
  try {
    const deviceId = await getDeviceId();
    
    // Get unsynced or modified data
    const products = (await querySql(
      `SELECT * FROM products WHERE syncedAt IS NULL OR syncedAt < datetime('now', '-1 minute')`
    )) as ProductRow[];

    const invoices = (await querySql(
      `SELECT * FROM invoices WHERE syncedAt IS NULL OR syncedAt < datetime('now', '-1 minute')`
    )) as InvoiceRow[];

    // Get invoice items for each invoice
    const invoicesWithItems = await Promise.all(
      invoices.map(async (invoice) => {
        const items = (await querySql(
          'SELECT * FROM invoice_items WHERE invoiceId = ?',
          [invoice.id]
        )) as InvoiceItemRow[];

        // Get product names for items
        const itemsWithNames = await Promise.all(
          items.map(async (item) => {
            const product = (await querySql(
              'SELECT name FROM products WHERE id = ?',
              [item.productId]
            ))[0] as { name: string };

            return {
              productId: invoice.serverId ? item.productId : null,
              productName: product?.name || 'Unknown',
              quantity: item.quantity,
              price: item.price,
            };
          })
        );

        return {
          _id: invoice.serverId || undefined,
          id: invoice.id,
          totalAmount: invoice.totalAmount,
          totalItems: invoice.totalItems,
          createdAt: invoice.createdAt,
          items: itemsWithNames,
        };
      })
    );

    // Format products for API
    const productsForApi = products.map((p) => ({
      _id: p.serverId || undefined,
      id: p.id,
      name: p.name,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      quantity: p.quantity,
      lowStockLevel: p.lowStockLevel,
      createdAt: p.createdAt,
    }));

    // Push to server
    const result = await api.post<{ products: any[]; invoices: any[] }>('/sync/push', {
      products: productsForApi,
      invoices: invoicesWithItems,
      deviceId,
    });

    // Update local sync status
    const db = await openDatabase();
    await db.withTransactionAsync(async () => {
      // Update product sync status
      for (const product of result.products) {
        await db.runAsync(
          `UPDATE products SET syncedAt = ?, serverId = ? WHERE id = ?`,
          [new Date().toISOString(), product._id || product.id, product.id]
        );
      }

      // Update invoice sync status
      for (const invoice of result.invoices) {
        await db.runAsync(
          `UPDATE invoices SET syncedAt = ?, serverId = ? WHERE id = ?`,
          [new Date().toISOString(), invoice._id || invoice.id, invoice.id]
        );
      }
    });
  } catch (error) {
    throw new Error(`Failed to push to server: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Full sync (pull then push)
export const fullSync = async (): Promise<{ pulled: number; pushed: number }> => {
  try {
    // First pull from server
    const pulled = await pullFromServer();
    
    // Then push local changes
    await pushToServer();

    return {
      pulled: (pulled.products?.length || 0) + (pulled.invoices?.length || 0),
      pushed: 0, // Could track this if needed
    };
  } catch (error) {
    throw new Error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Check if server is available
export const checkServerConnection = async (): Promise<boolean> => {
  return await api.checkConnection();
};
