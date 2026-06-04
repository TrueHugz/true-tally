# TrueHugz Inventory Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tablet web app that logs Stock Take / Stock Top Up activities to an Excel workbook in the operator's OneDrive, shows per-product totals, and exports an `.xlsx` report — working offline-first.

**Architecture:** Client-only React + Vite SPA, no backend. MSAL signs the single operator into their own Microsoft account; a thin repo talks to Microsoft Graph's workbook API to read/append rows in one Excel file. Saves go to a `localStorage` queue first, then a sync worker drains them to Graph. All non-trivial logic (date windows, aggregation, export shaping, queue merge, row mapping, validation) lives in pure, unit-tested functions; Graph and the DOM are kept at the edges.

**Tech Stack:** React 18, Vite, TypeScript, Vitest + Testing Library (jsdom), `@azure/msal-browser`, `xlsx` (SheetJS), Microsoft Graph REST (via `fetch`), plain CSS.

---

## File Structure

```
true-tally/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.node.json
├── .env.example                      # VITE_MSAL_CLIENT_ID
├── src/
│   ├── main.tsx                      # MSAL bootstrap + handleRedirectPromise + render
│   ├── App.tsx                       # auth gate, institution selector, view toggle, sync
│   ├── index.css                     # all styling (tablet touch targets)
│   ├── vite-env.d.ts                 # env typing
│   ├── auth/
│   │   ├── msalConfig.ts             # PublicClientApplication config + loginRequest
│   │   └── authProvider.ts           # getAccessToken(msal) with redirect fallback
│   ├── data/
│   │   ├── types.ts                  # domain types
│   │   ├── seed.ts                   # NUH institution, 3 branches, 16 products
│   │   ├── rowMap.ts                 # column constants + pure row<->object mappers
│   │   ├── catalog.ts                # pure duplicate-detection helpers
│   │   ├── seedWorkbook.ts           # SheetJS: build seed workbook bytes
│   │   ├── repo.ts                   # WorkbookRepo interface
│   │   └── graphRepo.ts              # GraphWorkbookRepo implementation
│   ├── domain/
│   │   ├── dates.ts                  # todayISODate / month prefix
│   │   ├── filter.ts                 # filterByWindow (Day/Month/To-Date)
│   │   ├── aggregate.ts              # totalsByProduct
│   │   ├── merge.ts                  # mergeEntries (server + pending, dedup)
│   │   ├── exportRows.ts             # toExportRows + EXPORT_HEADERS
│   │   └── validate.ts              # validateEntry
│   ├── queue/
│   │   ├── pendingStore.ts           # localStorage queue persistence
│   │   └── syncWorker.ts             # syncPending(repo)
│   ├── export/
│   │   └── excel.ts                  # buildWorkbook + exportToExcel (SheetJS)
│   ├── hooks/
│   │   ├── useCatalog.ts             # load institutions/branches/products
│   │   ├── useLogs.ts                # load logs merged with pending
│   │   └── usePendingQueue.ts        # save + sync status
│   └── components/
│       ├── SignInScreen.tsx
│       ├── InstitutionSelector.tsx
│       ├── ViewToggle.tsx
│       ├── SyncStatusChip.tsx
│       ├── Segmented.tsx             # reused by activity toggle + time filter
│       ├── QuantityStepper.tsx
│       ├── SearchableSelect.tsx      # product + branch dropdowns with "+ add"
│       ├── LogEntryView.tsx
│       ├── TotalsTable.tsx
│       └── DashboardView.tsx
└── tests live next to source as *.test.ts(x)
```

---

## Phase A — Scaffold

### Task 1: Initialize project, tooling, and a passing smoke test

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`, `.env.example`
- Test: `src/smoke.test.ts`

- [ ] **Step 1: Scaffold Vite React-TS in the existing repo**

Run (the repo already exists and is non-empty only with `docs/`):
```bash
cd /Users/honeycomb/dev/true-tally
npm create vite@latest . -- --template react-ts
```
If prompted about a non-empty directory, choose **"Ignore files and continue"**.

- [ ] **Step 2: Install dependencies**

```bash
npm install @azure/msal-browser xlsx
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

```ts
/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

- [ ] **Step 4: Create `src/test-setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Add scripts to `package.json`**

Ensure the `"scripts"` block contains:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Type the env var in `src/vite-env.d.ts`**

Append:
```ts
interface ImportMetaEnv {
  readonly VITE_MSAL_CLIENT_ID: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 7: Create `.env.example`**

```
VITE_MSAL_CLIENT_ID=your-azure-app-client-id
```

- [ ] **Step 8: Write the smoke test `src/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 9: Run the test, expect PASS**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS app with Vitest"
```

---

## Phase B — Domain types & pure logic (TDD)

### Task 2: Domain types and seed data

**Files:**
- Create: `src/data/types.ts`, `src/data/seed.ts`
- Test: `src/data/seed.test.ts`

- [ ] **Step 1: Write `src/data/types.ts`**

```ts
export type ActivityType = "Stock Take" | "Stock Top Up";
export type TimeWindow = "day" | "month" | "toDate";

export interface Institution {
  institution: string;
  remarks: string;
}
export interface Branch {
  institution: string;
  branch: string;
  remarks: string;
}
export interface Product {
  description: string;
  sku: string;
  type: string;
}
export interface LogEntry {
  entryId: string;
  activityDate: string; // YYYY-MM-DD
  institution: string;
  branch: string;
  activityType: ActivityType;
  product: string; // description
  sku: string;
  quantity: number;
  loggedAt: string; // ISO timestamp
}
export type PendingEntry = LogEntry;

export interface ProductTotal {
  product: string;
  sku: string;
  total: number;
}
```

- [ ] **Step 2: Write the failing test `src/data/seed.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { SEED } from "./seed";

describe("seed", () => {
  it("has the NUH institution", () => {
    expect(SEED.institutions).toHaveLength(1);
    expect(SEED.institutions[0].institution).toBe("NUH Health & U");
  });
  it("has the 3 NUH branches", () => {
    expect(SEED.branches).toHaveLength(3);
    expect(SEED.branches.every((b) => b.institution === "NUH Health & U")).toBe(true);
  });
  it("has the 16 product SKUs", () => {
    expect(SEED.products).toHaveLength(16);
    expect(SEED.products[0]).toEqual({
      description: "CoolDiscreet (M)",
      sku: "CD-M-20",
      type: "Bag",
    });
  });
});
```

- [ ] **Step 3: Run it, expect FAIL** (`Cannot find module './seed'`)

Run: `npx vitest run src/data/seed.test.ts`

- [ ] **Step 4: Write `src/data/seed.ts`**

```ts
import type { Institution, Branch, Product } from "./types";

const NUH = "NUH Health & U";

const institutions: Institution[] = [{ institution: NUH, remarks: "" }];

const branches: Branch[] = [
  { institution: NUH, branch: "NUH Medical Centre (Zone B)", remarks: "#03-01 (within the Medical Centre Pharmacy)" },
  { institution: NUH, branch: "Main Building (Zone F)", remarks: "#01-01 (beside the Main Building Pharmacy)" },
  { institution: NUH, branch: "Main Building (Zone G)", remarks: "#01-11 (opposite the Kopitiam food court)" },
];

