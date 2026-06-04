import { useMemo, useState } from "react";
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
import type { LogEntry, TimeWindow } from "./data/types";

export default function App({ msal }: { msal: PublicClientApplication }) {
  const account = msal.getActiveAccount();
  const today = todayISODate();
  const repo = useMemo(() => new GraphWorkbookRepo(() => getAccessToken(msal)), [msal]);

  const { institutions, branches, products, reload: reloadCatalog, error: catalogError } = useCatalog(repo);
  const queue = usePendingQueue(repo);
  const { entries, reload: reloadLogs, error: logsError } = useLogs(repo, queue.version);

  const [institution, setInstitution] = useState("NUH Health & U");
  const [view, setView] = useState<View>("log");

  if (!account) {
    return <SignInScreen onSignIn={() => void msal.loginRedirect(loginRequest)} />;
  }

  const scopedEntries: LogEntry[] = entries.filter((e) => e.institution === institution);

  function handleSave(entry: NewEntry) {
    queue.enqueue({
      ...entry,
      entryId: crypto.randomUUID(),
      loggedAt: new Date().toISOString(),
    });
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

  function handleExport(window: TimeWindow) {
    const rows = filterByWindow(scopedEntries, window, today);
    const tag = window === "day" ? today : window === "month" ? today.slice(0, 7) : "ToDate";
    exportToExcel(rows, `TrueHugz-${institution.replace(/\W+/g, "")}-${tag}.xlsx`);
  }

  return (
    <div className="app">
      <div className="topbar">
        <InstitutionSelector institutions={institutions} value={institution} onChange={setInstitution} />
        <SyncStatusChip state={queue.state} pendingCount={queue.pendingCount} onSync={() => void queue.sync()} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <ViewToggle value={view} onChange={(v) => { setView(v); if (v === "dashboard") void reloadLogs(); }} />
      </div>

      {catalogError && <p className="errors">Could not load data: {catalogError}</p>}
      {logsError && <p className="errors">Could not load logs: {logsError}</p>}

      {view === "log" ? (
        <LogEntryView
          institution={institution}
          branches={branches}
          products={products}
          today={today}
          onSave={handleSave}
          onAddBranch={(n) => void handleAddBranch(n)}
          onAddProduct={(n) => void handleAddProduct(n)}
        />
      ) : (
        <DashboardView entries={scopedEntries} today={today} onExport={handleExport} />
      )}
    </div>
  );
}
