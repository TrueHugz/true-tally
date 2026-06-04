# React Query Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the read side of the app (catalog + logs) onto TanStack Query (React Query) v5, persist its cache to localStorage so cold starts render instantly, and keep the existing durable offline write queue as the source of truth for writes.

**Architecture:** A single `QueryClient` (configured for 24h cache retention) is provided at the root via `PersistQueryClientProvider` backed by a synchronous localStorage persister. `useCatalog`/`useLogs` become thin `useQuery` wrappers that keep their current return shape. The bespoke write path (`pendingStore` + `syncWorker` + `usePendingQueue`) is untouched except that `usePendingQueue` now optimistically writes new entries into the `['logs']` cache and invalidates it after a sync.

**Tech Stack:** React 19, Vite, TypeScript, Vitest + @testing-library/react 16, `@tanstack/react-query` v5, `@tanstack/react-query-persist-client`, `@tanstack/query-sync-storage-persister`.

**Reference spec:** `docs/superpowers/specs/2026-06-05-react-query-adoption-design.md`

---

## File Structure

**Create:**
- `src/queryClient.ts` — production `QueryClient` factory, persister, and cache-version constants. One responsibility: React Query configuration.
- `src/queryClient.test.ts` — asserts the `gcTime ≥ maxAge` invariant.
- `src/test/queryWrapper.tsx` — shared test helper that wraps hooks in a `QueryClientProvider` with test-friendly defaults.
- `src/hooks/useCatalog.test.tsx` — tests for the converted catalog hook.
- `src/hooks/useLogs.test.tsx` — tests for the converted logs hook.
- `src/hooks/usePendingQueue.test.tsx` — tests for optimistic insert + invalidation + `pendingIds`.

**Modify:**
- `package.json` / `package-lock.json` — add the three dependencies.
- `src/main.tsx` — wrap `<App>` in `PersistQueryClientProvider`.
- `src/hooks/useCatalog.ts` — `useQuery`, same return shape.
- `src/hooks/useLogs.ts` — `useQuery`, drop the `pendingVersion` param.
- `src/hooks/usePendingQueue.ts` — add optimistic cache insert + invalidate, expose `pendingIds`, drop `version`.
- `src/App.tsx` — drop `pendingVersion` arg, source `pendingIds` from the queue, then (Task 4) remove the manual focus-refetch effect and route refresh through `invalidateQueries` / `useIsFetching`.

**Untouched (verify no edits):** `src/queue/pendingStore.ts`, `src/queue/syncWorker.ts`, `src/domain/merge.ts`, `src/data/graphRepo.ts`, `src/data/repo.ts`, `src/data/types.ts`, all `src/domain/*`, `src/export/*`, `src/auth/*`.

---

## Task 1: Dependencies, QueryClient config, and provider wiring

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/queryClient.ts`
- Test: `src/queryClient.test.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Install the dependencies**

This repo uses npm (a `package-lock.json` is committed). Honor `~/.npmrc`.

Run:
```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```
Expected: three packages added under `dependencies` in `package.json`; `package-lock.json` updated.

- [ ] **Step 2: Write the failing test for the QueryClient config**

Create `src/queryClient.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { makeQueryClient, CACHE_MAX_AGE } from "./queryClient";

describe("queryClient", () => {
  it("sets gcTime >= persister maxAge so the persisted cache is not GC'd early", () => {
    const client = makeQueryClient();
    const gcTime = client.getDefaultOptions().queries?.gcTime;
    expect(gcTime).toBeGreaterThanOrEqual(CACHE_MAX_AGE);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/queryClient.test.ts`
Expected: FAIL — cannot resolve `./queryClient` (module does not exist yet).

- [ ] **Step 4: Create the QueryClient factory**

