# Submission Notes

## What I'd test next with more time

- **Concurrent writes** — the in-memory store uses a plain array. Two simultaneous requests that both read and splice the same index could corrupt state. Worth stress-testing with something like `autocannon` or `k6`.
- **Edge cases in `update`** — currently it allows overwriting `createdAt`, `completedAt`, and `id`. I'd add a field whitelist so clients can't mutate protected fields.
- **Invalid `dueDate` on update** — the update validator checks `dueDate` if present, but a client could send `dueDate: null` to clear it; that path isn't explicitly tested.
- **Stat accuracy after deletion** — delete a task and confirm stats reflect the removal correctly.
- **`PATCH /assign` on a completed task** — should that be allowed? Reasonable either way, but the behavior should be a conscious decision with a test to lock it in.

## What surprised me in the codebase

Two things jumped out immediately from a code read before running any tests:

1. **`completeTask` force-setting `priority: 'medium'`** — this looked wrong right away. Marking something done shouldn't erase its priority. It's the kind of bug that slips through because the happy-path smoke test (does it return `status: 'done'`?) passes fine.
2. **`getPaginated` using `page * limit`** — classic off-by-one. Page 1 in most pagination conventions is the first page, so the offset should be `(page - 1) * limit`. Using `page * limit` means page 1 always skips the first batch.

The `getByStatus` substring match was a subtler risk — it wouldn't surface easily in manual testing because the valid status values don't happen to be substrings of each other in problematic ways, but the logic is still incorrect.

## Questions I'd ask before shipping to production

1. **What's the persistence story?** The in-memory store resets on restart — is that intentional (e.g. ephemeral test environment), or is a database integration planned?
2. **Authentication / authorization?** Right now any caller can delete or complete any task. Is there a user/ownership model coming?
3. **Is the `priority` reset on complete intentional or a leftover?** It looked like a bug but worth confirming — could imagine a workflow where completing a task "clears" its urgency.
4. **What are the pagination conventions expected by clients?** Is page-1-first assumed, or does the frontend expect 0-indexed pages? Fixing this could be a breaking change if clients were already adapting to the buggy behavior.
5. **Rate limiting / input size limits?** There's no cap on `title` or `description` length, and no rate limiting on `POST /tasks`.

## `/assign` endpoint — design decisions

Assignee validation rejects empty or whitespace-only strings with a `400` rather than storing them silently. An empty assignee has no meaningful value — storing it would leave the task in an ambiguous state where it appears assigned but isn't. Failing loudly forces the caller to be intentional, and it's consistent with how the rest of the API handles missing required string fields (e.g. `title` on create).

Reassignment is allowed without a conflict error. There's no indication in the spec that an assignee is a one-time write, and in most task-management workflows reassigning work is routine — a `409` here would make the endpoint harder to use without a clear product reason for the restriction. Treating it as a plain update keeps the behavior simple and predictable.

Assignee strings are trimmed before being stored (`assignee.trim()`), so `"  Alice  "` is saved as `"Alice"`. This prevents whitespace variants of the same name being treated as different assignees, which would cause subtle bugs in any downstream filtering or display logic.
