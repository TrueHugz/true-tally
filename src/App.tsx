import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "./auth/msalConfig";
import { getAccessToken } from "./auth/authProvider";
import { GraphWorkbookRepo } from "./data/graphRepo";
import { branchExists, productExists } from "./data/catalog";
import { todayISODate } from "./domain/dates";
import { filterByWindow } from "./domain/filter";
import { exportToExcel } from "./export/excel";
import { useCatalog } from "./hooks/useCatalog";
import { useLogs } from "./hooks/useLogs";
import { usePendingQueue } from "./hooks/usePendingQueue";
import { SignInScreen } from "./components/SignInScreen";
import { InstitutionSelector } from "./components/InstitutionSelector";
import { ViewToggle, type View } from "./components/ViewToggle";
import { SyncStatusChip } from "./components/SyncStatusChip";
import { LogEntryView, type NewEntry } from "./components/LogEntryView";
import { DashboardView } from "./components/DashboardView";
import { RecentEntries } from "./components/RecentEntries";
import { StateBanner } from "./components/StateBanner";
import { Skeleton } from "./components/Skeleton";
import { Toast } from "./components/Toast";
import { BrandMark } from "./components/BrandMark";
import type { LogEntry, TimeWindow } from "./data/types";

/** Map a raw thrown-error string to a calm, human-friendly headline + message. */
function friendlyError(raw: string): { title: string; message: string } {
  const r = raw.toLowerCase();
  if (r.includes("itemnotfound") || r.includes("404")) {
    return {
      title: "Setting up your workbook…",
      message: "Couldn't read a table yet — it may still be provisioning. Retry in a moment.",
    };
  }
  if (r.includes("no signed-in account") || r.includes("interactionrequired")) {
    return { title: "Session expired", message: "Please sign in again." };
  }
  if (r.includes("failed to fetch") || r.includes("networkerror") || r.includes("network")) {
    return { title: "Can't reach OneDrive", message: "Check your connection and retry." };
  }
  return { title: "Couldn't load data", message: "Something went wrong while loading. Please retry." };
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={spinning ? "motion-safe:animate-spin" : ""}
    >
      <path d="M3.5 12a8.5 8.5 0 0 1 14.5-6M20.5 12a8.5 8.5 0 0 1-14.5 6" />
      <path d="M18 2.5V6h-3.5M6 21.5V18h3.5" />
    </svg>
  );
}

