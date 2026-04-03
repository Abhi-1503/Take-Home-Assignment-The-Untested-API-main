# Bug Report

---

## Bug 1 — `getPaginated`: off-by-one page offset

**File:** `src/services/taskService.js`

**Expected behavior:** `getPaginated(1, 10)` returns the first 10 tasks (items 1–10). `getPaginated(2, 10)` returns items 11–20.

**Actual behavior:** `getPaginated(1, 10)` starts at index `1 * 10 = 10`, returning items 11–20. Page 1 is effectively empty on stores with ≤10 items, and every page is shifted by one.

**Discovered:** Unit test `page 1 returns the first N items` failed — received 5 items starting at index 10 instead of 10 items from index 0.

**Root cause:**
```js
// Before (wrong)
const offset = page * limit;

// After (fixed)
const offset = (page - 1) * limit;
```

**Status: Fixed.**

---

## Bug 2 — `completeTask`: silently resets priority to `'medium'`

**File:** `src/services/taskService.js`

**Expected behavior:** Completing a task marks it `done` and records `completedAt`. The task's existing `priority` should be preserved.

**Actual behavior:** Completing any task — regardless of its priority — sets `priority` to `'medium'`. A `'high'` priority task silently becomes `'medium'` after completion.

**Discovered:** Unit test `preserves the original priority (not reset to medium)` failed. Created a task with `priority: 'high'`, called `completeTask`, received `priority: 'medium'` back.

**Root cause:**
```js
// Before (wrong)
const updated = {
  ...task,
  priority: 'medium',   // ← overwrites the actual priority
  status: 'done',
  completedAt: new Date().toISOString(),
};

// After (fixed) — line removed
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Status: Fixed.**

---

## Bug 3 — `getByStatus`: substring match instead of exact equality

**File:** `src/services/taskService.js`

**Expected behavior:** `getByStatus('todo')` returns only tasks whose `status` is exactly `'todo'`.

**Actual behavior:** Uses `t.status.includes(status)`, which is a substring match. Any status string containing the query as a substring would be returned. For example, `getByStatus('in')` would return `in_progress` tasks. More dangerously, a search string that is a substring of a valid status could return unexpected results.

**Discovered:** Code review. Confirmed with the test `returns empty array for invalid status` — while this particular test happened to pass (because `'nonexistent'` is not a substring of any valid status), the logic is semantically wrong. A search for `'do'` would match both `'todo'` and `'done'`.

**Root cause:**
```js
// Before (wrong)
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));

// After (fixed)
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

**Status: Fixed** (fixed alongside Bug 1 as a one-line change).

---

## Notes on additional concerns (not bugs per se)

- `getByStatus` at the route level has no validation — an invalid status value silently returns `[]` with a `200`. A `400` might be more appropriate.
- The `update` endpoint allows clients to overwrite `completedAt` and `createdAt` fields — there's no field whitelist.
- The in-memory store resets on server restart. If this ever moves toward persistence, `_reset` being exported is worth revisiting.
