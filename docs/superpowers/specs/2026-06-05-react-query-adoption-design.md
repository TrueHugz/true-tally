# React Query Adoption — Reads + Cross-Session Persistence

**Date:** 2026-06-05
**Status:** Approved (design)
**Scope:** Adopt TanStack Query (React Query) v5 for the read side of the app and persist its cache across sessions. Leave the durable offline write path untouched.

## Problem

Today the read hooks (`useCatalog`, `useLogs`) are hand-rolled with `useState`/`useEffect`/`useCallback`. Each duplicates the same `loading`/`error`/`reload` try-catch-finally boilerplate, refetches from Microsoft Graph on every cold start (skeletons every wake/reload), and has no request dedup or background refresh. `App.tsx` adds a manual `focus` listener to re-trigger reloads.

Server data does **not** persist across sessions: only sign-in (MSAL → localStorage) and pending writes (`pendingStore` → localStorage) survive a reload. So on a cold start the user waits on Graph round-trips before seeing anything.

## Goals

1. **Persist** last-known catalog + logs to localStorage so a cold start (tablet wake / reload) renders instantly from cache, then refetches in the background. No skeletons on every load.
2. **Simplify reads**: remove the hand-rolled `loading`/`error`/`reload`/focus-refetch boilerplate; gain request dedup, background refetch, and focus-refetch for free.

## Non-Goals

- **Do not** touch the offline write path. `src/queue/pendingStore.ts`, `src/queue/syncWorker.ts`, `src/domain/merge.ts`, `src/data/graphRepo.ts`, the `WorkbookRepo` interface, MSAL auth, and all domain logic stay byte-for-byte unchanged. The durable localStorage queue remains the **source of truth** for writes.
- No optimistic updates for catalog mutations (rare; plain invalidation is enough).
- No migration to React Query offline *mutations* (`resumePausedMutations`). The bespoke queue is kept deliberately.

## Decisions (locked during brainstorming)

- **Adoption scope:** Reads via React Query with optimistic cache inserts on save; durable queue + syncWorker remain source of truth for writes.
- **Persist backend:** localStorage via `@tanstack/query-sync-storage-persister` (synchronous, zero extra deps, consistent with existing `pendingStore` + MSAL cache). IndexedDB is the documented upgrade path if logs grow large.

## Dependencies (new)

- `@tanstack/react-query`
- `@tanstack/react-query-persist-client`
- `@tanstack/query-sync-storage-persister`

Target: React Query v5 (verified against v5.90.3 docs).

## Architecture

```
READS                                            PERSIST
useQuery(['catalog'])  ─┐
useQuery(['logs'])     ─┼─► QueryClient cache ──► localStorage (sync persister, maxAge 24h)
                        │        ▲
WRITES (unchanged)      │        │ optimistic setQueryData + invalidate
pendingStore (localStorage) ─────┘
syncWorker  ─────────────────► Microsoft Graph
usePendingQueue (online/focus sync listeners)
```

### Provider setup — `src/main.tsx`

Create a single `QueryClient` and wrap `<App>` in `PersistQueryClientProvider`.

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24h — MUST be >= persister maxAge or cache is GC'd early
      staleTime: 1000 * 30,        // 30s — treat data fresh briefly to avoid refetch storms
      refetchOnWindowFocus: true,  // replaces App's manual focus listener
      retry: 1,                    // Graph failures are mostly auth/404; don't hammer
    },
  },
})

const persister = createSyncStoragePersister({ storage: window.localStorage })
```

```tsx
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: CACHE_SCHEMA_VERSION }}
>
  <App msal={msal} />
