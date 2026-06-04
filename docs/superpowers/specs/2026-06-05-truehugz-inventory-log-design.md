# TrueHugz Inventory Log — Design Spec

**Date:** 2026-06-05
**Status:** Approved (pending user review of this document)
**Source:** Stock Log Count — Product Requirement Document (PRD)

## 1. Overview

A tablet-optimized web app for recording inventory **Stock Take** (counting on-shelf
units) and **Stock Top Up** (replenishment) activities at retail points, plus a
reporting dashboard and an Excel export utility.

The PRD frames this around NUH Health & U, but the operator is a **2-person company
that collaborates with many institutions** — NUH is the first of many. The app is used
by **a single person, signed into their own Microsoft account**, on a tablet.

## 2. Goals & non-goals

**Goals**
- Fast, tap-friendly logging of stock activities on a tablet.
- A live per-product totals dashboard with Day / Month / To-Date filtering.
- One-click Excel (`.xlsx`) export in the PRD's column schema.
- Data persisted to **Excel on OneDrive** so it's viewable/editable outside the app.
- Designed to scale across multiple institutions without restructuring.
- Resilient to flaky wifi — a logged count is never lost.

**Non-goals (v1)**
- Multi-user accounts, roles, or per-user sign-in beyond the single operator.
- A shared/hosted backend or database server.
- Stock-level math beyond what the PRD asks (no reorder thresholds, no
  current-on-hand derivation from take vs top-up).
- Mobile-phone-first layout (tablet is the target; it should still be usable on phone).

## 3. Architecture

A **client-only React + Vite single-page app** — no backend server. It signs the user
into their own Microsoft account and talks to **Microsoft Graph** directly from the
browser to read/write **one Excel workbook in their OneDrive**.

```
┌─────────────────────────────────────────────┐
│   TrueHugz Inventory Log (React + Vite SPA)    │
│                                               │
│   [Institution selector] (global, top)         │
│   ┌─────────────┐        ┌──────────────────┐  │
│   │  Log Entry  │  <-->  │     Dashboard     │ │
│   │  (capture)  │        │  + Excel export   │  │
│   └─────────────┘        └──────────────────┘  │
│   Local pending-entry queue (localStorage)      │
└──────────────┬────────────────────────────────┘
               │  MSAL sign-in (user's MS account, PKCE)
               │  Microsoft Graph workbook API
               ▼
┌─────────────────────────────────────────────┐
│   OneDrive › TrueHugz-Inventory-Log.xlsx       │
│   [Institutions] [Branches] [Products] [Logs]   │
└─────────────────────────────────────────────┘
```

- **Hosting:** static files. Vercel / Azure Static Web Apps / Netlify (chosen at deploy time).
- **Auth:** `@azure/msal-browser`, public-client SPA with PKCE. One-time Azure app
  registration provides a **client ID** (no client secret). Scopes: `Files.ReadWrite`,
  `User.Read`, `offline_access`. Token cached; silent refresh on subsequent opens.

## 4. Data model — single workbook, `Institution` column

One file: **`TrueHugz-Inventory-Log.xlsx`**. Products are a **shared TrueHugz catalog**
(same across institutions); branches are **institution-specific**. The only thing that
varies per institution is branches (and the logs that reference them), handled via an
`Institution` column rather than separate files or tabs.

Each tab is a proper Excel **Table** (named range) so Graph's table API can append rows.

**`Institutions`**

| Column | Notes |
|---|---|
| Institution | Display name, unique. Seeded: `NUH Health & U` |
| Remarks | Optional |

**`Branches`**

| Column | Notes |
|---|---|
| Institution | FK to Institutions |
| Branch | Display name |
| Remarks | Optional (e.g. unit number / location) |

**`Products`** (shared catalog, no Institution column)

| Column | Notes |
|---|---|
| Description | e.g. `CoolDiscreet (M)` |
| SKU | e.g. `CD-M-20` (unique) |
| Type | e.g. `Bag` |

**`Logs`** (append-only)

| Column | Notes |
|---|---|
| Entry ID | Client-generated GUID — idempotency / dedup on retry |
| Activity Date | Business date (user-chosen, may be backdated) |
| Institution | |
| Branch | |
| Activity Type | `Stock Take` or `Stock Top Up` |
| Product | Description |
| SKU | |
| Quantity | Integer > 0 |
| Logged-At | Real submission timestamp (audit) |

