export async function invalidateCache(kv: any) {
  if (!kv) return;
  try {
    let listComplete = false;
    let cursor: string | undefined = undefined;
    let invalidatedCount = 0;

    // Paginate through all matching keys to handle list sizes > 1000
    while (!listComplete) {
      const result: any = await kv.list({ prefix: "matrix_report_v3_", cursor });
      if (result.keys && result.keys.length > 0) {
        // Delete all keys in the current page in parallel
        await Promise.all(result.keys.map((key: any) => kv.delete(key.name)));
        invalidatedCount += result.keys.length;
      }
      listComplete = result.list_complete;
      cursor = result.cursor;
    }

    await kv.delete("dashboard_alerts");
    console.log(`[Cache Invalidation] ${invalidatedCount} Matrix Caches and dashboard_alerts invalidated`);
  } catch (error) {
    console.error("[Cache Invalidation] Failed to invalidate cache:", error);
  }
}