</PersistQueryClientProvider>
```

- `CACHE_SCHEMA_VERSION` is a string constant bumped whenever the cached data shape changes, so stale-shaped caches self-invalidate.
- The `QueryClient` needs no `repo`, so it lives cleanly in `main.tsx` above `App`. Query hooks (inside `App`) close over the `repo` and run under the provider.

### Reads — hooks keep their external shape

`useCatalog(repo)` keeps returning `{ institutions, branches, products, loading, error, reload }`:

```ts
const q = useQuery({
  queryKey: ['catalog'],
  queryFn: async () => {
    await repo.ensureWorkbook()
    const [institutions, branches, products] = await Promise.all([
      repo.getInstitutions(), repo.getBranches(), repo.getProducts(),
    ])
    return { institutions, branches, products }
  },
})
// map: loading = q.isPending, error = q.error ? String(q.error) : null,
//      reload = () => void q.refetch(), data defaults to empty arrays
```

`useLogs(repo)` keeps returning `{ entries, reload, error, loading }` and drops the `pendingVersion` param:

```ts
const q = useQuery({
  queryKey: ['logs'],
  queryFn: async () => {
    await repo.ensureWorkbook()
    return mergeEntries(await repo.getLogs(), loadPending())
  },
})
```

Merging pending **inside** the queryFn preserves current behavior and guarantees a background refetch never drops a not-yet-synced row.

### Writes — unchanged durability + RQ optimistic/invalidate

`usePendingQueue(repo)` keeps `pendingStore` + `syncWorker` + its own `online`/`focus` **sync** listeners (these flush writes — a different concern from read refetch). It gains `useQueryClient()` and two touchpoints:

1. `enqueue(entry)`: after `addPending(entry)`, optimistically insert so the row shows instantly, then attempt sync:
   ```ts
   queryClient.setQueryData(['logs'], (old: LogEntry[] | undefined) => mergeEntries(old ?? [], [entry]))
   void sync()
   ```
2. After `sync()` settles (success or partial): `queryClient.invalidateQueries({ queryKey: ['logs'] })` so server truth + any remaining pending re-merge.

It exposes `pendingIds: Set<string>` as state (updated on `refresh`/`sync`), replacing the `version` counter and the `version`-keyed `pendingIds` memo in `App`.

Catalog mutations in `App` (`handleAddBranch`, `handleAddProduct`): after `repo.addX(...)`, replace `await reloadCatalog()` with `queryClient.invalidateQueries({ queryKey: ['catalog'] })`.

### `App.tsx` cleanup

- Remove the manual `onFocus` → `refresh()` effect (RQ `refetchOnWindowFocus` covers reads). The save-toast auto-dismiss effect stays.
- `refresh` button → `queryClient.invalidateQueries()` for `['catalog']` and `['logs']`.
- `refreshing` → `useIsFetching() > 0` (or combine the two query `isFetching` flags).
- `pendingIds` now sourced from `usePendingQueue` instead of the `loadPending()` + `queue.version` memo.

## What stays exactly the same

`pendingStore.ts`, `syncWorker.ts`, `mergeEntries`, `graphRepo.ts`, the `WorkbookRepo` interface, all `domain/*` logic, `export/*`, and MSAL auth. No behavior change to offline durability or sync semantics.

## Testing

- Add a `renderWithClient` / `wrapper` test util with a test `QueryClient` (`retry: false`, `gcTime: Infinity`).
- Rewrite `useCatalog` / `useLogs` tests to mount under the provider; assert the same `{ data, loading, error, reload }` behavior as before.
- `pendingStore`, `syncWorker`, `merge`, and other domain tests are untouched.
- New tests:
  - Persisted cache hydrates and renders before a refetch resolves (cold-start path).
  - `enqueue` optimistically shows the new entry immediately.
  - Post-sync `invalidateQueries(['logs'])` reconciles server + remaining pending.

## Risks & Mitigations

- **localStorage footprint:** now holds MSAL tokens + `pendingEntries` + the RQ cache (logs being the largest). Single-user log volumes stay well under the ~5MB cap. `buster`/`CACHE_SCHEMA_VERSION` guards schema drift. **Upgrade path:** swap `createSyncStoragePersister` for `createAsyncStoragePersister` + IndexedDB (`idb-keyval`) if logs ever grow large.
- **GC vs persistence:** `gcTime` must be ≥ persister `maxAge` (both 24h) or the cache is discarded earlier than expected. Locked in the provider config above.
- **Stale-on-cold-start UX:** showing last-known (possibly stale) data while refetching in the background is the intended behavior and matches the existing pending-overlay model.

## Out of Scope / Future

- React Query offline mutations (`resumePausedMutations`) to replace the bespoke queue.
- Optimistic catalog mutations.
- IndexedDB persister (documented upgrade path only).
