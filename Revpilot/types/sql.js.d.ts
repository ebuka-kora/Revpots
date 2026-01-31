declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[]): void;
    exec(sql: string, params?: any[]): any;
    prepare(sql: string): Statement;
    close(): void;
    export(): Uint8Array;
  }

  export interface Statement {
    bind(values: any[]): void;
    step(): boolean;
    get(): any[];
    getAsObject(): { [key: string]: any };
    getColumnNames(): string[];
    free(): void;
  }

  export interface InitSqlJs {
    (config?: {
      locateFile?: (file: string) => string;
    }): Promise<{
      Database: new (data?: Uint8Array) => Database;
    }>;
  }

  export const initSqlJs: InitSqlJs;
  export default initSqlJs;
}
