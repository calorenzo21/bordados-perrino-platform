import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Storage cleanup helper.
 *
 * The `delete_order_cascade` / `delete_client_hard` SQL functions return the
 * public URLs of every photo whose row they removed. The database cannot
 * reach Storage, so the API route calls this afterwards to drop the actual
 * blobs.
 *
 * This is intentionally best-effort: the row deletion has already committed,
 * so a Storage problem must never turn into a failed request. It never
 * throws — it logs and continues. Anything that isn't a recognizable
 * Supabase public Storage URL is skipped.
 */

// Public Storage URLs look like:
//   {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path...}
const PUBLIC_PREFIX = '/storage/v1/object/public/';

/** Parse a public URL into its bucket + object path, or null if it doesn't match. */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const marker = url.indexOf(PUBLIC_PREFIX);
  if (marker === -1) return null;

  const rest = url.slice(marker + PUBLIC_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;

  const bucket = rest.slice(0, slash);
  let objectPath = rest.slice(slash + 1);

  // Drop any query string (e.g. cache-busting params).
  const qmark = objectPath.indexOf('?');
  if (qmark !== -1) objectPath = objectPath.slice(0, qmark);
  if (!objectPath) return null;

  return { bucket, path: decodeURIComponent(objectPath) };
}

/**
 * Best-effort deletion of Storage objects, given their public URLs.
 * Groups paths by bucket and removes each bucket's objects in one call.
 */
export async function deleteStorageObjectsByUrl(
  adminClient: SupabaseClient,
  urls: readonly string[]
): Promise<void> {
  const pathsByBucket = new Map<string, string[]>();

  for (const url of urls) {
    if (typeof url !== 'string' || url.length === 0) continue;
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    const bucketPaths = pathsByBucket.get(parsed.bucket) ?? [];
    bucketPaths.push(parsed.path);
    pathsByBucket.set(parsed.bucket, bucketPaths);
  }

  for (const [bucket, paths] of pathsByBucket) {
    try {
      const { error } = await adminClient.storage.from(bucket).remove(paths);
      if (error) {
        console.error(`[storage-cleanup] bucket "${bucket}": ${error.message}`);
      }
    } catch (err) {
      console.error(`[storage-cleanup] bucket "${bucket}" threw:`, err);
    }
  }
}
