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
import { loadPending } from "./queue/pendingStore";
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

const REFRESH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 12a8.5 8.5 0 0 1 14.5-6M20.5 12a8.5 8.5 0 0 1-14.5 6" />
    <path d="M18 2.5V6h-3.5M6 21.5V18h3.5" />
  </svg>
);

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
  } = useLogs(repo, queue.version);

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

  const pendingIds = useMemo(
    () => new Set(loadPending().map((e) => e.entryId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue.version],
  );

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
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark"><BrandMark size={28} /></span>
          <span className="brand__text">
            <span className="brand__word">TrueHugz</span>
            <span className="brand__sub">Inventory Log</span>
          </span>
        </div>
        <div className="actions">
          <InstitutionSelector institutions={institutions} value={institution} onChange={setInstitution} />
          <SyncStatusChip state={queue.state} pendingCount={queue.pendingCount} onSync={() => void queue.sync()} />
          <button
            type="button"
            className={`icon-btn${refreshing ? " spinning" : ""}`}
            aria-label="Refresh"
            onClick={refresh}
          >
            {REFRESH_ICON}
          </button>
          <button type="button" className="secondary" onClick={() => void msal.logoutRedirect()}>Sign out</button>
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
            <div className="card stagger-card" aria-busy="true">
              <Skeleton style={{ width: "30%", height: 20, marginBottom: 18 }} />
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-field" style={{ marginTop: 22 }} />
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-field" style={{ marginTop: 22 }} />
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
          <RecentEntries entries={scopedEntries} pendingIds={pendingIds} loading={logsLoading} />
        </>
      ) : (
        <DashboardView entries={scopedEntries} today={today} onExport={handleExport} loading={logsLoading} />
      )}

      {toast && <Toast message="Saved" product={toast.product} />}
    </div>
  );
}