Create `src/queryClient.ts`:
```ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/queryClient.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Wire the provider in `src/main.tsx`**

Add these imports near the top of `src/main.tsx`:
```ts
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { makeQueryClient, persister, CACHE_MAX_AGE, CACHE_SCHEMA_VERSION } from "./queryClient";
```

Add, just after `const msal = new PublicClientApplication(msalConfig);`:
```ts
const queryClient = makeQueryClient();
```

Replace the existing render block:
```tsx
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App msal={msal} />
    </StrictMode>,
  );
```
with:
```tsx
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_SCHEMA_VERSION }}
      >
        <App msal={msal} />
      </PersistQueryClientProvider>
    </StrictMode>,
  );
```

- [ ] **Step 7: Typecheck + build**

Run: `npm run build`
Expected: PASS — `tsc -b` reports no errors and `vite build` completes. (The app still uses the old hooks at this point; the provider is present but harmless.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/queryClient.ts src/queryClient.test.ts src/main.tsx
git commit -m "feat: add React Query client + localStorage persistence provider"
```

---

## Task 2: Convert `useCatalog` to `useQuery`

**Files:**
- Create: `src/test/queryWrapper.tsx`
- Test: `src/hooks/useCatalog.test.tsx`
- Modify: `src/hooks/useCatalog.ts`

- [ ] **Step 1: Create the shared test wrapper**

Create `src/test/queryWrapper.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/** A QueryClientProvider wrapper with test-friendly defaults (no retries/refetch, no GC). */
export function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 2: Write the failing test for `useCatalog`**

Create `src/hooks/useCatalog.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCatalog } from "./useCatalog";
import { createWrapper } from "../test/queryWrapper";
import type { WorkbookRepo } from "../data/repo";

function fakeRepo(overrides: Partial<WorkbookRepo> = {}): WorkbookRepo {
  return {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [{ institution: "NUH", remarks: "" }],
    getBranches: async () => [{ institution: "NUH", branch: "B1", remarks: "" }],
    getProducts: async () => [{ description: "P1", sku: "S1", type: "Bag" }],
    getLogs: async () => [],
    appendLog: async () => {},
    hasLog: async () => false,
    addInstitution: async () => {},
    addBranch: async () => {},
    addProduct: async () => {},
    ...overrides,
  };
}

