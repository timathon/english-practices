/**
 * Abstract Database Client Interface
 * Allows seamless migration between Cloudflare D1, SQLite, PostgreSQL, TiDB, etc.
 */
export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ success: boolean; changes?: number }>;
  batch(operations: { sql: string; params?: any[] }[]): Promise<boolean>;
}

/**
 * Cloudflare D1 implementation of IDatabase
 */
export class D1DatabaseAdapter implements IDatabase {
  private d1: D1Database;

  constructor(d1: D1Database) {
    this.d1 = d1;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const res = await stmt.all<T>();
    return res.results || [];
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const res = await stmt.first<T>();
    return res || null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ success: boolean; changes?: number }> {
    const stmt = this.d1.prepare(sql).bind(...params);
    const res = await stmt.run();
    return { success: res.success, changes: res.meta?.changes };
  }

  async batch(operations: { sql: string; params?: any[] }[]): Promise<boolean> {
    const stmts = operations.map(op => this.d1.prepare(op.sql).bind(...(op.params || [])));
    const res = await this.d1.batch(stmts);
    return res.every(r => r.success);
  }
}

/**
 * Database Factory / Helper
 */
export function getDb(env: { DB: D1Database }): IDatabase {
  return new D1DatabaseAdapter(env.DB);
}
