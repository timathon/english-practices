# Dev Note: Local Database Identity & Storage Paths

## The Issue
When deploying or configuring Cloudflare D1, changing the `database_id` in `wrangler.jsonc` (or `wrangler.toml`) has a critical side effect on local development.

Wrangler uses the `database_id` to generate the file path for the local SQLite database.
**Path format:** `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash_of_db_id>.sqlite`

### What happened:
1.  Original ID: `"dummy-id"` -> Data stored in `60eed4bb....sqlite`.
2.  New ID: `"b63b4908...."` -> Wrangler looked for `b8090fb8....sqlite`.
3.  Because the second file didn't exist, Wrangler created a **fresh, empty database**.
4.  To the developer, it looks like all data was wiped, but it actually still exists in the old `.sqlite` file under the old ID's hash.

## Recovery Procedures

### 1. Re-seeding Static Data
If the data is generated from local files (like our textbook JSONs), run the seeding script:
```bash
node scripts/seed_practices.cjs
```

### 2. Manual User Recovery (Corrupt Files)
If the old database file becomes corrupted (e.g., `SQLITE_CORRUPT`), standard SQL tools may fail. Use `strings` to scavenge data:
```bash
# Find user IDs and emails
strings path/to/corrupt.sqlite | grep "@system.local"

# Find practice records by User ID
strings path/to/corrupt.sqlite | grep "TARGET_USER_ID"
```
Re-insert the scavenged data manually using `wrangler d1 execute --local`.

### 3. Schema Alignment
A fresh local database might skip intermediate migrations if the migration history is inconsistent. Check for missing columns:
```bash
npx wrangler d1 execute <db-name> --local --command "PRAGMA table_info(table_name);"
```
If a column like `updatedAt` is missing, add it manually:
```sql
ALTER TABLE table_name ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0;
```

## Prevention
- Avoid changing `database_id` in `wrangler.jsonc` once development has started.
- If a change is necessary, manually rename the `.sqlite` file in `.wrangler/state` to the new hash expected by Wrangler.
- Regularly backup the `.wrangler` folder.