describe("useCatalog", () => {
  it("loads institutions, branches, and products", async () => {
    const repo = fakeRepo();
    const { result } = renderHook(() => useCatalog(repo), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.institutions).toHaveLength(1);
    expect(result.current.branches).toHaveLength(1);
    expect(result.current.products).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a thrown error as a string", async () => {
    const repo = fakeRepo({ getInstitutions: async () => { throw new Error("boom"); } });
    const { result } = renderHook(() => useCatalog(repo), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toContain("boom"));
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useCatalog.test.tsx`
Expected: FAIL — the current `useCatalog` works without a provider, but these assertions exercise the new shape; failure is acceptable here because the implementation is rewritten in the next step. (If it happens to pass, still proceed — the next step is the real change.)

- [ ] **Step 4: Rewrite `useCatalog` with `useQuery`**

Replace the entire contents of `src/hooks/useCatalog.ts`:
```ts
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WorkbookRepo } from "../data/repo";
import type { Branch, Institution, Product } from "../data/types";

const EMPTY = {
  institutions: [] as Institution[],
  branches: [] as Branch[],
  products: [] as Product[],
};

export function useCatalog(repo: WorkbookRepo) {
  const q = useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      await repo.ensureWorkbook();
      const [institutions, branches, products] = await Promise.all([
        repo.getInstitutions(),
        repo.getBranches(),
        repo.getProducts(),
      ]);
      return { institutions, branches, products };
    },
  });

  const { refetch } = q;
  const reload = useCallback(async () => { await refetch(); }, [refetch]);
  const data = q.data ?? EMPTY;

  return {
    institutions: data.institutions,
    branches: data.branches,
    products: data.products,
    loading: q.isPending,
    error: q.error ? String(q.error) : null,
    reload,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/hooks/useCatalog.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck + full test suite + lint**

Run: `npm run build && npm test && npm run lint`
Expected: all PASS. `App.tsx` is unchanged because `useCatalog` keeps the same return shape (`institutions`, `branches`, `products`, `loading`, `error`, `reload`).

- [ ] **Step 7: Commit**

```bash
git add src/test/queryWrapper.tsx src/hooks/useCatalog.ts src/hooks/useCatalog.test.tsx
git commit -m "refactor: back useCatalog with React Query useQuery"
```

---

## Task 3: Convert `useLogs` + integrate the write queue with React Query

This task changes three files together because they are coupled: `useLogs` drops the `pendingVersion` param, so `usePendingQueue` must take over refreshing the logs cache (optimistic insert + invalidate), and `App.tsx` must update both call sites. Doing them in one commit keeps the app functional.

**Files:**
- Test: `src/hooks/useLogs.test.tsx`
- Modify: `src/hooks/useLogs.ts`
- Test: `src/hooks/usePendingQueue.test.tsx`
- Modify: `src/hooks/usePendingQueue.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test for `useLogs`**

Create `src/hooks/useLogs.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLogs } from "./useLogs";
import { createWrapper } from "../test/queryWrapper";
import { savePending } from "../queue/pendingStore";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";

const serverEntry: LogEntry = {
  entryId: "s1", activityDate: "2026-06-05", institution: "NUH", branch: "B1",
  activityType: "Stock Take", product: "P1", sku: "S1", quantity: 2,
  loggedAt: "2026-06-05T00:00:00.000Z",
};
const pendingEntry: LogEntry = { ...serverEntry, entryId: "p1", quantity: 5 };

function repoWith(logs: LogEntry[]): WorkbookRepo {
  return {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [],
    getBranches: async () => [],
    getProducts: async () => [],
    getLogs: async () => logs,
    appendLog: async () => {},
    hasLog: async () => false,
    addInstitution: async () => {},
    addBranch: async () => {},
    addProduct: async () => {},
  };
}

beforeEach(() => localStorage.clear());

describe("useLogs", () => {
  it("merges server logs with pending entries", async () => {
    savePending([pendingEntry]);
    const repo = repoWith([serverEntry]);
    const { result } = renderHook(() => useLogs(repo), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.entryId).sort()).toEqual(["p1", "s1"]);
    expect(result.current.error).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useLogs.test.tsx`
Expected: FAIL — current `useLogs` signature is `useLogs(repo, pendingVersion)`; calling `useLogs(repo)` plus the provider-based assertions fail until rewritten.

- [ ] **Step 3: Rewrite `useLogs` with `useQuery`**

Replace the entire contents of `src/hooks/useLogs.ts`:
```ts
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WorkbookRepo } from "../data/repo";
import { loadPending } from "../queue/pendingStore";
import { mergeEntries } from "../domain/merge";

export function useLogs(repo: WorkbookRepo) {
  const q = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      await repo.ensureWorkbook();
      return mergeEntries(await repo.getLogs(), loadPending());
    },
  });

  const { refetch } = q;
  const reload = useCallback(async () => { await refetch(); }, [refetch]);

  return {
    entries: q.data ?? [],
    reload,
    error: q.error ? String(q.error) : null,
    loading: q.isPending,
  };
}
```

- [ ] **Step 4: Run the `useLogs` test to verify it passes**

Run: `npx vitest run src/hooks/useLogs.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Write the failing test for `usePendingQueue`**

