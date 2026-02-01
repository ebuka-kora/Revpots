/**
 * Re-exports from platform-specific database.
 * Metro resolves to database.web.ts (web) or database.native.ts (native).
 * This fallback re-exports web so TypeScript and non-Metro environments resolve.
 */
export { openDatabase, executeSql, querySql, initDatabase } from './database.web';
