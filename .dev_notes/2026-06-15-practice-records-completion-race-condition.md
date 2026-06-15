# 2026-06-15: Practice Records Completion Race Condition

## Overview
Resolved a race condition where completed practice challenges (e.g. Vocab Master, Sentence Architect, etc.) remained marked as unfinished in the D1 database (showing up as unfinished in the dashboard practice list), even when successfully completed.

## Technical Details

### The Issue
1. **Concurrent Requests**: When checking the answer to the final question, `checkAnswer` triggers an asynchronous PUT request to `/api/records/:id` with `unfinished: true` (since the game is not yet marked completed in the UI).
2. **Immediate Completion**: Clicking "Next" immediately transitions the game to the completed state, which triggers another PUT request to the same record ID with `unfinished: false`.
3. **Out-of-order execution**: Because both requests run asynchronously and concurrently, the first request (`unfinished: true`) sometimes finishes processing in the database *after* the second request (`unfinished: false`), leaving the database record incorrectly set to `unfinished: 1` (true).

---

## Resolutions

### 1. Backend API Protection
We modified the PUT handler `/api/records/:id` in [index.ts](file:///home/timathon/codes/smartedu/english-practices/api/src/index.ts) to check the database state:
- Once a record has been marked as finished (`unfinished = 0`), it is locked against subsequent updates that attempt to mark it unfinished.
- In addition, a completed record's score is prevented from being downgraded by older, late-arriving requests:

```ts
app.put('/api/records/:id', async (c) => {
  const auth = getCachedAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);

  const existing = await db.select().from(practiceRecords)
    .where(eq(practiceRecords.id, id));

  if (existing && existing.length > 0) {
    const record = existing[0];
    const isFinished = !record.unfinished;
    const nextUnfinished = isFinished ? false : (body.unfinished !== undefined ? body.unfinished : false);
    const nextScore = (isFinished && record.score > body.score) ? record.score : body.score;

    await db.update(practiceRecords).set({
        score: nextScore,
        unfinished: nextUnfinished,
        updatedAt: new Date()
    })
    .where(eq(practiceRecords.id, id));
  } else {
    // Fallback
    await db.update(practiceRecords).set({
        score: body.score,
        unfinished: body.unfinished !== undefined ? body.unfinished : false,
        updatedAt: new Date()
    })
    .where(eq(practiceRecords.id, id));
  }

  return c.json({ success: true });
})
```

### 2. Client-Side Ref-Based Guard
Added a `hasFinishedRef` guard to all shells that synchronize practice progress:
- `VocabMasterShell.tsx`
- `SentenceArchitectShell.tsx`
- `PassageDecoderShell.tsx`
- `GrammarWizardShell.tsx`
- `SpellingHeroShell.tsx`

Inside each shell:
- Declared the ref: `const hasFinishedRef = useRef(false)`
- Reset the ref when selecting a new challenge/section: `hasFinishedRef.current = false`
- Handled the guard inside `syncRecord`:
  ```ts
  if (isFinished) {
      hasFinishedRef.current = true
  } else if (hasFinishedRef.current) {
      return // Discard updates for already finished games
  }
  ```

### 3. Database Fix
Manually updated user `lxr`'s database entries that were affected by this bug:
```sql
update practice_records set unfinished = 0 where id in ('ac70840f-f036-4087-9b97-3bf8f177c50a', '99878115-8235-4ad2-95ec-815b19597cc1');
```
This restored the user's correct completion stats to `3/3`.