Create `src/hooks/usePendingQueue.test.tsx`. It mocks `syncWorker` so the optimistic cache state is deterministic (no real Graph round-trip clears it):
```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePendingQueue } from "./usePendingQueue";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";

vi.mock("../queue/syncWorker", () => ({
  syncPending: vi.fn(async () => ({ synced: [], remaining: 1 })),
}));

const entry: LogEntry = {
  entryId: "p1", activityDate: "2026-06-05", institution: "NUH", branch: "B1",
  activityType: "Stock Take", product: "P1", sku: "S1", quantity: 5,
  loggedAt: "2026-06-05T00:00:00.000Z",
};

function fakeRepo(): WorkbookRepo {
  return {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [],
    getBranches: async () => [],
    getProducts: async () => [],
    getLogs: async () => [],
    appendLog: async () => {},
    hasLog: async () => false,
    addInstitution: async () => {},
    addBranch: async () => {},
    addProduct: async () => {},
  };
}

beforeEach(() => localStorage.clear());

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false } },
  });
  client.setQueryData<LogEntry[]>(["logs"], []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => usePendingQueue(fakeRepo()), { wrapper });
  return { client, result };
}

describe("usePendingQueue", () => {
  it("optimistically inserts the entry into the logs cache and tracks its id", () => {
    const { client, result } = setup();

    act(() => result.current.enqueue(entry));

    const logs = client.getQueryData<LogEntry[]>(["logs"]) ?? [];
    expect(logs.some((e) => e.entryId === "p1")).toBe(true);
    expect(result.current.pendingIds.has("p1")).toBe(true);
    expect(result.current.pendingCount).toBe(1);
  });

  it("invalidates the logs query after a sync", async () => {
    const { client, result } = setup();
    const spy = vi.spyOn(client, "invalidateQueries");

    await act(async () => { await result.current.sync(); });

    expect(spy).toHaveBeenCalledWith({ queryKey: ["logs"] });
  });
});
```

- [ ] **Step 6: Run the `usePendingQueue` test to verify it fails**

Run: `npx vitest run src/hooks/usePendingQueue.test.tsx`
Expected: FAIL — current `usePendingQueue` does not call `useQueryClient`, does not expose `pendingIds`, and does not `setQueryData`/`invalidateQueries`.

- [ ] **Step 7: Rewrite `usePendingQueue`**

Replace the entire contents of `src/hooks/usePendingQueue.ts`:
```ts
import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";
import { addPending, loadPending } from "../queue/pendingStore";
import { syncPending } from "../queue/syncWorker";
import { mergeEntries } from "../domain/merge";
import type { SyncState } from "../components/SyncStatusChip";

const idsOf = (entries: { entryId: string }[]) => new Set(entries.map((e) => e.entryId));

export function usePendingQueue(repo: WorkbookRepo) {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(loadPending().length);
  const [state, setState] = useState<SyncState>(loadPending().length ? "pending" : "synced");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => idsOf(loadPending()));

  const refresh = useCallback(() => {
    const pending = loadPending();
    setPendingCount(pending.length);
    setPendingIds(idsOf(pending));
    setState((prev) => (pending.length === 0 ? "synced" : prev === "error" ? "error" : "pending"));
  }, []);

  const sync = useCallback(async () => {
    const result = await syncPending(repo);
    setState(result.error ? "error" : result.remaining > 0 ? "pending" : "synced");
    setPendingCount(result.remaining);
    setPendingIds(idsOf(loadPending()));
    await queryClient.invalidateQueries({ queryKey: ["logs"] });
  }, [repo, queryClient]);

  const enqueue = useCallback((entry: LogEntry) => {
    addPending(entry);
    // Optimistic insert so the new row shows immediately, before the server round-trip.
    queryClient.setQueryData<LogEntry[]>(["logs"], (old) => mergeEntries(old ?? [], [entry]));
    refresh();
    void sync(); // try immediately; harmless if offline
  }, [queryClient, refresh, sync]);

  // Auto-sync on reconnect and when the tab regains focus.
  useEffect(() => {
    const onOnline = () => void sync();
    const onFocus = () => { if (loadPending().length) void sync(); };
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, [sync]);

  return { pendingCount, state, pendingIds, enqueue, sync };
}
```

- [ ] **Step 8: Run the `usePendingQueue` test to verify it passes**

Run: `npx vitest run src/hooks/usePendingQueue.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Update the two `App.tsx` call sites**

In `src/App.tsx`:

Change the `useLogs` call (it no longer takes `queue.version`):
```tsx
  const {
    entries, reload: reloadLogs, error: logsError, loading: logsLoading,
  } = useLogs(repo);
