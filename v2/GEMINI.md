# V2 Frontend Guidelines

## V2 Version Badge

**File:** `v2/src/App.tsx`

Whenever making a git commit that includes changes to files under the `v2/` or `v2-api/` directories (excluding auto-generated files like `v2/public/textbooks.json`), **update the version badge** at the bottom of the `Navigation` component (`nav-menu`) before committing. The badge is a `<div>` with the format:

```
vYYMMDD-HHMM
```

Update it to the **current local date and time** at the moment of the commit (e.g., `v260521-2310`). This allows verifying whether the Cloudflare deployment is serving the latest build.

> [!NOTE]
> If only data JSON files under the `v2-data/` directory are modified, there is no need to update the version badge, rebuild, or redeploy the client app, as the V2 application fetches all exercise content dynamically from the seeded database.