export default function App({ msal }: { msal: PublicClientApplication }) {
  const account = msal.getActiveAccount();
  const today = todayISODate();
  const repo = useMemo(() => new GraphWorkbookRepo(() => getAccessToken(msal)), [msal]);

  const {
    institutions, branches, products,
    reload: reloadCatalog, error: catalogError, loading: catalogLoading,
  } = useCatalog(repo);
  const queue = usePendingQueue(repo);
  const {
    entries, reload: reloadLogs, error: logsError, loading: logsLoading,
  } = useLogs(repo);

  const [institution, setInstitution] = useState("NUH Health & U");
  const [view, setView] = useState<View>("log");
  const [toast, setToast] = useState<{ product: string } | null>(null);

  const refresh = useCallback(() => {
    void reloadCatalog();
    void reloadLogs();
  }, [reloadCatalog, reloadLogs]);

  useEffect(() => {
    const onFocus = () => {
      if (msal.getActiveAccount()) refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, msal]);

  // Auto-dismiss the save toast.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  if (!account) {
    return <SignInScreen onSignIn={() => void msal.loginRedirect(loginRequest)} />;
  }

  const scopedEntries: LogEntry[] = entries.filter((e) => e.institution === institution);
  const catalogReady = institutions.length > 0 || branches.length > 0 || products.length > 0;
  const showFormSkeleton = catalogLoading && !catalogReady;
  const refreshing = catalogLoading || logsLoading;

  function handleSave(entry: NewEntry) {
    queue.enqueue({
      ...entry,
      entryId: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
    });
    setToast({ product: entry.product });
  }

  async function handleAddBranch(name: string) {
    if (branchExists(branches, institution, name)) {
      alert(`Branch "${name}" already exists.`);
      return;
    }
    await repo.addBranch({ institution, branch: name, remarks: "" });
    await reloadCatalog();
  }

  async function handleAddProduct(name: string) {
    const sku = window.prompt(`Enter the SKU for "${name}"`)?.trim();
    if (!sku) return;
    if (productExists(products, sku)) {
      alert(`A product with SKU "${sku}" already exists.`);
      return;
    }
    await repo.addProduct({ description: name, sku, type: "Bag" });
    await reloadCatalog();
  }

  async function handleExport(window: TimeWindow) {
    const rows = filterByWindow(scopedEntries, window, today);
    const tag = window === "day" ? today : window === "month" ? today.slice(0, 7) : "ToDate";
    try { await exportToExcel(rows, `TrueHugz-${institution.replace(/\W+/g, "")}-${tag}.xlsx`); }
    catch (e) { alert(`Export failed: ${String(e)}`); }
  }

  return (
    <div className="relative z-1 mx-auto max-w-230 px-[clamp(14px,4vw,28px)] pt-[clamp(16px,4vw,32px)] pb-24">
      <header className="mb-[clamp(18px,3vw,28px)] flex flex-wrap items-center justify-between gap-4 motion-safe:animate-[rise_.5s_ease_both]">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="brand-tile grid size-12 flex-none place-items-center rounded-tile shadow-tile"><BrandMark size={28} /></span>
          <span className="flex min-w-0 flex-col leading-[1.05]">
            <span className="font-display text-wordmark font-bold tracking-display text-ink">TrueHugz</span>
            <span className="mt-0.75 font-mono text-tag uppercase tracking-caps text-ink-3">Inventory Log</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5 max-narrow:w-full">
          <div className="w-64 max-narrow:w-full">
            <InstitutionSelector institutions={institutions} value={institution} onChange={setInstitution} />
          </div>
          <SyncStatusChip state={queue.state} pendingCount={queue.pendingCount} onSync={() => void queue.sync()} />
          <button
            type="button"
            className="grid size-12.5 flex-none place-items-center rounded-pill border border-line-2 bg-surface text-ink-2 transition duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-[.98] focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none"
            aria-label="Refresh"
            onClick={refresh}
          >
            <RefreshIcon spinning={refreshing} />
          </button>
          <button
            type="button"
            className="min-h-12.5 flex-none cursor-pointer rounded-field border border-line-2 bg-surface px-5 py-3 text-base font-semibold text-ink-2 transition duration-150 ease-out hover:bg-surface-2 hover:text-ink active:scale-[.98] focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-soft focus-visible:outline-none"
            onClick={() => void msal.logoutRedirect()}
          >Sign out</button>
        </div>
      </header>

      <ViewToggle value={view} onChange={(v) => { setView(v); if (v === "dashboard") void reloadLogs(); }} />

      {catalogError && (
        <StateBanner {...friendlyError(catalogError)} detail={catalogError} onRetry={refresh} />
      )}
      {logsError && !catalogError && (
        <StateBanner {...friendlyError(logsError)} detail={logsError} onRetry={refresh} />
      )}

      {view === "log" ? (
        <>
          {showFormSkeleton ? (
            <div className="rounded-card border border-line bg-surface p-[clamp(20px,3.5vw,30px)] shadow-card motion-safe:animate-[rise_.5s_ease_.12s_both]" aria-busy="true">
              <Skeleton style={{ width: "30%", height: 20, marginBottom: 18 }} />
              <Skeleton className="mt-2 h-12.5" />
              <Skeleton className="mt-2 h-12.5" style={{ marginTop: 22 }} />
              <Skeleton className="mt-2 h-12.5" />
              <Skeleton className="mt-2 h-12.5" style={{ marginTop: 22 }} />
              <Skeleton style={{ height: 104, marginTop: 22 }} />
              <Skeleton style={{ height: 58, marginTop: 24 }} />
            </div>
          ) : (
            <LogEntryView
              institution={institution}
              branches={branches}
              products={products}
              today={today}
              onSave={handleSave}
              onAddBranch={(n) => void handleAddBranch(n)}
              onAddProduct={(n) => void handleAddProduct(n)}
            />
          )}
          <RecentEntries entries={scopedEntries} pendingIds={queue.pendingIds} loading={logsLoading} />
        </>
      ) : (
        <DashboardView entries={scopedEntries} today={today} onExport={handleExport} loading={logsLoading} />
      )}

      {toast && <Toast message="Saved" product={toast.product} />}
    </div>
  );
}