```

Delete the `pendingIds` memo and its dependency on `queue.version` (the current block):
```tsx
  const pendingIds = useMemo(
    () => new Set(loadPending().map((e) => e.entryId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue.version],
  );
```
Remove that block entirely.

Remove the now-unused import of `loadPending`:
```tsx
import { loadPending } from "./queue/pendingStore";
```
Delete that line.

Update the `RecentEntries` usage to read `pendingIds` from the queue:
```tsx
          <RecentEntries entries={scopedEntries} pendingIds={queue.pendingIds} loading={logsLoading} />
```

- [ ] **Step 10: Typecheck + full test suite + lint**

Run: `npm run build && npm test && npm run lint`
Expected: all PASS. Confirm there are no remaining references to `queue.version` or `loadPending` in `App.tsx`:
```bash
grep -n "queue.version\|loadPending" src/App.tsx
```
Expected: no matches.

- [ ] **Step 11: Commit**

```bash
git add src/hooks/useLogs.ts src/hooks/useLogs.test.tsx src/hooks/usePendingQueue.ts src/hooks/usePendingQueue.test.tsx src/App.tsx
git commit -m "refactor: back useLogs with React Query; queue does optimistic insert + invalidate"
```

---

## Task 4: `App.tsx` cleanup — drop manual focus-refetch, route refresh through React Query

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the React Query imports to `App.tsx`**

Add near the other imports in `src/App.tsx`:
```ts
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
```

- [ ] **Step 2: Add the query client and replace `refresh` + `refreshing`**

Inside the component, add after `const repo = useMemo(...)`:
```tsx
  const queryClient = useQueryClient();
```

Replace the existing `refresh` callback:
```tsx
  const refresh = useCallback(() => {
    void reloadCatalog();
    void reloadLogs();
  }, [reloadCatalog, reloadLogs]);
```
with:
```tsx
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    void queryClient.invalidateQueries({ queryKey: ["logs"] });
  }, [queryClient]);
