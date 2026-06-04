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
