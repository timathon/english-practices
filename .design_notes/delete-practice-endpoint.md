# Delete Single Practice Endpoint

Added `DELETE /api/admin/practices/:id` to the API for removing individual practices without clearing the entire DB.

## Endpoint

```
DELETE /api/admin/practices/:id
```

### Path Parameters

| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | The practice ID     |

### Authentication

Requires admin session cookie.

### Response

```json
{ "success": true }
```

### Example

```bash
# Authenticate first, then delete
curl -X DELETE "https://epapi.vibequizzing.com/api/admin/practices/A5B_a5b-uz1_a5b-uz1-test" \
  -H "Cookie: <session-cookie>"
```

## Practice ID Format

The practice ID follows the pattern:

```
{TEXTBOOK}_{UNIT}_{TYPE}
```

For JSON file `data/A5B/a5b-uz/a5b-uz-test1.json`, the ID is:

```
A5B_a5b-uz_a5b-uz-test1
```

The path separators `/` become `_`, and the `.json` extension is stripped.

## Code Location

`api/src/index.ts` — line 734 (after the existing bulk delete endpoint).