```

- [ ] **Step 3: Remove the manual focus-refetch effect**

Delete this block from `src/App.tsx` (React Query's `refetchOnWindowFocus` now handles read refetching; the queue keeps its own focus listener for syncing writes):
```tsx
  useEffect(() => {
    const onFocus = () => {
      if (msal.getActiveAccount()) refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, msal]);
```

- [ ] **Step 4: Replace the `refreshing` derivation**

Replace:
```tsx
  const refreshing = catalogLoading || logsLoading;
```
with:
```tsx
  const refreshing = useIsFetching() > 0;
```

- [ ] **Step 5: Route catalog mutations through invalidation**

In `handleAddBranch`, replace `await reloadCatalog();` with:
```tsx
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
```

In `handleAddProduct`, replace `await reloadCatalog();` with:
```tsx
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
```

In the `ViewToggle` `onChange`, replace `if (v === "dashboard") void reloadLogs();` with:
```tsx
        onChange={(v) => { setView(v); if (v === "dashboard") void queryClient.invalidateQueries({ queryKey: ["logs"] }); }}
```

- [ ] **Step 6: Stop destructuring the now-unused `reload` functions**

Now that nothing in `App.tsx` calls `reloadCatalog` or `reloadLogs`, drop them from the destructures to keep lint clean.

Change the catalog destructure to:
```tsx
  const {
    institutions, branches, products,
    error: catalogError, loading: catalogLoading,
  } = useCatalog(repo);
```

Change the logs destructure to:
```tsx
  const {
    entries, error: logsError, loading: logsLoading,
  } = useLogs(repo);
```

- [ ] **Step 7: Typecheck + full test suite + lint**

Run: `npm run build && npm test && npm run lint`
Expected: all PASS. Verify the manual focus effect and reload references are gone:
```bash
grep -n "reloadCatalog\|reloadLogs\|addEventListener(\"focus\"" src/App.tsx
```
Expected: no matches.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: route App refresh through React Query; drop manual focus-refetch"
```

---

## Task 5: Manual verification of cross-session persistence

No code changes — confirm the headline goal end-to-end. This requires a signed-in session against the real Graph backend.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open the app and sign in. Wait for the catalog + logs to load fully.

- [ ] **Step 2: Confirm the cache was persisted**

In DevTools → Application → Local Storage, confirm a key named `REACT_QUERY_OFFLINE_CACHE` exists and contains the `catalog` and `logs` query data.

- [ ] **Step 3: Confirm instant cold-start render**

Reload the page (or close and reopen the tab). Expected: the catalog dropdown and recent entries render **immediately** from cache (no form skeleton), and a background refetch runs (the refresh icon spins briefly via `useIsFetching`).

- [ ] **Step 4: Confirm optimistic save still works**

Log a new entry. Expected: it appears in "Recent entries" instantly with the pending marker, the sync chip shows it as pending then synced, and it remains after a manual refresh.

- [ ] **Step 5: Confirm offline durability is unchanged**

Toggle DevTools to offline, log an entry (it queues + shows pending), then go back online or refocus the tab. Expected: the queued entry syncs automatically and the chip returns to "All synced".

- [ ] **Step 6 (optional): Note the IndexedDB upgrade path**

If `REACT_QUERY_OFFLINE_CACHE` ever approaches the localStorage limit (large log volumes), follow the spec's documented upgrade path: swap `createSyncStoragePersister` for `createAsyncStoragePersister` + `idb-keyval`. Out of scope for this plan.

---

## Self-Review

**Spec coverage:**
- Goal "persist catalog + logs across sessions" → Task 1 (provider + persister) + Task 5 (verification). ✅
- Goal "simplify reads / remove boilerplate" → Task 2 (`useCatalog`) + Task 3 (`useLogs`). ✅
- Provider config (`gcTime ≥ maxAge`, `staleTime`, `refetchOnWindowFocus`, `retry`, `buster`) → Task 1 Steps 4 & 6. ✅
- Reads keep external shape → Task 2 Step 4, Task 3 Step 3. ✅
- Writes unchanged + optimistic `setQueryData` + post-sync `invalidateQueries` + `pendingIds` exposed → Task 3 Steps 7 & 9. ✅
- `App.tsx` cleanup (remove focus effect, refresh→invalidate, `useIsFetching`, catalog mutation invalidate) → Task 4. ✅
- Testing (test wrapper, hook tests, untouched queue/domain tests) → Tasks 2 & 3 test files; `npm test` run each task. ✅
- Untouched files (`pendingStore`, `syncWorker`, `merge`, `graphRepo`, etc.) → never edited; not in any task's modify list. ✅
- Risks (localStorage footprint, GC vs persistence, IndexedDB upgrade path) → Task 1 config + Task 5 Steps 2 & 6. ✅

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to" — every code and command step has concrete content. ✅

**Type consistency:**
- `mergeEntries(server: LogEntry[], pending: LogEntry[]): LogEntry[]` used identically in `useLogs` and `usePendingQueue` (matches `src/domain/merge.ts`). ✅
- `PendingEntry = LogEntry`, so `setQueryData<LogEntry[]>` + `mergeEntries(old, [entry])` typecheck. ✅
- `usePendingQueue` returns `{ pendingCount, state, pendingIds, enqueue, sync }`; `App` consumes `queue.pendingIds`, `queue.state`, `queue.pendingCount`, `queue.enqueue`, `queue.sync` — `version` removed from both. ✅
- `useCatalog`/`useLogs` return shapes match `App`'s destructures after Task 4 trims unused `reload`. ✅
- `CACHE_MAX_AGE` / `CACHE_SCHEMA_VERSION` / `makeQueryClient` / `persister` exported by `src/queryClient.ts` and imported by `main.tsx` + `queryClient.test.ts` with consistent names. ✅
