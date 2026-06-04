# TrueHugz Inventory Log

Tablet web app for logging Stock Take / Stock Top Up activity to an Excel workbook
in your OneDrive, with a per-product dashboard and Excel export. Client-only React +
Vite SPA — no backend.

## Prerequisites
- **Node.js 20+** and **npm**
- A Microsoft account with OneDrive

## One-time setup

### 1. Register an Azure app (free, ~5 min)
1. Go to <https://entra.microsoft.com> → **App registrations** → **New registration**.
2. Name: `TrueHugz Inventory Log`. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**.
3. Platform: **Single-page application (SPA)**. Redirect URI: `http://localhost:5173`
   (add your production URL later, e.g. `https://your-app.vercel.app`).
4. Copy the **Application (client) ID**.
5. **API permissions** → add Microsoft Graph **delegated** permissions: `User.Read`, `Files.ReadWrite`.
   - On first sign-in you'll be asked to consent to these permissions for your own account. If you use an organizational tenant that requires admin consent, grant it in the Azure portal under **API permissions**.

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
the 16 product SKUs (example seed data; NUH = National University Hospital — edit it
directly in the Excel workbook or via the app's "+ Add" options). You can edit that file
directly in Excel anytime.

## Deploy
Build static files and host them anywhere (Vercel / Azure Static Web Apps / Netlify):
```bash
npm run build    # outputs dist/
```
Add the production URL as a redirect URI in the Azure app registration.

## Verify it works
- Sign in with your Microsoft account; the app loads.
- First run creates `TrueHugz-Inventory-Log.xlsx` at your OneDrive root with the 4 tabs + seed data.
- Log an entry → it appears in the workbook's `Logs` tab; the sync chip shows "All synced".
- Go offline (airplane mode), log an entry → chip shows "1 pending"; go back online → it syncs.
- On the Dashboard, switch Day/Month/To-Date and click "Generate Excel Report" → a 5-column `.xlsx` downloads.
- Add a new branch and product → they appear in the dropdowns and the workbook.
