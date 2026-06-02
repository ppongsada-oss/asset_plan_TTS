/// <reference types="@cloudflare/workers-types" />

// Augment the global CloudflareEnv interface to include all KV namespaces and bindings
// defined in wrangler.toml so TypeScript resolves them without `as any` casts.
declare global {
  interface CloudflareEnv {
    CACHE_KV: KVNamespace;
    DB: D1Database;
  }
}

export {};