> The dashboard time filter and the Excel export's "Timestamp / Date" column both use
> **Activity Date**. `Logged-At` and `Entry ID` stay in the workbook for audit/dedup but
> are **not** in the 5-column export.

## 5. Screens & workflow

A global **Institution selector** at the top (defaults to `NUH Health & U`) scopes both
views. The user toggles between two views (PRD's two-view layout).

### 5.1 View 1 — Log Entry (data capture)

One tap-friendly screen, the PRD's 5 fields top to bottom:

1. **Branch** — dropdown filtered to the selected institution; `+ Add branch` appends a
   Branches row.
2. **Activity Type** — two-button segmented toggle: `Stock Take` | `Stock Top Up`
   (strict binary).
3. **Activity Date** — date picker defaulting to today; editable for historical entries.
4. **Product** — searchable dropdown over the shared catalog; `+ Add product` appends a
   Products row.
5. **Quantity** — large number field with big `–` / `+` steppers.

**Save entry** → enqueues one entry (see §6), shows confirmation, resets the form but
**keeps Branch + Activity Date** so multiple products can be logged in a row quickly.

Validation before save: branch selected, product selected, quantity is an integer > 0.

### 5.2 View 2 — Dashboard (reporting + export)

- **Time filter** — segmented control: `Day` (today) | `Month` (current calendar month)
  | `To-Date` (everything).
- **Totals table** — one row per product, combined total units within the
  filter + institution (per PRD — both activity types summed into one number), sorted by
  product. Reads from server Logs **merged with any still-pending queued entries**.
- **Generate Excel Report** — prominent primary button; exports the currently-filtered,
  merged dataset (see §7).

Empty states: friendly placeholders when there are no entries / no products yet.

## 6. Offline-capable saving (save-then-sync)

A logged count must never be lost to bad wifi, so saving is decoupled from syncing.

1. **Save** writes the entry to a **local pending queue** persisted in `localStorage`
   (survives reload / tablet sleep), tagged with a client-generated `Entry ID`.
2. A **sync worker** drains the queue to the Logs table via Graph:
   - immediately when online (usually a sub-second round-trip),
   - automatically on reconnect (`online` event) and on app focus/visibility,
   - on demand via a **"Sync now"** button.
   Rows that append successfully are removed from the queue.
3. A **status chip** shows state: `All synced` / `N pending` / `Sync failed — will retry`.
4. **Idempotency:** before appending on a retry-after-uncertain-failure, the worker
   checks whether that `Entry ID` already exists in Logs, preventing double-adds.
5. **Reads merge** server Logs with still-pending queued entries, so dashboard totals and
   exports are always complete mid-sync. The user is nudged to sync before exporting so
   the workbook itself is fully authoritative.

## 7. Excel export

Client-side generation with **SheetJS** (`xlsx`) — no server, no OneDrive round-trip.
The button compiles the currently-filtered, merged dataset into a fresh `.xlsx` with
exactly the PRD's five columns, one row per transaction:

| Column A | Column B | Column C | Column D | Column E |
|---|---|---|---|---|
| Timestamp / Date (Activity Date) | Branch Name | Activity Type | Product Name | Quantity Recorded |

Downloaded filename encodes context, e.g. `TrueHugz-NUH-Month-2026-06.xlsx`.

## 8. First-run provisioning

The app ships with a **pre-seeded template** `TrueHugz-Inventory-Log.xlsx` baked into the
build (Institutions = NUH; Branches = Zone B/F/G; Products = the 16 SKUs; Logs empty,
with all four tables defined). On first run after sign-in:

1. Look up the file at OneDrive root via Graph.
2. If absent, upload the bundled template once.
3. Cache the file's drive-item ID for subsequent calls.

Result: setup is just "sign in" — nothing manual. The user can also edit the workbook
directly in Excel at any time.

## 9. Microsoft Graph usage (reference)

- Locate file: `GET /me/drive/root:/TrueHugz-Inventory-Log.xlsx`
- Read a table's rows: `GET /me/drive/items/{id}/workbook/tables/{Table}/rows`
- Append a row: `POST /me/drive/items/{id}/workbook/tables/Logs/rows/add`
- Upload template: `PUT /me/drive/root:/TrueHugz-Inventory-Log.xlsx:/content`

Graph access lives behind a **thin data-access module** with a typed interface, so it can
be mocked in tests and swapped without touching UI/logic.

## 10. Error handling & edge cases

- **Not signed in / token expired** → MSAL silent refresh; on failure, clean re-sign-in
  prompt. Form input is never discarded.
- **Graph/network error on sync** → entry stays queued, status chip reflects it, auto-retry.
- **Duplicate branch/product add** → detected (by name/SKU) and blocked with a gentle message.
- **Empty catalogs / no logs** → friendly placeholders.
- **Quantity** must be a positive integer; reject 0/blank/negative.

## 11. Testing

- **Pure logic, unit-tested (TDD where practical):** time-window filtering
  (Day/Month/To-Date), per-product aggregation, export row-shaping, queue merge + dedup by
  `Entry ID`. No Graph dependency.
- **Data-access module mocked** in logic/component tests; tests never hit the network.
- **Component tests** for form validation (required fields, quantity rule).
- **Manual/integration pass** against a real test workbook: sign-in, first-run
  provisioning, append, read-back.

## 12. Build & tooling

- React + Vite + TypeScript.
- `@azure/msal-browser` for auth, `@microsoft/microsoft-graph-client` (or fetch) for Graph.
- `xlsx` (SheetJS) for export.
- Styling: lightweight utility CSS (e.g. Tailwind) with large touch targets; component
  choices finalized in the implementation plan.
- Vitest + Testing Library for tests.

## 13. Out of scope / future

- Multi-user / shared backend.
- Per-institution external file sharing (current model co-mingles institutions in one
  internal file — acceptable for single-operator use).
- Stock-on-hand derivation, reorder alerts, analytics beyond per-product totals.
- Conflict resolution for the workbook being edited concurrently in Excel and the app
  (low risk for a single user; `Entry ID` covers retry dedup).

## Appendix A — Seed data

**Institutions:** `NUH Health & U`

**Branches (NUH Health & U):**

| Branch | Remarks |
|---|---|
| NUH Medical Centre (Zone B) | #03-01 (within the Medical Centre Pharmacy) |
| Main Building (Zone F) | #01-01 (beside the Main Building Pharmacy) |
| Main Building (Zone G) | #01-11 (opposite the Kopitiam food court) |

**Products (shared catalog):**

| Description | SKU | Type |
|---|---|---|
| CoolDiscreet (M) | CD-M-20 | Bag |
| CoolDiscreet (M) (Free) | CD-M-20 (Free) | Bag |
| CoolDiscreet (L) | CD-L-20 | Bag |
| CoolDiscreet (L) (Free) | CD-L-20 (Free) | Bag |
| CoolDiscreet+ (M) | CDP-M-15 | Bag |
| CoolDiscreet+ (M) (Free) | CDP-M-15 (Free) | Bag |
| CoolDiscreet+ (L) | CDP-L-15 | Bag |
| CoolDiscreet+ (L) (Free) | CDP-L-15 (Free) | Bag |
| CoolComfort (M) | CC-M-15 | Bag |
| CoolComfort (M) (Free) | CC-M-15 (Free) | Bag |
| CoolComfort (L) | CC-L-15 | Bag |
| CoolComfort (L) (Free) | CC-L-15 (Free) | Bag |
| CoolGuard (M) | CG-M-15 | Bag |
| CoolGuard (M) (Free) | CG-M-15 (Free) | Bag |
| CoolGuard (L) | CG-L-15 | Bag |
| CoolGuard (L) (Free) | CG-L-15 (Free) | Bag |

## Appendix B — Decision log

| Decision | Choice |
|---|---|
| Data store | Excel on OneDrive (Microsoft Graph) |
| Auth | Per-user MSAL sign-in to operator's own MS account; client-only, no backend |
| Frontend | React + Vite (static SPA) |
| Dashboard totals | One combined total per product (per PRD); activity-type detail lives in rows/export |
| Multi-institution | Single file + `Institution` column; shared Products catalog |
| Date handling | Store Activity Date (business) + Logged-At (audit); filter/export on Activity Date |
| Offline | Local pending queue + background sync (save-then-sync) |
| Export | Client-side SheetJS `.xlsx`, PRD 5-column schema |
