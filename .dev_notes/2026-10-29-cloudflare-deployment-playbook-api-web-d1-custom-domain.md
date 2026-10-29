# Dev Note: End-to-End Cloudflare Deployment Playbook (API + Web + D1 + Custom Domains)

**Date:** 2026-10-29  
**Application Context:** Newly developed full-stack apps (e.g., `wistake`, `english-practices`, etc.) migrating from local dev (`localhost:5174`, `localhost:8789`) to production Cloudflare stack (Cloudflare Workers API + Cloudflare D1 Database + Cloudflare Pages Web + Custom Domains).

---

## 1. Cloudflare D1 Database Setup & Migrations

### 1.1 Pitfall: `database_id` cannot be a placeholder
When initializing locally, `wrangler.jsonc` often uses a placeholder:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "app-db",
    "database_id": "app-local-db", // ❌ Error 10021 on remote deploy!
    "migrations_dir": "migrations"
  }
]
```
Deploying with a dummy ID fails with:
`binding DB of type d1 must have a valid database_id specified [code: 10021]`.

### 1.2 Proper Procedure
1. **Create the remote D1 database via Wrangler:**
   ```bash
   npx wrangler d1 create <database-name>
   ```
   Save the returned `database_id` (UUID format, e.g. `e2286915-427e-48ce-87c3-4b9da088c660`).

2. **Update `wrangler.jsonc`:**
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "<database-name>",
       "database_id": "<real-d1-uuid>",
       "migrations_dir": "migrations"
     }
   ]
   ```

3. **Apply migrations to REMOTE Cloudflare D1:**
   ```bash
   npx wrangler d1 migrations apply <database-name> --remote
   ```

4. **Crucial Local Step:** Local SQLite path changes with `database_id`!
   Wrangler hashes `database_id` to store local SQLite data under `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`.  
   After updating `database_id` in `wrangler.jsonc`, you **must re-apply migrations locally** to prevent `SQLITE_ERROR: no such table: ...`:
   ```bash
   echo "y" | npx wrangler d1 migrations apply <database-name> --local
   ```

---

## 2. Cloudflare Secrets (Environment Variables)

### 2.1 The Issue
Local development reads `.dev.vars`, but `.dev.vars` is **never** uploaded during `wrangler deploy`. If your API code uses `c.env.GOOGLE_API_KEY` or `c.env.JWT_SECRET`, remote execution will throw missing-key errors (e.g. `服务器未配置 GOOGLE_API_KEY`).

### 2.2 Uploading Secrets
For non-interactive / CI / bash terminal setting:
```bash
printf "<SECRET_VALUE>" | npx wrangler secret put <SECRET_NAME>
```
Example:
```bash
printf "AIzaSy..." | npx wrangler secret put GOOGLE_API_KEY_FREE
printf "your_prod_jwt_secret" | npx wrangler secret put JWT_SECRET
```

---

## 3. Worker API Custom Domain Routing

### 3.1 Syntax Requirement in `wrangler.jsonc`
In Wrangler v3/v4+, Custom Domains on Workers:
- **MUST NOT** include wildcards `*` (e.g. `api.domain.com/*` is invalid).
- **MUST NOT** include URL paths (e.g. `api.domain.com/api` is invalid).
- **MUST** be just the hostname:
```jsonc
"routes": [
  {
    "pattern": "api.yourdomain.com",
    "custom_domain": true
  }
]
```

### 3.2 Deployment
```bash
npx wrangler deploy --minify
```
Cloudflare automatically manages the DNS record and SSL certificate for the custom domain (when the root domain is managed by Cloudflare DNS).

---

## 4. Frontend Web App (Pages) & API Integration

### 4.1 CORS & Loopback Block (`localhost:8789`)
**Symptom:**
```text
Access to fetch at 'http://localhost:8789/api/...' from origin 'https://app.pages.dev' 
has been blocked by CORS policy: Permission was denied for this request to access the loopback address space.
```
**Cause:**
Frontend build defaulted to `http://localhost:8789` because `VITE_API_BASE` was not populated for production builds.

### 4.2 Solution: Environment Configuration
1. Create `.env.production` in the web directory:
   ```env
   VITE_API_BASE=https://api.yourdomain.com
   ```
2. Consume in frontend API client:
   ```typescript
   const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8789";
   ```
3. When `vite build` runs during `npm run deploy`, Vite embeds `https://api.yourdomain.com`.

### 4.3 Git Hygiene
Add build artifacts to `.gitignore` before initial deployment:
```gitignore
dist/
*.tsbuildinfo
```

### 4.4 Deploy Frontend to Pages with Custom Domain
1. **Deploying the build folder:**
   ```bash
   wrangler pages deploy dist --project-name=<project-name> --commit-dirty=true
   ```
2. **Adding a Custom Domain to Cloudflare Pages:**
   Via Wrangler CLI:
   ```bash
   npx wrangler pages domain add <custom-domain.com> --project-name=<project-name>
   ```
   *(Or bind via Cloudflare Dashboard -> Workers & Pages -> `<project-name>` -> Custom domains).*

---

## 5. Quick Deployment Checklist for New Apps

| Step | Action | Command |
| :--- | :--- | :--- |
| **1. Create D1** | Provision remote database | `npx wrangler d1 create <name>` |
| **2. Config D1** | Paste UUID into `api/wrangler.jsonc` | `"database_id": "<uuid>"` |
| **3. Remote Migration** | Initialize remote tables | `npx wrangler d1 migrations apply <name> --remote` |
| **4. Local Migration** | Re-initialize local SQLite | `echo "y" \| npx wrangler d1 migrations apply <name> --local` |
| **5. Add Secrets** | Push production keys | `printf "<key>" \| npx wrangler secret put <NAME>` |
| **6. Custom Domain (API)** | Add route in `wrangler.jsonc` | `{"pattern": "api.domain.com", "custom_domain": true}` |
| **7. Deploy API** | Upload Worker | `npm run deploy --workspace=api` |
| **8. Config Web Env** | Point web to production API | Write `VITE_API_BASE=https://api.domain.com` in `.env.production` |
| **9. Deploy Web** | Build & deploy to Pages | `npm run deploy --workspace=web` |
| **10. Custom Domain (Web)** | Bind Pages domain | `npx wrangler pages domain add web.domain.com --project-name=<name>` |
