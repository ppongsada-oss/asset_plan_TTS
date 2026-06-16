import { drizzle } from 'drizzle-orm/d1';

export interface Env {
  DB: D1Database;
  CACHE_KV?: KVNamespace;
}

// Custom D1Database mock to direct local development queries to live Cloudflare D1 HTTP REST API
class RemoteD1PreparedStatement {
  constructor(
    private client: RemoteD1Client,
    private sql: string,
    private params: any[] = []
  ) {}

  bind(...params: any[]): D1PreparedStatement {
    return new RemoteD1PreparedStatement(this.client, this.sql, params) as unknown as D1PreparedStatement;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    const rows = await this.client.executeQuery(this.sql, this.params, 'query');
    if (!rows || rows.length === 0) return null;
    if (colName) return rows[0][colName] as T;
    return rows[0] as T;
  }

  async run<T = unknown>(): Promise<D1Response> {
    return this.client.executeMeta(this.sql, this.params) as Promise<D1Response>;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    const rows = await this.client.executeQuery(this.sql, this.params, 'query') as T[];
    return {
      results: rows,
      success: true,
      meta: {
        duration: 0,
        rows_read: 0,
        rows_written: 0,
        size_after: 0
      } as any
    };
  }

  async raw<T = any[]>(): Promise<T[]> {
    return this.client.executeQuery(this.sql, this.params, 'raw') as unknown as T[];
  }
}

class RemoteD1Client {
  constructor(
    private accountId: string,
    private databaseId: string,
    private apiToken: string
  ) {}

  private getUrl(endpoint: 'query' | 'raw'): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/${endpoint}`;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    };
  }

  async executeQuery(sql: string, params: any[], endpoint: 'query' | 'raw'): Promise<any> {
    try {
      const res = await fetch(this.getUrl(endpoint), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ sql, params })
      });

      const data = await res.json() as any;
      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || 'D1 API error');
      }

      const queryResult = data.result?.[0];
      const results = queryResult?.results;

      if (endpoint === 'raw') {
        if (results && typeof results === 'object' && 'rows' in results) {
          return results.rows;
        }
        if (Array.isArray(data.result)) {
          return data.result;
        }
        return [];
      } else {
        if (results && typeof results === 'object' && 'columns' in results && 'rows' in results) {
          const cols = results.columns as string[];
          const rows = results.rows as any[][];
          return rows.map(row => {
            const obj: Record<string, any> = {};
            cols.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        }
        return results || [];
      }
    } catch (e: any) {
      console.error('Remote D1 Query Error:', e);
      throw e;
    }
  }

  async executeMeta(sql: string, params: any[]): Promise<D1Response> {
    try {
      const res = await fetch(this.getUrl('query'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ sql, params })
      });

      const data = await res.json() as any;
      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || 'D1 API error');
      }
      const queryResult = data.result?.[0];
      return {
        success: queryResult?.success ?? false,
        meta: queryResult?.meta ?? {}
      };
    } catch (e: any) {
      console.error('Remote D1 Exec Error:', e);
      throw e;
    }
  }

}


class RemoteD1Database {
  private client: RemoteD1Client;

  constructor(accountId: string, databaseId: string, apiToken: string) {
    this.client = new RemoteD1Client(accountId, databaseId, apiToken);
  }

  prepare(query: string): D1PreparedStatement {
    return new RemoteD1PreparedStatement(this.client, query) as unknown as D1PreparedStatement;
  }

  async dump(): Promise<ArrayBuffer> {
    throw new Error('dump() is not supported on RemoteD1Database.');
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const stmt of statements) {
      const allRes = await stmt.all<T>();
      results.push(allRes);
    }
    return results;
  }

  async exec<T = unknown>(query: string): Promise<D1Result<T>> {
    const rows = await this.client.executeQuery(query, [], 'query');
    return {
      results: rows,
      success: true,
      meta: {
        duration: 0,
        rows_read: 0,
        rows_written: 0,
        size_after: 0
      } as any
    } as D1Result<T>;
  }
}

export function getRawD1(env: Env): D1Database {
  if (process.env.NODE_ENV === 'development') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
    const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

    if (accountId && databaseId && apiToken) {
      return new RemoteD1Database(accountId, databaseId, apiToken) as unknown as D1Database;
    }
  }
  return env.DB;
}


export function getDb(env: Env) {
  if (process.env.NODE_ENV === 'development') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
    const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

    if (accountId && databaseId && apiToken) {
      console.log('Using RemoteD1Database proxy connecting to D1 remote...');
      return drizzle(new RemoteD1Database(accountId, databaseId, apiToken) as unknown as D1Database);
    }
  }

  return drizzle(env.DB);
}
