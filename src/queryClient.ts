import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/** Persisted-cache lifetime. gcTime must be >= this or the cache is discarded early. */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24h

/** Bump when the shape of any cached query data changes, to invalidate stale caches. */
export const CACHE_SCHEMA_VERSION = "v1";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: CACHE_MAX_AGE,
        staleTime: 1000 * 30, // treat data fresh for 30s to avoid refetch storms
        refetchOnWindowFocus: true, // replaces App's manual focus listener
        retry: 1, // Graph failures are mostly auth/404 — don't hammer
      },
    },
  });
}

export const persister = createSyncStoragePersister({ storage: window.localStorage });