const products: Product[] = [
  { description: "CoolDiscreet (M)", sku: "CD-M-20", type: "Bag" },
  { description: "CoolDiscreet (M) (Free)", sku: "CD-M-20 (Free)", type: "Bag" },
  { description: "CoolDiscreet (L)", sku: "CD-L-20", type: "Bag" },
  { description: "CoolDiscreet (L) (Free)", sku: "CD-L-20 (Free)", type: "Bag" },
  { description: "CoolDiscreet+ (M)", sku: "CDP-M-15", type: "Bag" },
  { description: "CoolDiscreet+ (M) (Free)", sku: "CDP-M-15 (Free)", type: "Bag" },
  { description: "CoolDiscreet+ (L)", sku: "CDP-L-15", type: "Bag" },
  { description: "CoolDiscreet+ (L) (Free)", sku: "CDP-L-15 (Free)", type: "Bag" },
  { description: "CoolComfort (M)", sku: "CC-M-15", type: "Bag" },
  { description: "CoolComfort (M) (Free)", sku: "CC-M-15 (Free)", type: "Bag" },
  { description: "CoolComfort (L)", sku: "CC-L-15", type: "Bag" },
  { description: "CoolComfort (L) (Free)", sku: "CC-L-15 (Free)", type: "Bag" },
  { description: "CoolGuard (M)", sku: "CG-M-15", type: "Bag" },
  { description: "CoolGuard (M) (Free)", sku: "CG-M-15 (Free)", type: "Bag" },
  { description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" },
  { description: "CoolGuard (L) (Free)", sku: "CG-L-15 (Free)", type: "Bag" },
];

export const SEED = { institutions, branches, products };
```

- [ ] **Step 5: Run it, expect PASS**

Run: `npx vitest run src/data/seed.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/data/seed.ts src/data/seed.test.ts
git commit -m "feat: domain types and seed catalog"
```

---

### Task 3: Date helpers

**Files:**
- Create: `src/domain/dates.ts`
- Test: `src/domain/dates.test.ts`

- [ ] **Step 1: Write the failing test `src/domain/dates.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { todayISODate, monthPrefix } from "./dates";

describe("dates", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(todayISODate(new Date(2026, 5, 5))).toBe("2026-06-05");
  });
  it("zero-pads single-digit months and days", () => {
    expect(todayISODate(new Date(2026, 0, 9))).toBe("2026-01-09");
  });
  it("returns the YYYY-MM month prefix", () => {
    expect(monthPrefix("2026-06-05")).toBe("2026-06");
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

Run: `npx vitest run src/domain/dates.test.ts`

- [ ] **Step 3: Write `src/domain/dates.ts`**

```ts
export function todayISODate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthPrefix(isoDate: string): string {
  return isoDate.slice(0, 7);
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/domain/dates.ts src/domain/dates.test.ts
git commit -m "feat: local-date helpers"
```

---

### Task 4: Time-window filtering

**Files:**
- Create: `src/domain/filter.ts`
- Test: `src/domain/filter.test.ts`

- [ ] **Step 1: Write the failing test `src/domain/filter.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { filterByWindow } from "./filter";
import type { LogEntry } from "../data/types";

const mk = (id: string, date: string): LogEntry => ({
  entryId: id, activityDate: date, institution: "NUH Health & U",
  branch: "Zone B", activityType: "Stock Take", product: "P", sku: "S",
  quantity: 1, loggedAt: "2026-06-05T00:00:00.000Z",
});
const today = "2026-06-05";
const entries = [mk("a", "2026-06-05"), mk("b", "2026-06-20"), mk("c", "2026-05-31"), mk("d", "2025-06-05")];

describe("filterByWindow", () => {
  it("day keeps only today's entries", () => {
    expect(filterByWindow(entries, "day", today).map((e) => e.entryId)).toEqual(["a"]);
  });
  it("month keeps the current calendar month", () => {
    expect(filterByWindow(entries, "month", today).map((e) => e.entryId)).toEqual(["a", "b"]);
  });
  it("toDate keeps everything", () => {
    expect(filterByWindow(entries, "toDate", today)).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/domain/filter.ts`**

```ts
import type { LogEntry, TimeWindow } from "../data/types";
import { monthPrefix } from "./dates";

export function filterByWindow(entries: LogEntry[], window: TimeWindow, today: string): LogEntry[] {
  if (window === "toDate") return entries;
  if (window === "day") return entries.filter((e) => e.activityDate === today);
  const prefix = monthPrefix(today);
  return entries.filter((e) => monthPrefix(e.activityDate) === prefix);
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/domain/filter.ts src/domain/filter.test.ts
git commit -m "feat: Day/Month/To-Date filtering"
```

---

### Task 5: Per-product aggregation

**Files:**
- Create: `src/domain/aggregate.ts`
- Test: `src/domain/aggregate.test.ts`

- [ ] **Step 1: Write the failing test `src/domain/aggregate.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { totalsByProduct } from "./aggregate";
import type { LogEntry } from "../data/types";

const mk = (product: string, sku: string, qty: number, type: LogEntry["activityType"]): LogEntry => ({
  entryId: product + sku + qty + type, activityDate: "2026-06-05", institution: "NUH Health & U",
  branch: "Zone B", activityType: type, product, sku, quantity: qty, loggedAt: "x",
});

describe("totalsByProduct", () => {
  it("sums quantity per product across both activity types", () => {
    const rows = totalsByProduct([
      mk("CoolGuard (L)", "CG-L-15", 5, "Stock Take"),
      mk("CoolGuard (L)", "CG-L-15", 3, "Stock Top Up"),
      mk("CoolComfort (M)", "CC-M-15", 2, "Stock Take"),
    ]);
    expect(rows).toEqual([
      { product: "CoolComfort (M)", sku: "CC-M-15", total: 2 },
      { product: "CoolGuard (L)", sku: "CG-L-15", total: 8 },
    ]);
  });
  it("returns an empty array for no entries", () => {
    expect(totalsByProduct([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/domain/aggregate.ts`**

```ts
import type { LogEntry, ProductTotal } from "../data/types";

export function totalsByProduct(entries: LogEntry[]): ProductTotal[] {
  const map = new Map<string, ProductTotal>();
  for (const e of entries) {
    const key = e.sku || e.product;
    const cur = map.get(key) ?? { product: e.product, sku: e.sku, total: 0 };
    cur.total += e.quantity;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.product.localeCompare(b.product));
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/domain/aggregate.ts src/domain/aggregate.test.ts
git commit -m "feat: per-product totals"
```

---

### Task 6: Merge server + pending entries (dedup by Entry ID)

**Files:**
- Create: `src/domain/merge.ts`
- Test: `src/domain/merge.test.ts`

- [ ] **Step 1: Write the failing test `src/domain/merge.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { mergeEntries } from "./merge";
import type { LogEntry } from "../data/types";

const mk = (id: string): LogEntry => ({
  entryId: id, activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "P", sku: "S", quantity: 1, loggedAt: "x",
});

describe("mergeEntries", () => {
  it("appends pending entries not already on the server", () => {
    const merged = mergeEntries([mk("a")], [mk("b")]);
    expect(merged.map((e) => e.entryId)).toEqual(["a", "b"]);
  });
  it("drops pending entries whose Entry ID is already on the server", () => {
    const merged = mergeEntries([mk("a"), mk("b")], [mk("b"), mk("c")]);
    expect(merged.map((e) => e.entryId)).toEqual(["a", "b", "c"]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/domain/merge.ts`**

```ts
import type { LogEntry } from "../data/types";

export function mergeEntries(server: LogEntry[], pending: LogEntry[]): LogEntry[] {
  const seen = new Set(server.map((e) => e.entryId));
  return [...server, ...pending.filter((p) => !seen.has(p.entryId))];
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/domain/merge.ts src/domain/merge.test.ts
git commit -m "feat: merge server and pending entries"
```

---

### Task 7: Export row shaping

**Files:**
- Create: `src/domain/exportRows.ts`
- Test: `src/domain/exportRows.test.ts`

- [ ] **Step 1: Write the failing test `src/domain/exportRows.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { toExportRows, EXPORT_HEADERS } from "./exportRows";
import type { LogEntry } from "../data/types";

const entry: LogEntry = {
  entryId: "a", activityDate: "2026-06-05", institution: "NUH Health & U",
  branch: "Main Building (Zone F)", activityType: "Stock Top Up",
  product: "CoolGuard (L)", sku: "CG-L-15", quantity: 12, loggedAt: "2026-06-05T01:02:03.000Z",
};

describe("export rows", () => {
  it("exposes the five PRD headers in order", () => {
    expect(EXPORT_HEADERS).toEqual([
      "Timestamp / Date", "Branch Name", "Activity Type", "Product Name", "Quantity Recorded",
    ]);
  });
  it("maps a log entry to the 5-column shape using Activity Date", () => {
    expect(toExportRows([entry])).toEqual([
      {
        "Timestamp / Date": "2026-06-05",
        "Branch Name": "Main Building (Zone F)",
        "Activity Type": "Stock Top Up",
        "Product Name": "CoolGuard (L)",
        "Quantity Recorded": 12,
      },
    ]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/domain/exportRows.ts`**

```ts
import type { LogEntry } from "../data/types";

export const EXPORT_HEADERS = [
  "Timestamp / Date", "Branch Name", "Activity Type", "Product Name", "Quantity Recorded",
] as const;

export type ExportRow = Record<(typeof EXPORT_HEADERS)[number], string | number>;

export function toExportRows(entries: LogEntry[]): ExportRow[] {
  return entries.map((e) => ({
    "Timestamp / Date": e.activityDate,
    "Branch Name": e.branch,
    "Activity Type": e.activityType,
    "Product Name": e.product,
    "Quantity Recorded": e.quantity,
  }));
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/domain/exportRows.ts src/domain/exportRows.test.ts
git commit -m "feat: 5-column export row mapping"
```

---

### Task 8: Workbook column constants and row mappers

**Files:**
- Create: `src/data/rowMap.ts`
- Test: `src/data/rowMap.test.ts`

- [ ] **Step 1: Write the failing test `src/data/rowMap.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  LOG_COLUMNS, logToRow, rowToLog,
  branchToRow, rowToBranch, productToRow, rowToProduct,
  institutionToRow, rowToInstitution,
} from "./rowMap";
import type { LogEntry } from "./types";

const log: LogEntry = {
  entryId: "e1", activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 7,
  loggedAt: "2026-06-05T01:02:03.000Z",
};

describe("rowMap", () => {
  it("LOG_COLUMNS are in the canonical order", () => {
    expect(LOG_COLUMNS).toEqual([
      "Entry ID", "Activity Date", "Institution", "Branch",
      "Activity Type", "Product", "SKU", "Quantity", "Logged-At",
    ]);
  });
  it("round-trips a log entry through a row", () => {
    expect(rowToLog(logToRow(log))).toEqual(log);
  });
  it("coerces quantity from a string cell to a number", () => {
    const row = logToRow(log);
    row[7] = "7"; // Graph may return numbers as strings
    expect(rowToLog(row).quantity).toBe(7);
  });
  it("round-trips branches, products, institutions", () => {
    const b = { institution: "NUH Health & U", branch: "Zone B", remarks: "x" };
    expect(rowToBranch(branchToRow(b))).toEqual(b);
    const p = { description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" };
    expect(rowToProduct(productToRow(p))).toEqual(p);
    const i = { institution: "NUH Health & U", remarks: "" };
    expect(rowToInstitution(institutionToRow(i))).toEqual(i);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/data/rowMap.ts`**

```ts
import type { ActivityType, Branch, Institution, LogEntry, Product } from "./types";

type Cell = string | number;

export const INSTITUTION_COLUMNS = ["Institution", "Remarks"] as const;
export const BRANCH_COLUMNS = ["Institution", "Branch", "Remarks"] as const;
export const PRODUCT_COLUMNS = ["Description", "SKU", "Type"] as const;
export const LOG_COLUMNS = [
  "Entry ID", "Activity Date", "Institution", "Branch",
  "Activity Type", "Product", "SKU", "Quantity", "Logged-At",
] as const;

const s = (v: Cell | undefined): string => (v === undefined || v === null ? "" : String(v));

export function institutionToRow(i: Institution): Cell[] {
  return [i.institution, i.remarks];
}
export function rowToInstitution(r: Cell[]): Institution {
  return { institution: s(r[0]), remarks: s(r[1]) };
}

export function branchToRow(b: Branch): Cell[] {
  return [b.institution, b.branch, b.remarks];
}
export function rowToBranch(r: Cell[]): Branch {
  return { institution: s(r[0]), branch: s(r[1]), remarks: s(r[2]) };
}

export function productToRow(p: Product): Cell[] {
  return [p.description, p.sku, p.type];
}
export function rowToProduct(r: Cell[]): Product {
  return { description: s(r[0]), sku: s(r[1]), type: s(r[2]) };
}

export function logToRow(e: LogEntry): Cell[] {
  return [e.entryId, e.activityDate, e.institution, e.branch, e.activityType, e.product, e.sku, e.quantity, e.loggedAt];
}
export function rowToLog(r: Cell[]): LogEntry {
  return {
    entryId: s(r[0]),
    activityDate: s(r[1]),
    institution: s(r[2]),
    branch: s(r[3]),
    activityType: s(r[4]) as ActivityType,
    product: s(r[5]),
    sku: s(r[6]),
    quantity: Number(r[7]),
    loggedAt: s(r[8]),
  };
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/data/rowMap.ts src/data/rowMap.test.ts
git commit -m "feat: workbook column mappers"
```

---

### Task 9: Duplicate-detection and entry validation

**Files:**
- Create: `src/data/catalog.ts`, `src/domain/validate.ts`
- Test: `src/data/catalog.test.ts`, `src/domain/validate.test.ts`

- [ ] **Step 1: Write failing test `src/data/catalog.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { branchExists, productExists } from "./catalog";

const branches = [{ institution: "NUH Health & U", branch: "Zone B", remarks: "" }];
const products = [{ description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" }];

describe("catalog dedup", () => {
  it("detects an existing branch (case-insensitive, per institution)", () => {
    expect(branchExists(branches, "NUH Health & U", " zone b ")).toBe(true);
    expect(branchExists(branches, "Other Hospital", "Zone B")).toBe(false);
  });
  it("detects an existing product by SKU (case-insensitive)", () => {
    expect(productExists(products, "cg-l-15")).toBe(true);
    expect(productExists(products, "NEW-1")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/data/catalog.ts`**

```ts
import type { Branch, Product } from "./types";

const norm = (v: string) => v.trim().toLowerCase();

export function branchExists(branches: Branch[], institution: string, branch: string): boolean {
  return branches.some((b) => b.institution === institution && norm(b.branch) === norm(branch));
}

export function productExists(products: Product[], sku: string): boolean {
  return products.some((p) => norm(p.sku) === norm(sku));
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Write failing test `src/domain/validate.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { validateEntry, type EntryDraft } from "./validate";

const valid: EntryDraft = {
  institution: "NUH Health & U", branch: "Zone B", activityType: "Stock Take",
  activityDate: "2026-06-05", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 5,
};

describe("validateEntry", () => {
  it("passes a complete draft", () => {
    expect(validateEntry(valid)).toEqual([]);
  });
  it("flags missing branch, product, activity type", () => {
    expect(validateEntry({ ...valid, branch: "", product: "", activityType: null })).toEqual([
      "Select a branch", "Choose Stock Take or Stock Top Up", "Select a product",
    ]);
  });
  it("rejects non-positive or non-integer quantity", () => {
    expect(validateEntry({ ...valid, quantity: 0 })).toContain("Quantity must be a whole number greater than 0");
    expect(validateEntry({ ...valid, quantity: 2.5 })).toContain("Quantity must be a whole number greater than 0");
    expect(validateEntry({ ...valid, quantity: null })).toContain("Quantity must be a whole number greater than 0");
  });
  it("rejects a malformed date", () => {
    expect(validateEntry({ ...valid, activityDate: "06/05/2026" })).toContain("Pick a valid date");
  });
});
```

- [ ] **Step 6: Run it, expect FAIL**

- [ ] **Step 7: Write `src/domain/validate.ts`**

```ts
import type { ActivityType } from "../data/types";

export interface EntryDraft {
  institution: string;
  branch: string;
  activityType: ActivityType | null;
  activityDate: string;
  product: string;
  sku: string;
  quantity: number | null;
}

export function validateEntry(d: EntryDraft): string[] {
  const errs: string[] = [];
  if (!d.institution) errs.push("Select an institution");
  if (!d.branch) errs.push("Select a branch");
  if (!d.activityType) errs.push("Choose Stock Take or Stock Top Up");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.activityDate)) errs.push("Pick a valid date");
  if (!d.product) errs.push("Select a product");
  if (d.quantity == null || !Number.isInteger(d.quantity) || d.quantity <= 0) {
    errs.push("Quantity must be a whole number greater than 0");
  }
  return errs;
}
```

- [ ] **Step 8: Run it, expect PASS**

- [ ] **Step 9: Commit**

```bash
git add src/data/catalog.ts src/data/catalog.test.ts src/domain/validate.ts src/domain/validate.test.ts
git commit -m "feat: catalog dedup and entry validation"
```

---

## Phase C — Persistence & export

### Task 10: Pending-entry localStorage queue

**Files:**
- Create: `src/queue/pendingStore.ts`
- Test: `src/queue/pendingStore.test.ts`

- [ ] **Step 1: Write the failing test `src/queue/pendingStore.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadPending, savePending, addPending, removePending } from "./pendingStore";
import type { PendingEntry } from "../data/types";

const mk = (id: string): PendingEntry => ({
  entryId: id, activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "P", sku: "S", quantity: 1, loggedAt: "x",
});

describe("pendingStore", () => {
  beforeEach(() => localStorage.clear());

  it("returns an empty array when nothing is stored", () => {
    expect(loadPending()).toEqual([]);
  });
  it("adds and reloads entries", () => {
    addPending(mk("a"));
    addPending(mk("b"));
    expect(loadPending().map((e) => e.entryId)).toEqual(["a", "b"]);
  });
  it("removes by entryId", () => {
    savePending([mk("a"), mk("b")]);
    expect(removePending("a").map((e) => e.entryId)).toEqual(["b"]);
    expect(loadPending().map((e) => e.entryId)).toEqual(["b"]);
  });
  it("recovers from corrupt JSON", () => {
    localStorage.setItem("truehugz.pendingEntries", "{not json");
    expect(loadPending()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/queue/pendingStore.ts`**

```ts
import type { PendingEntry } from "../data/types";

const KEY = "truehugz.pendingEntries";

export function loadPending(): PendingEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePending(entries: PendingEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function addPending(entry: PendingEntry): PendingEntry[] {
  const next = [...loadPending(), entry];
  savePending(next);
  return next;
}

export function removePending(entryId: string): PendingEntry[] {
  const next = loadPending().filter((e) => e.entryId !== entryId);
  savePending(next);
  return next;
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/queue/pendingStore.ts src/queue/pendingStore.test.ts
git commit -m "feat: localStorage pending queue"
```

---

### Task 11: Excel export (SheetJS)

**Files:**
- Create: `src/export/excel.ts`
- Test: `src/export/excel.test.ts`

- [ ] **Step 1: Write the failing test `src/export/excel.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { utils } from "xlsx";
import { buildWorkbook } from "./excel";
import type { LogEntry } from "../data/types";

const entry: LogEntry = {
  entryId: "a", activityDate: "2026-06-05", institution: "NUH Health & U",
  branch: "Main Building (Zone F)", activityType: "Stock Top Up",
  product: "CoolGuard (L)", sku: "CG-L-15", quantity: 12, loggedAt: "x",
};

describe("buildWorkbook", () => {
  it("creates a Report sheet with the 5 PRD columns in order", () => {
    const wb = buildWorkbook([entry]);
    expect(wb.SheetNames).toEqual(["Report"]);
    const ws = wb.Sheets["Report"];
    const aoa = utils.sheet_to_json<string[]>(ws, { header: 1 });
    expect(aoa[0]).toEqual([
      "Timestamp / Date", "Branch Name", "Activity Type", "Product Name", "Quantity Recorded",
    ]);
    expect(aoa[1]).toEqual(["2026-06-05", "Main Building (Zone F)", "Stock Top Up", "CoolGuard (L)", 12]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/export/excel.ts`**

```ts
import { utils, writeFileXLSX, type WorkBook } from "xlsx";
import { toExportRows, EXPORT_HEADERS } from "../domain/exportRows";
import type { LogEntry } from "../data/types";

export function buildWorkbook(entries: LogEntry[]): WorkBook {
  const rows = toExportRows(entries);
  const ws = utils.json_to_sheet(rows, { header: [...EXPORT_HEADERS] });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Report");
  return wb;
}

export function exportToExcel(entries: LogEntry[], filename: string): void {
  writeFileXLSX(buildWorkbook(entries), filename);
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/export/excel.ts src/export/excel.test.ts
git commit -m "feat: SheetJS xlsx export"
```

---

## Phase D — Auth & Graph integration

### Task 12: MSAL config, auth provider, and app bootstrap

**Files:**
- Create: `src/auth/msalConfig.ts`, `src/auth/authProvider.ts`
- Modify: `src/main.tsx`

> No unit tests here (MSAL needs a real browser/redirect). Verified by `npm run build` and manual sign-in later.

- [ ] **Step 1: Write `src/auth/msalConfig.ts`**

```ts
import { type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // persist sign-in across tablet sleeps/reloads
    storeAuthStateInCookie: false,
  },
};

// Files.ReadWrite covers the user's own OneDrive files; User.Read for the profile chip.
export const loginRequest = { scopes: ["User.Read", "Files.ReadWrite"] };
```

- [ ] **Step 2: Write `src/auth/authProvider.ts`**

```ts
import {
  PublicClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { loginRequest } from "./msalConfig";

/** Returns a Graph access token, falling back to an interactive redirect when needed. */
export async function getAccessToken(msal: PublicClientApplication): Promise<string> {
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (!account) throw new Error("No signed-in account");
  try {
    const res = await msal.acquireTokenSilent({ ...loginRequest, account });
    return res.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msal.acquireTokenRedirect({ ...loginRequest, account });
    }
    throw e;
  }
}
```

- [ ] **Step 3: Replace `src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "./auth/msalConfig";
import App from "./App";
import "./index.css";

const msal = new PublicClientApplication(msalConfig);

async function bootstrap() {
  await msal.initialize();

  // Process a returning redirect, if any.
  const result = await msal.handleRedirectPromise();
  if (result?.account) {
    msal.setActiveAccount(result.account);
  } else if (!msal.getActiveAccount() && msal.getAllAccounts().length > 0) {
    msal.setActiveAccount(msal.getAllAccounts()[0]);
  }

  // Keep the active account in sync after future logins.
  msal.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload && "account" in event.payload) {
      msal.setActiveAccount((event.payload as { account: never }).account);
    }
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App msal={msal} />
    </StrictMode>,
  );
}

bootstrap();
```

- [ ] **Step 4: Add a placeholder `src/App.tsx` so the build compiles**

```tsx
import type { PublicClientApplication } from "@azure/msal-browser";

export default function App({ msal }: { msal: PublicClientApplication }) {
  void msal;
  return <div>TrueHugz Inventory Log</div>;
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (no type errors).

- [ ] **Step 6: Commit**

```bash
git add src/auth/msalConfig.ts src/auth/authProvider.ts src/main.tsx src/App.tsx
git commit -m "feat: MSAL bootstrap and auth provider"
```

---

### Task 13: WorkbookRepo interface, seed-workbook builder, and Graph implementation

**Files:**
- Create: `src/data/repo.ts`, `src/data/seedWorkbook.ts`, `src/data/graphRepo.ts`
- Test: `src/data/seedWorkbook.test.ts`

> The Graph implementation is verified manually (Task 22). Its pure pieces (row mapping in Task 8, seed bytes here) are unit-tested.

- [ ] **Step 1: Write `src/data/repo.ts`**

```ts
import type { Branch, Institution, LogEntry, Product } from "./types";

export interface WorkbookRepo {
  /** Locate the workbook, creating + provisioning it on first run. */
  ensureWorkbook(): Promise<void>;
  getInstitutions(): Promise<Institution[]>;
  getBranches(): Promise<Branch[]>;
  getProducts(): Promise<Product[]>;
  getLogs(): Promise<LogEntry[]>;
  appendLog(entry: LogEntry): Promise<void>;
  hasLog(entryId: string): Promise<boolean>;
  addInstitution(i: Institution): Promise<void>;
  addBranch(b: Branch): Promise<void>;
  addProduct(p: Product): Promise<void>;
}
```

- [ ] **Step 2: Write the failing test `src/data/seedWorkbook.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { read, utils } from "xlsx";
import { buildSeedWorkbookBytes } from "./seedWorkbook";

describe("buildSeedWorkbookBytes", () => {
  it("produces a workbook with the four named sheets and seeded headers", () => {
    const wb = read(buildSeedWorkbookBytes(), { type: "array" });
    expect(wb.SheetNames).toEqual(["Institutions", "Branches", "Products", "Logs"]);

    const products = utils.sheet_to_json<string[]>(wb.Sheets["Products"], { header: 1 });
    expect(products[0]).toEqual(["Description", "SKU", "Type"]);
    expect(products).toHaveLength(17); // header + 16 SKUs

    const logs = utils.sheet_to_json<string[]>(wb.Sheets["Logs"], { header: 1 });
    expect(logs[0]).toEqual([
      "Entry ID", "Activity Date", "Institution", "Branch",
      "Activity Type", "Product", "SKU", "Quantity", "Logged-At",
    ]);
    expect(logs).toHaveLength(1); // header only
  });
});
```

- [ ] **Step 3: Run it, expect FAIL**

- [ ] **Step 4: Write `src/data/seedWorkbook.ts`**

```ts
import { utils, write } from "xlsx";
import { SEED } from "./seed";
import {
  INSTITUTION_COLUMNS, BRANCH_COLUMNS, PRODUCT_COLUMNS, LOG_COLUMNS,
  institutionToRow, branchToRow, productToRow,
} from "./rowMap";

type Cell = string | number;

/** Build an .xlsx (as bytes) with header rows + seed data, ready to upload to OneDrive. */
export function buildSeedWorkbookBytes(): ArrayBuffer {
  const wb = utils.book_new();
  const addSheet = (name: string, header: readonly string[], rows: Cell[][]) => {
    const ws = utils.aoa_to_sheet([[...header], ...rows]);
    utils.book_append_sheet(wb, ws, name);
  };
  addSheet("Institutions", INSTITUTION_COLUMNS, SEED.institutions.map(institutionToRow));
  addSheet("Branches", BRANCH_COLUMNS, SEED.branches.map(branchToRow));
  addSheet("Products", PRODUCT_COLUMNS, SEED.products.map(productToRow));
  addSheet("Logs", LOG_COLUMNS, []);
  return write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
```

- [ ] **Step 5: Run it, expect PASS**

- [ ] **Step 6: Write `src/data/graphRepo.ts`**

```ts
import type { WorkbookRepo } from "./repo";
import type { Branch, Institution, LogEntry, Product } from "./types";
import { buildSeedWorkbookBytes } from "./seedWorkbook";
import {
  branchToRow, rowToBranch, institutionToRow, rowToInstitution,
  productToRow, rowToProduct, logToRow, rowToLog,
} from "./rowMap";

const GRAPH = "https://graph.microsoft.com/v1.0";
export const FILE_NAME = "TrueHugz-Inventory-Log.xlsx";

type Cell = string | number;

export class GraphWorkbookRepo implements WorkbookRepo {
  private itemId: string | null = null;

  constructor(private getToken: () => Promise<string>) {}

  private async req(path: string, init: RequestInit = {}): Promise<unknown> {
    const token = await this.getToken();
    const res = await fetch(`${GRAPH}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      const err = new Error(`Graph ${res.status} ${path}: ${await res.text()}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  private async putContent(path: string, body: ArrayBuffer): Promise<{ id: string }> {
    const token = await this.getToken();
    const res = await fetch(`${GRAPH}${path}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body,
    });
    if (!res.ok) throw new Error(`Graph PUT ${res.status} ${path}: ${await res.text()}`);
    return (await res.json()) as { id: string };
  }

  async ensureWorkbook(): Promise<void> {
    if (this.itemId) return;
    try {
      const item = (await this.req(`/me/drive/root:/${encodeURIComponent(FILE_NAME)}`)) as { id: string };
      this.itemId = item.id;
      return;
    } catch (e) {
      if ((e as { status?: number }).status !== 404) throw e;
    }
    const created = await this.putContent(
      `/me/drive/root:/${encodeURIComponent(FILE_NAME)}:/content`,
      buildSeedWorkbookBytes(),
    );
    this.itemId = created.id;
    await this.defineTables();
  }

  /** Convert each seeded sheet's used range into a named Excel Table so the rows API works. */
  private async defineTables(): Promise<void> {
    const sheets = ["Institutions", "Branches", "Products", "Logs"];
    for (const sheet of sheets) {
      const used = (await this.req(
        `/me/drive/items/${this.itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/usedRange?$select=address`,
      )) as { address: string };
      const added = (await this.req(
        `/me/drive/items/${this.itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/tables/add`,
        { method: "POST", body: JSON.stringify({ address: used.address, hasHeaders: true }) },
      )) as { id: string };
      await this.req(`/me/drive/items/${this.itemId}/workbook/tables/${added.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: sheet }),
      });
    }
  }

  private async tableRows(table: string): Promise<Cell[][]> {
    await this.ensureWorkbook();
    const res = (await this.req(`/me/drive/items/${this.itemId}/workbook/tables/${table}/rows`)) as {
      value: { values: Cell[][] }[];
    };
    return res.value.map((r) => r.values[0]);
  }

  private async addRow(table: string, values: Cell[]): Promise<void> {
    await this.ensureWorkbook();
    await this.req(`/me/drive/items/${this.itemId}/workbook/tables/${table}/rows/add`, {
      method: "POST",
      body: JSON.stringify({ values: [values] }),
    });
  }

  async getInstitutions(): Promise<Institution[]> {
    return (await this.tableRows("Institutions")).map(rowToInstitution);
  }
  async getBranches(): Promise<Branch[]> {
    return (await this.tableRows("Branches")).map(rowToBranch);
  }
  async getProducts(): Promise<Product[]> {
    return (await this.tableRows("Products")).map(rowToProduct);
  }
  async getLogs(): Promise<LogEntry[]> {
    return (await this.tableRows("Logs")).map(rowToLog);
  }
  async appendLog(entry: LogEntry): Promise<void> {
    await this.addRow("Logs", logToRow(entry));
  }
  async hasLog(entryId: string): Promise<boolean> {
    return (await this.getLogs()).some((l) => l.entryId === entryId);
  }
  async addInstitution(i: Institution): Promise<void> {
    await this.addRow("Institutions", institutionToRow(i));
  }
  async addBranch(b: Branch): Promise<void> {
    await this.addRow("Branches", branchToRow(b));
  }
  async addProduct(p: Product): Promise<void> {
    await this.addRow("Products", productToRow(p));
  }
}
```

- [ ] **Step 7: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/data/repo.ts src/data/seedWorkbook.ts src/data/seedWorkbook.test.ts src/data/graphRepo.ts
git commit -m "feat: Graph workbook repo with first-run provisioning"
```

---

## Phase E — Sync worker

### Task 14: Drain the pending queue to the repo

**Files:**
- Create: `src/queue/syncWorker.ts`
- Test: `src/queue/syncWorker.test.ts`

- [ ] **Step 1: Write the failing test `src/queue/syncWorker.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { syncPending } from "./syncWorker";
import { savePending, loadPending } from "./pendingStore";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";

const mk = (id: string): LogEntry => ({
  entryId: id, activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
  activityType: "Stock Take", product: "P", sku: "S", quantity: 1, loggedAt: "x",
});

function fakeRepo(overrides: Partial<WorkbookRepo> = {}): { repo: WorkbookRepo; appended: string[] } {
  const appended: string[] = [];
  const repo = {
    ensureWorkbook: async () => {},
    getInstitutions: async () => [], getBranches: async () => [], getProducts: async () => [],
    getLogs: async () => [], hasLog: async () => false,
    appendLog: async (e: LogEntry) => { appended.push(e.entryId); },
    addInstitution: async () => {}, addBranch: async () => {}, addProduct: async () => {},
    ...overrides,
  } as WorkbookRepo;
  return { repo, appended };
}

describe("syncPending", () => {
  beforeEach(() => localStorage.clear());

  it("appends each queued entry and clears the queue", async () => {
    savePending([mk("a"), mk("b")]);
    const { repo, appended } = fakeRepo();
    const result = await syncPending(repo);
    expect(appended).toEqual(["a", "b"]);
    expect(result).toEqual({ synced: ["a", "b"], remaining: 0 });
    expect(loadPending()).toEqual([]);
  });

  it("skips appending when the entry already exists (idempotent retry) but still dequeues", async () => {
    savePending([mk("a")]);
    const { repo, appended } = fakeRepo({ hasLog: async () => true });
    const result = await syncPending(repo);
    expect(appended).toEqual([]);
    expect(result.remaining).toBe(0);
  });

  it("stops on error, leaving the failed entry queued", async () => {
    savePending([mk("a"), mk("b")]);
    const { repo } = fakeRepo({
      appendLog: async (e: LogEntry) => { if (e.entryId === "b") throw new Error("offline"); },
    });
    const result = await syncPending(repo);
    expect(result.synced).toEqual(["a"]);
    expect(result.remaining).toBe(1);
    expect(result.error).toContain("offline");
    expect(loadPending().map((e) => e.entryId)).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/queue/syncWorker.ts`**

```ts
import type { WorkbookRepo } from "../data/repo";
import { loadPending, removePending } from "./pendingStore";

export interface SyncResult {
  synced: string[];
  remaining: number;
  error?: string;
}

/** Append every queued entry to the workbook, dequeuing on success. Stops at the first failure. */
export async function syncPending(repo: WorkbookRepo): Promise<SyncResult> {
  const synced: string[] = [];
  for (const entry of loadPending()) {
    try {
      if (!(await repo.hasLog(entry.entryId))) {
        await repo.appendLog(entry);
      }
      removePending(entry.entryId);
      synced.push(entry.entryId);
    } catch (e) {
      return { synced, remaining: loadPending().length, error: String(e) };
    }
  }
  return { synced, remaining: loadPending().length };
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/queue/syncWorker.ts src/queue/syncWorker.test.ts
git commit -m "feat: queue sync worker"
```

---

## Phase F — UI components

### Task 15: Styling + small input primitives

**Files:**
- Create: `src/index.css` (replace scaffold content), `src/components/Segmented.tsx`, `src/components/QuantityStepper.tsx`
- Test: `src/components/QuantityStepper.test.tsx`

- [ ] **Step 1: Replace `src/index.css`**

```css
:root { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; }
* { box-sizing: border-box; }
body { margin: 0; background: #f4f5f7; }

.app { max-width: 760px; margin: 0 auto; padding: 16px; }
.topbar { display: flex; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.card { background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }

label { display: block; font-weight: 600; margin: 16px 0 6px; }
input, select, button { font-size: 18px; }
input, select { width: 100%; padding: 14px; border: 1px solid #cbd2d9; border-radius: 10px; background: #fff; }

button { cursor: pointer; border-radius: 10px; border: 1px solid #cbd2d9; background: #fff; padding: 14px 18px; }
button.primary { background: #1f6feb; color: #fff; border-color: #1f6feb; font-weight: 700; width: 100%; padding: 18px; }
button:disabled { opacity: .5; cursor: not-allowed; }

.segmented { display: flex; gap: 8px; }
.segmented button { flex: 1; padding: 16px; }
.segmented button[aria-pressed="true"] { background: #1f6feb; color: #fff; border-color: #1f6feb; }

.stepper { display: flex; align-items: stretch; gap: 10px; }
.stepper button { width: 64px; font-size: 28px; }
.stepper input { text-align: center; font-size: 28px; }

.errors { color: #b91c1c; margin-top: 12px; }
.errors li { margin: 4px 0; }

table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; }
td.num, th.num { text-align: right; }

.chip { font-size: 14px; padding: 6px 12px; border-radius: 999px; }
.chip.synced { background: #dcfce7; color: #166534; }
.chip.pending { background: #fef9c3; color: #854d0e; }
.chip.error { background: #fee2e2; color: #991b1b; }

.combo { position: relative; }
.combo-list { position: absolute; z-index: 5; left: 0; right: 0; max-height: 280px; overflow: auto;
  background: #fff; border: 1px solid #cbd2d9; border-radius: 10px; margin-top: 4px; }
.combo-list button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid #f0f0f0; }
.combo-list button:hover { background: #eef4ff; }
.muted { color: #6b7280; font-size: 14px; }
```

- [ ] **Step 2: Write `src/components/Segmented.tsx`**

```tsx
interface Option<T extends string> { value: T; label: string; }

export function Segmented<T extends string>({
  options, value, onChange, ariaLabel,
}: {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write the failing test `src/components/QuantityStepper.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "./QuantityStepper";

describe("QuantityStepper", () => {
  it("increments and decrements but never below 0", async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={0} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(onChange).toHaveBeenLastCalledWith(0); // clamped at 0
  });
});
```

- [ ] **Step 4: Run it, expect FAIL**

- [ ] **Step 5: Write `src/components/QuantityStepper.tsx`**

```tsx
export function QuantityStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease quantity" onClick={() => onChange(Math.max(0, value - 1))}>–</button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        aria-label="Quantity"
      />
      <button type="button" aria-label="Increase quantity" onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}
```

- [ ] **Step 6: Run it, expect PASS**

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/Segmented.tsx src/components/QuantityStepper.tsx src/components/QuantityStepper.test.tsx
git commit -m "feat: styling and quantity/segmented primitives"
```

---

### Task 16: Searchable select with inline "add new"

**Files:**
- Create: `src/components/SearchableSelect.tsx`
- Test: `src/components/SearchableSelect.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/SearchableSelect.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableSelect } from "./SearchableSelect";

const options = [
  { value: "CG-L-15", label: "CoolGuard (L)" },
  { value: "CC-M-15", label: "CoolComfort (M)" },
];

describe("SearchableSelect", () => {
  it("filters options by typed text and selects one", async () => {
    const onSelect = vi.fn();
    render(<SearchableSelect label="Product" options={options} value="" onSelect={onSelect} onAddNew={vi.fn()} addNewLabel="+ Add product" />);
    await userEvent.click(screen.getByLabelText("Product"));
    await userEvent.type(screen.getByLabelText("Product"), "comfort");
    expect(screen.queryByRole("button", { name: "CoolGuard (L)" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "CoolComfort (M)" }));
    expect(onSelect).toHaveBeenCalledWith("CC-M-15");
  });

  it("offers add-new when the typed text matches nothing", async () => {
    const onAddNew = vi.fn();
    render(<SearchableSelect label="Product" options={options} value="" onSelect={vi.fn()} onAddNew={onAddNew} addNewLabel="+ Add product" />);
    await userEvent.type(screen.getByLabelText("Product"), "Brand New");
    await userEvent.click(screen.getByRole("button", { name: "+ Add product" }));
    expect(onAddNew).toHaveBeenCalledWith("Brand New");
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/components/SearchableSelect.tsx`**

```tsx
import { useMemo, useState } from "react";

interface Option { value: string; label: string; }

export function SearchableSelect({
  label, options, value, onSelect, onAddNew, addNewLabel,
}: {
  label: string;
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
  onAddNew: (typedLabel: string) => void;
  addNewLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <div className="combo">
      <input
        aria-label={label}
        value={open ? query : selectedLabel}
        placeholder={`Search ${label.toLowerCase()}…`}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="combo-list">
          {filtered.map((o) => (
            <button key={o.value} type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(o.value); setOpen(false); }}>
              {o.label}
            </button>
          ))}
          {query.trim() && (
            <button type="button" className="muted" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onAddNew(query.trim()); setOpen(false); }}>
              {addNewLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchableSelect.tsx src/components/SearchableSelect.test.tsx
git commit -m "feat: searchable select with add-new"
```

---

### Task 17: Log Entry view

**Files:**
- Create: `src/components/LogEntryView.tsx`
- Test: `src/components/LogEntryView.test.tsx`

- [ ] **Step 1: Write the failing test `src/components/LogEntryView.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogEntryView } from "./LogEntryView";

const branches = [{ institution: "NUH Health & U", branch: "Main Building (Zone F)", remarks: "" }];
const products = [{ description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" }];

function setup() {
  const onSave = vi.fn();
  render(
    <LogEntryView
      institution="NUH Health & U" branches={branches} products={products}
      onSave={onSave} onAddBranch={vi.fn()} onAddProduct={vi.fn()} today="2026-06-05"
    />,
  );
  return { onSave };
}

describe("LogEntryView", () => {
  it("blocks save and shows errors when fields are missing", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Select a branch")).toBeInTheDocument();
  });

  it("saves a complete entry with the chosen values", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByLabelText("Branch"));
    await userEvent.click(screen.getByRole("button", { name: "Main Building (Zone F)" }));
    await userEvent.click(screen.getByRole("button", { name: "Stock Top Up" }));
    await userEvent.click(screen.getByLabelText("Product"));
    await userEvent.click(screen.getByRole("button", { name: "CoolGuard (L)" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    await userEvent.click(screen.getByRole("button", { name: /save entry/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const arg = onSave.mock.calls[0][0];
    expect(arg).toMatchObject({
      institution: "NUH Health & U", branch: "Main Building (Zone F)",
      activityType: "Stock Top Up", product: "CoolGuard (L)", sku: "CG-L-15",
      quantity: 1, activityDate: "2026-06-05",
    });
  });
});
```

- [ ] **Step 2: Run it, expect FAIL**

- [ ] **Step 3: Write `src/components/LogEntryView.tsx`**

```tsx
import { useState } from "react";
import type { ActivityType, Branch, Product } from "../data/types";
import { validateEntry } from "../domain/validate";
import { Segmented } from "./Segmented";
import { SearchableSelect } from "./SearchableSelect";
import { QuantityStepper } from "./QuantityStepper";

export interface NewEntry {
  institution: string;
  branch: string;
  activityType: ActivityType;
  activityDate: string;
  product: string;
  sku: string;
  quantity: number;
}

export function LogEntryView({
  institution, branches, products, today, onSave, onAddBranch, onAddProduct,
}: {
  institution: string;
  branches: Branch[];
  products: Product[];
  today: string;
  onSave: (entry: NewEntry) => void;
  onAddBranch: (name: string) => void;
  onAddProduct: (name: string) => void;
}) {
  const [branch, setBranch] = useState("");
  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [activityDate, setActivityDate] = useState(today);
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const product = products.find((p) => p.sku === sku)?.description ?? "";
  const branchOptions = branches.filter((b) => b.institution === institution).map((b) => ({ value: b.branch, label: b.branch }));
  const productOptions = products.map((p) => ({ value: p.sku, label: p.description }));

  function handleSave() {
    const draft = { institution, branch, activityType, activityDate, product, sku, quantity };
    const errs = validateEntry(draft);
    setErrors(errs);
    if (errs.length > 0 || !activityType) return;
    onSave({ institution, branch, activityType, activityDate, product, sku, quantity });
    // Keep branch + date for fast multi-product logging; reset the rest.
    setActivityType(null);
    setSku("");
    setQuantity(0);
    setErrors([]);
  }

  return (
    <div className="card">
      <label htmlFor="">Branch</label>
      <SearchableSelect label="Branch" options={branchOptions} value={branch}
        onSelect={setBranch} onAddNew={onAddBranch} addNewLabel="+ Add branch" />

      <label>Activity Type</label>
      <Segmented
        ariaLabel="Activity Type"
        options={[{ value: "Stock Take", label: "Stock Take" }, { value: "Stock Top Up", label: "Stock Top Up" }]}
        value={activityType}
        onChange={(v) => setActivityType(v)}
      />

      <label htmlFor="activity-date">Activity Date</label>
      <input id="activity-date" type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} />

      <label>Product</label>
      <SearchableSelect label="Product" options={productOptions} value={sku}
        onSelect={setSku} onAddNew={onAddProduct} addNewLabel="+ Add product" />

      <label>Quantity</label>
      <QuantityStepper value={quantity} onChange={setQuantity} />

      {errors.length > 0 && (
        <ul className="errors">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}

      <div style={{ marginTop: 20 }}>
        <button type="button" className="primary" onClick={handleSave}>Save entry</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/LogEntryView.tsx src/components/LogEntryView.test.tsx
git commit -m "feat: log entry view"
```

---

### Task 18: Dashboard view (totals table, time filter, export)

**Files:**
- Create: `src/components/TotalsTable.tsx`, `src/components/DashboardView.tsx`
- Test: `src/components/DashboardView.test.tsx`

- [ ] **Step 1: Write `src/components/TotalsTable.tsx`**

```tsx
import type { ProductTotal } from "../data/types";

export function TotalsTable({ totals }: { totals: ProductTotal[] }) {
  if (totals.length === 0) {
    return <p className="muted">No entries for this period yet.</p>;
  }
  return (
    <table>
      <thead>
        <tr><th>Product</th><th>SKU</th><th className="num">Total units</th></tr>
      </thead>
      <tbody>
        {totals.map((t) => (
          <tr key={t.sku || t.product}>
            <td>{t.product}</td><td>{t.sku}</td><td className="num">{t.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Write the failing test `src/components/DashboardView.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardView } from "./DashboardView";
import type { LogEntry } from "../data/types";

const entries: LogEntry[] = [
  { entryId: "a", activityDate: "2026-06-05", institution: "NUH Health & U", branch: "Zone B",
    activityType: "Stock Take", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 5, loggedAt: "x" },
  { entryId: "b", activityDate: "2026-05-01", institution: "NUH Health & U", branch: "Zone B",
    activityType: "Stock Top Up", product: "CoolGuard (L)", sku: "CG-L-15", quantity: 3, loggedAt: "x" },
];

describe("DashboardView", () => {
  it("defaults to Day and shows only today's total", () => {
    render(<DashboardView entries={entries} today="2026-06-05" onExport={vi.fn()} />);
    expect(screen.getByRole("cell", { name: "5" })).toBeInTheDocument();
  });

  it("switches to To-Date and sums everything, then exports", async () => {
    const onExport = vi.fn();
    render(<DashboardView entries={entries} today="2026-06-05" onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: "To-Date" }));
    expect(screen.getByRole("cell", { name: "8" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /generate excel report/i }));
    expect(onExport).toHaveBeenCalledWith("toDate");
  });
});
```

- [ ] **Step 3: Run it, expect FAIL**

- [ ] **Step 4: Write `src/components/DashboardView.tsx`**

```tsx
import { useState } from "react";
import type { LogEntry, TimeWindow } from "../data/types";
import { filterByWindow } from "../domain/filter";
import { totalsByProduct } from "../domain/aggregate";
import { Segmented } from "./Segmented";
import { TotalsTable } from "./TotalsTable";

export function DashboardView({
  entries, today, onExport,
}: {
  entries: LogEntry[];
  today: string;
  onExport: (window: TimeWindow) => void;
}) {
  const [window, setWindow] = useState<TimeWindow>("day");
  const totals = totalsByProduct(filterByWindow(entries, window, today));

  return (
    <div className="card">
      <Segmented
        ariaLabel="Time filter"
        options={[
          { value: "day", label: "Day" },
          { value: "month", label: "Month" },
          { value: "toDate", label: "To-Date" },
        ]}
        value={window}
        onChange={setWindow}
      />
      <TotalsTable totals={totals} />
      <div style={{ marginTop: 20 }}>
        <button type="button" className="primary" onClick={() => onExport(window)}>
          Generate Excel Report
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run it, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/components/TotalsTable.tsx src/components/DashboardView.tsx src/components/DashboardView.test.tsx
git commit -m "feat: dashboard view with totals, filter, export"
```

---

### Task 19: Chrome components (institution selector, view toggle, sync chip, sign-in)

**Files:**
- Create: `src/components/InstitutionSelector.tsx`, `src/components/ViewToggle.tsx`, `src/components/SyncStatusChip.tsx`, `src/components/SignInScreen.tsx`

> Simple presentational components; covered by the App integration in Task 21. No separate tests.

- [ ] **Step 1: Write `src/components/InstitutionSelector.tsx`**

```tsx
import type { Institution } from "../data/types";

export function InstitutionSelector({
  institutions, value, onChange,
}: {
  institutions: Institution[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select aria-label="Institution" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 320 }}>
      {institutions.map((i) => (
        <option key={i.institution} value={i.institution}>{i.institution}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Write `src/components/ViewToggle.tsx`**

```tsx
import { Segmented } from "./Segmented";

export type View = "log" | "dashboard";

export function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <Segmented
      ariaLabel="View"
      options={[{ value: "log", label: "Log Entry" }, { value: "dashboard", label: "Dashboard" }]}
      value={value}
      onChange={onChange}
    />
  );
}
```

- [ ] **Step 3: Write `src/components/SyncStatusChip.tsx`**

```tsx
export type SyncState = "synced" | "pending" | "error";

export function SyncStatusChip({
  state, pendingCount, onSync,
}: {
  state: SyncState;
  pendingCount: number;
  onSync: () => void;
}) {
  const text =
    state === "synced" ? "All synced"
    : state === "pending" ? `${pendingCount} pending`
    : "Sync failed — will retry";
  return (
    <button type="button" className={`chip ${state}`} onClick={onSync} title="Sync now">
      {text}
    </button>
  );
}
```

- [ ] **Step 4: Write `src/components/SignInScreen.tsx`**

```tsx
export function SignInScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="app">
      <div className="card" style={{ textAlign: "center" }}>
        <h1>TrueHugz Inventory Log</h1>
        <p className="muted">Sign in with your Microsoft account to log stock activity.</p>
        <button type="button" className="primary" onClick={onSignIn}>Sign in with Microsoft</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/InstitutionSelector.tsx src/components/ViewToggle.tsx src/components/SyncStatusChip.tsx src/components/SignInScreen.tsx
git commit -m "feat: app chrome components"
```

---

## Phase G — Hooks & wiring

### Task 20: Data hooks

**Files:**
- Create: `src/hooks/useCatalog.ts`, `src/hooks/useLogs.ts`, `src/hooks/usePendingQueue.ts`

> Thin glue around already-tested logic; verified via the App and manual run.

- [ ] **Step 1: Write `src/hooks/useCatalog.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import type { WorkbookRepo } from "../data/repo";
import type { Branch, Institution, Product } from "../data/types";

export function useCatalog(repo: WorkbookRepo) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await repo.ensureWorkbook();
      const [i, b, p] = await Promise.all([repo.getInstitutions(), repo.getBranches(), repo.getProducts()]);
      setInstitutions(i);
      setBranches(b);
      setProducts(p);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => { void reload(); }, [reload]);

  return { institutions, branches, products, loading, error, reload };
}
```

- [ ] **Step 2: Write `src/hooks/useLogs.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";
import { loadPending } from "../queue/pendingStore";
import { mergeEntries } from "../domain/merge";

export function useLogs(repo: WorkbookRepo, pendingVersion: number) {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const reload = useCallback(async () => {
    await repo.ensureWorkbook();
    const server = await repo.getLogs();
    setEntries(mergeEntries(server, loadPending()));
  }, [repo]);

  // Re-merge whenever the queue changes (pendingVersion bumps) or on mount.
  useEffect(() => { void reload(); }, [reload, pendingVersion]);

  return { entries, reload };
}
```

- [ ] **Step 3: Write `src/hooks/usePendingQueue.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import type { WorkbookRepo } from "../data/repo";
import type { LogEntry } from "../data/types";
import { addPending, loadPending } from "../queue/pendingStore";
import { syncPending } from "../queue/syncWorker";
import type { SyncState } from "../components/SyncStatusChip";

export function usePendingQueue(repo: WorkbookRepo) {
  const [pendingCount, setPendingCount] = useState(loadPending().length);
  const [state, setState] = useState<SyncState>(loadPending().length ? "pending" : "synced");
  const [version, setVersion] = useState(0); // bump to trigger log re-merge

  const refresh = useCallback(() => {
    const n = loadPending().length;
    setPendingCount(n);
    setVersion((v) => v + 1);
    setState((prev) => (n === 0 ? "synced" : prev === "error" ? "error" : "pending"));
  }, []);

  const sync = useCallback(async () => {
    const result = await syncPending(repo);
    setState(result.error ? "error" : result.remaining > 0 ? "pending" : "synced");
    setPendingCount(result.remaining);
    setVersion((v) => v + 1);
  }, [repo]);

  const enqueue = useCallback((entry: LogEntry) => {
    addPending(entry);
    refresh();
    void sync(); // try immediately; harmless if offline
  }, [refresh, sync]);

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

  return { pendingCount, state, version, enqueue, sync };
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCatalog.ts src/hooks/useLogs.ts src/hooks/usePendingQueue.ts
git commit -m "feat: catalog/logs/queue hooks"
```

---

### Task 21: App shell — auth gate, wiring, add-new flows, export

**Files:**
- Modify: `src/App.tsx` (replace the placeholder)

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
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
  const { entries, reload: reloadLogs } = useLogs(repo, queue.version);

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
```

- [ ] **Step 2: Verify build + full test suite**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire app shell, add-new flows, and export"
```

---

### Task 22: Setup docs and manual verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# TrueHugz Inventory Log

Tablet web app for logging Stock Take / Stock Top Up activity to an Excel workbook
in your OneDrive, with a per-product dashboard and Excel export. Client-only React +
Vite SPA — no backend.

## One-time setup

### 1. Register an Azure app (free, ~5 min)
1. Go to <https://entra.microsoft.com> → **App registrations** → **New registration**.
2. Name: `TrueHugz Inventory Log`. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
3. Platform: **Single-page application (SPA)**. Redirect URI: `http://localhost:5173`
   (add your production URL later, e.g. `https://your-app.vercel.app`).
4. Copy the **Application (client) ID**.
5. **API permissions** → add Microsoft Graph **delegated** permissions: `User.Read`, `Files.ReadWrite`.

### 2. Configure the app
```bash
cp .env.example .env
# edit .env and set VITE_MSAL_CLIENT_ID=<your client id>
```

## Develop
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # run unit tests
```

On first sign-in the app creates `TrueHugz-Inventory-Log.xlsx` at the root of your
OneDrive (tabs: Institutions, Branches, Products, Logs) and seeds the NUH branches and
the 16 product SKUs. You can edit that file directly in Excel anytime.

## Deploy
Build static files and host them anywhere (Vercel / Azure Static Web Apps / Netlify):
```bash
npm run build    # outputs dist/
```
Add the production URL as a redirect URI in the Azure app registration.
````

- [ ] **Step 2: Run the full suite one last time**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Manual verification checklist (requires a real Microsoft account)**

Run `npm run dev`, then confirm:
1. Sign-in redirects to Microsoft and back; the app loads.
2. First run creates `TrueHugz-Inventory-Log.xlsx` in OneDrive with the 4 tabs + seed data.
3. Log an entry → it appears in the OneDrive file's `Logs` tab and the sync chip shows "All synced".
4. Switch to airplane mode, log an entry → chip shows "1 pending"; re-enable network → it syncs.
5. Dashboard: Day/Month/To-Date change the totals; "Generate Excel Report" downloads a 5-column `.xlsx`.
6. Add a new branch and a new product → they appear in the dropdowns and the OneDrive file.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: setup and verification guide"
```

---

## Self-Review

**Spec coverage:**
- §3 Architecture (client-only SPA, MSAL, Graph) → Tasks 1, 12, 13.
- §4 Data model (4 tabs, Institution column, Logs columns incl. Entry ID / Activity Date / Logged-At) → Tasks 2, 8, 13.
- §5.1 Log Entry (5 fields, segmented activity toggle, date default, searchable product/branch with add, quantity stepper, keep branch+date on save) → Tasks 15, 16, 17, 21.
- §5.2 Dashboard (Day/Month/To-Date, per-product totals, export button, empty state) → Tasks 5, 18.
- §6 Offline queue (localStorage, save-then-sync, idempotent retry via Entry ID, status chip, auto-sync on reconnect/focus, merged reads) → Tasks 6, 10, 14, 19, 20.
- §7 Export (SheetJS, 5-column schema, contextual filename) → Tasks 7, 11, 21.
- §8 Provisioning (lookup, upload seed template, define tables) → Task 13.
- §9 Graph usage (locate/read/append/upload) → Task 13.
- §10 Error handling (silent refresh + redirect fallback, sync retry, duplicate branch/product blocked, validation, empty states) → Tasks 9, 12, 14, 17, 18, 21.
- §11 Testing (pure logic TDD, repo mocked, component validation tests) → Tasks 2–11, 14–18.
- §12 Tooling → Task 1.
- Appendix A seed data → Task 2.

**Placeholder scan:** No "TBD"/"handle later" steps; every code step contains complete code. Add-new product SKU is captured via a prompt (explicit), not left vague.

**Type consistency:** `WorkbookRepo` method names match across `repo.ts`, `graphRepo.ts`, hooks, and the sync worker (`ensureWorkbook`, `getLogs`, `appendLog`, `hasLog`, `addBranch`, `addProduct`). `LogEntry`/`NewEntry` field names align between `LogEntryView`, `App.handleSave`, `rowMap`, and `validate`. `TimeWindow` values (`day`/`month`/`toDate`) match between `filter.ts`, `DashboardView`, and `App.handleExport`. `SyncState` values (`synced`/`pending`/`error`) match between `SyncStatusChip` and `usePendingQueue`.

**Known follow-ups (not blocking v1):** repo reads the full Logs table for each dashboard refresh and `hasLog` check — fine for single-operator volumes; revisit with `$top`/filtering if logs grow large. Workbook column order is fixed by provisioning (Task 13) and assumed stable; if the user manually reorders columns in Excel, the row mappers would need to read the header row instead.
