# The Untested API — Assignment Submission

**Candidate Submission** | Node.js · Express · Jest · Supertest  
**Estimated Time:** 2 days | **Stack:** Node.js 18+, Express 4, Jest 29, Supertest 6

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Setup & Running](#3-setup--running)
4. [API Reference](#4-api-reference)
5. [Task Shape](#5-task-shape)
6. [Testing](#6-testing)
7. [Coverage Report](#7-coverage-report)
8. [Bugs Found](#8-bugs-found)
9. [Bug Fixed](#9-bug-fixed)
10. [New Feature — PATCH /tasks/:id/assign](#10-new-feature--patch-tasksidassign)
11. [Design Decisions](#11-design-decisions)
12. [What I'd Do Next](#12-what-id-do-next)
13. [Questions Before Shipping](#13-questions-before-shipping)

---

## 1. Project Overview

This is a take-home assignment submission for a small **Task Manager REST API**. The original codebase had no tests and contained several bugs. The work done in this submission:

- ✅ Wrote **72 tests** covering unit and integration layers
- ✅ Achieved **96% statement coverage** (exceeds the 80% target)
- ✅ Identified and documented **3 bugs**
- ✅ Fixed **all 3 bugs** (assignment required at least 1)
- ✅ Implemented the new **`PATCH /tasks/:id/assign`** endpoint with full validation and tests

---

## 2. Project Structure

```
submission/
│
├── ASSIGNMENT.md                  ← Original brief (untouched)
├── README.md                      ← This file
├── BUGS.md                        ← Detailed bug report
├── SUBMISSION.md                  ← Closing notes & design decisions
│
└── task-api/
    │
    ├── package.json               ← Dependencies & npm scripts
    ├── jest.config.js             ← Jest configuration
    │
    ├── src/
    │   ├── app.js                 ← Express app setup & error handler
    │   ├── routes/
    │   │   └── tasks.js           ← Route handlers  ✅ MODIFIED
    │   ├── services/
    │   │   └── taskService.js     ← Business logic + in-memory store  ✅ MODIFIED
    │   └── utils/
    │       └── validators.js      ← Input validation helpers
    │
    └── tests/
        └── tasks.test.js          ← Full test suite  ✅ NEW
```

### What changed vs the original

| File | Status | What changed |
|------|--------|--------------|
| `src/routes/tasks.js` | Modified | Added `PATCH /:id/assign` route |
| `src/services/taskService.js` | Modified | Fixed 3 bugs; added `assignTask()` function |
| `tests/tasks.test.js` | New | 72 tests — unit + integration |
| `BUGS.md` | New | Bug report for all 3 bugs |
| `SUBMISSION.md` | New | Closing notes |
| `README.md` | New | This file |
| All other files | Untouched | No changes made |

---

## 3. Setup & Running

### Prerequisites

- Node.js **18 or higher**
- npm

### Installation

```bash
# Unzip the submission
unzip task-api-submission.zip
cd submission/task-api

# Install dependencies
npm install
```

### Available Scripts

```bash
npm start          # Start the server on http://localhost:3000
npm test           # Run the full test suite
npm run coverage   # Run tests + generate coverage report
```

---

## 4. API Reference

The API is served at `http://localhost:3000`.

### Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| `GET` | `/tasks` | List all tasks | 200 |
| `GET` | `/tasks?status=todo` | Filter tasks by status | 200 |
| `GET` | `/tasks?page=1&limit=10` | Paginated task list | 200 |
| `POST` | `/tasks` | Create a new task | 201, 400 |
| `PUT` | `/tasks/:id` | Update a task (full update) | 200, 400, 404 |
| `DELETE` | `/tasks/:id` | Delete a task | 204, 404 |
| `PATCH` | `/tasks/:id/complete` | Mark a task as complete | 200, 404 |
| `GET` | `/tasks/stats` | Counts by status + overdue count | 200 |
| `PATCH` | `/tasks/:id/assign` | **Assign a task to a user** _(new)_ | 200, 400, 404 |

### Query Parameters for `GET /tasks`

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by exact status value | `?status=todo` |
| `page` | integer | Page number (1-indexed) | `?page=2` |
| `limit` | integer | Items per page (default: 10) | `?limit=5` |

> Note: `status` filtering and pagination are mutually exclusive in the current implementation. If `status` is present, it takes priority.

### Sample Requests

**Create a task**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Write tests", "priority": "high", "status": "in_progress"}'
```

**List tasks filtered by status**
```bash
curl "http://localhost:3000/tasks?status=todo"
```

**Paginate through all tasks**
```bash
curl "http://localhost:3000/tasks?page=1&limit=10"
```

**Mark a task complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```

**Assign a task**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alice"}'
```

**Get stats**
```bash
curl http://localhost:3000/tasks/stats
```

---

## 5. Task Shape

### Full Task Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Write integration tests",
  "description": "Cover all edge cases for the tasks API",
  "status": "in_progress",
  "priority": "high",
  "dueDate": "2025-12-31T00:00:00.000Z",
  "completedAt": null,
  "createdAt": "2025-06-01T09:00:00.000Z",
  "assignee": "Alice"
}
```

### Field Reference

| Field | Type | Required | Default | Valid Values |
|-------|------|----------|---------|--------------|
| `id` | UUID string | Auto-generated | — | — |
| `title` | string | ✅ Yes (on create) | — | Non-empty string |
| `description` | string | No | `""` | Any string |
| `status` | string | No | `"todo"` | `todo`, `in_progress`, `done` |
| `priority` | string | No | `"medium"` | `low`, `medium`, `high` |
| `dueDate` | ISO 8601 string or null | No | `null` | Valid date string or `null` |
| `completedAt` | ISO 8601 string or null | Auto-set | `null` | Set by `PATCH /complete` |
| `createdAt` | ISO 8601 string | Auto-generated | — | — |
| `assignee` | string | No | Unset | Set by `PATCH /assign` |

---

## 6. Testing

### Test Structure

The test suite is in `tests/tasks.test.js` and is organized into three layers:

```
tests/tasks.test.js
│
├── Unit Tests — taskService
│   ├── create         (3 tests)
│   ├── getAll         (3 tests)
│   ├── findById       (2 tests)
│   ├── getByStatus    (5 tests — includes substring-bug regression)
│   ├── getPaginated   (4 tests — includes offset-bug regression)
│   ├── getStats       (4 tests)
│   ├── update         (3 tests)
│   ├── remove         (2 tests)
│   └── completeTask   (3 tests — includes priority-reset regression)
│
├── Unit Tests — validators
│   ├── validateCreateTask   (10 tests)
│   └── validateUpdateTask   (4 tests)
│
└── Integration Tests — API routes (Supertest)
    ├── GET /tasks             (2 tests)
    ├── GET /tasks?status=     (3 tests)
    ├── GET /tasks?page=&limit=(2 tests)
    ├── GET /tasks/stats       (3 tests)
    ├── POST /tasks            (5 tests)
    ├── PUT /tasks/:id         (3 tests)
    ├── DELETE /tasks/:id      (2 tests)
    ├── PATCH /:id/complete    (3 tests)
    └── PATCH /:id/assign      (6 tests)
```

### Test Count Summary

| Layer | Test Groups | Tests |
|-------|------------|-------|
| Unit — taskService | 9 describe blocks | 29 |
| Unit — validators | 2 describe blocks | 14 |
| Integration — API routes | 9 describe blocks | 29 |
| **Total** | **20 describe blocks** | **72** |

### Running Tests

```bash
# Run all tests
npm test

# Expected output (all passing):
# Tests: 72 passed, 72 total
# Test Suites: 1 passed, 1 total
```

---

## 7. Coverage Report

Run with: `npm run coverage`

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
-----------------|---------|----------|---------|---------|-------------------
All files        |   96.00 |    90.47 |   93.10 |   95.58 |
 src/            |   69.23 |    75.00 |    0.00 |   69.23 |
  app.js         |   69.23 |    75.00 |    0.00 |   69.23 | 10-11, 17-18
 src/routes/     |  100.00 |    92.59 |  100.00 |  100.00 |
  tasks.js       |  100.00 |    92.59 |  100.00 |  100.00 | 20-21
 src/services/   |  100.00 |    94.73 |  100.00 |  100.00 |
  taskService.js |  100.00 |    94.73 |  100.00 |  100.00 | 22
 src/utils/      |   91.30 |    88.23 |  100.00 |   91.30 |
  validators.js  |   91.30 |    88.23 |  100.00 |   91.30 | 28, 31
-----------------|---------|----------|---------|---------|-------------------
```

### Coverage by File

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| `app.js` | 69% | 75% | 0% | 69% |
| `routes/tasks.js` | **100%** | 93% | **100%** | **100%** |
| `services/taskService.js` | **100%** | 95% | **100%** | **100%** |
| `utils/validators.js` | 91% | 88% | **100%** | 91% |
| **Overall** | **96%** | **90%** | **93%** | **96%** |

### Notes on Uncovered Lines

- **`app.js` lines 10-11, 17-18** — The global error handler middleware and `app.listen()` call. These require triggering an unhandled Express error or starting a live server, both out of scope for unit/integration tests.
- **`tasks.js` lines 20-21** — A branch inside the stats route; minor edge path not worth a dedicated test.
- **`taskService.js` line 22** — The `dueDate` null-check branch in `getStats`; covered by other tests, this is a missed branch combination.
- **`validators.js` lines 28, 31** — Minor validator branches for `priority` and `status` on update with falsy values. Not impactful to cover.

All **business-critical paths** — every service function, every route handler, every validation rule — are fully covered.

---

## 8. Bugs Found

Three bugs were identified through code review and confirmed via failing tests.

---

### Bug 1 — `getPaginated`: Off-by-one page offset

**Location:** `src/services/taskService.js`, `getPaginated` function

**Severity:** High — page 1 always returns the wrong results

**Flow diagram:**

```
Client sends: GET /tasks?page=1&limit=10

                   ┌─────────────────────────────────────┐
                   │         getPaginated(1, 10)          │
                   └─────────────────────────────────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              │ BEFORE (buggy)          │ AFTER (fixed)      │
              │                         │                    │
              │ offset = page * limit   │ offset = (page-1)  │
              │        = 1 * 10         │         * limit    │
              │        = 10  ❌         │        = 0  ✅      │
              │                         │                    │
              │ tasks.slice(10, 20)     │ tasks.slice(0, 10) │
              │ → skips first 10 items  │ → correct page 1   │
              └─────────────────────────┴────────────────────┘
```

**Before (buggy):**
```javascript
const getPaginated = (page, limit) => {
  const offset = page * limit;           // ❌ page 1 → offset 10
  return tasks.slice(offset, offset + limit);
};
```

**After (fixed):**
```javascript
const getPaginated = (page, limit) => {
  const offset = (page - 1) * limit;    // ✅ page 1 → offset 0
  return tasks.slice(offset, offset + limit);
};
```

**Discovered by:** Unit test `page 1 returns the first N items` — expected 10 items starting at "Task 1", received 5 items starting at "Task 11".

---

### Bug 2 — `completeTask`: Silently resets priority to `'medium'`

**Location:** `src/services/taskService.js`, `completeTask` function

**Severity:** Medium — silent data loss on every task completion

**Flow diagram:**

```
Task before complete:     Task after complete:
┌─────────────────────┐   ┌─────────────────────┐
│ title:  "Ship it"   │   │ title:  "Ship it"   │
│ status: "todo"      │   │ status: "done"      │ ✅
│ priority: "high"    │──▶│ priority: "medium"  │ ❌ data lost!
│ completedAt: null   │   │ completedAt: "..."  │ ✅
└─────────────────────┘   └─────────────────────┘
```

**Before (buggy):**
```javascript
const updated = {
  ...task,
  priority: 'medium',    // ❌ overwrites the actual priority every time
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**After (fixed):**
```javascript
const updated = {
  ...task,               // ✅ priority preserved from the spread
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

**Discovered by:** Code review — the `priority: 'medium'` line in the spread stood out immediately. Confirmed by test `preserves the original priority (not reset to medium)`.

---

### Bug 3 — `getByStatus`: Substring match instead of exact equality

**Location:** `src/services/taskService.js`, `getByStatus` function

**Severity:** Medium — could return incorrect results for certain query strings

**Example of the problem:**

```
getByStatus("in")   →  matches "in_progress"  ❌ (should return [])
getByStatus("do")   →  matches "todo", "done" ❌ (should return [])
getByStatus("todo") →  matches "todo"         ✅ (accidentally correct)
```

**Before (buggy):**
```javascript
const getByStatus = (status) =>
  tasks.filter((t) => t.status.includes(status));  // ❌ substring match
```

**After (fixed):**
```javascript
const getByStatus = (status) =>
  tasks.filter((t) => t.status === status);         // ✅ exact match
```

**Discovered by:** Code review. The valid status values don't happen to be substrings of each other in a way that breaks the happy path — so this wouldn't surface in basic manual testing. A search for `"in"` or `"do"` would expose it.

---

### Bug Summary Table

| # | Function | Type | Severity | Fixed |
|---|----------|------|----------|-------|
| 1 | `getPaginated` | Off-by-one in offset calculation | High | ✅ Yes |
| 2 | `completeTask` | Unintentional priority reset to `'medium'` | Medium | ✅ Yes |
| 3 | `getByStatus` | Substring match instead of strict equality | Medium | ✅ Yes |

---

## 9. Bug Fixed

All 3 bugs were fixed. The assignment required fixing at least 1; fixing all 3 kept the test suite clean and complete without any "known failing" tests.

Each fix was minimal — a single line change per bug — deliberately scoped to not touch any surrounding logic:

```diff
// Bug 1 — getPaginated
- const offset = page * limit;
+ const offset = (page - 1) * limit;

// Bug 2 — completeTask
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };

// Bug 3 — getByStatus
- tasks.filter((t) => t.status.includes(status));
+ tasks.filter((t) => t.status === status);
```

---

## 10. New Feature — PATCH /tasks/:id/assign

### Endpoint Specification

```
PATCH /tasks/:id/assign
Content-Type: application/json

Body:  { "assignee": "string" }
```

### Request / Response Flow

```
Client                        Route Handler                 taskService
  │                               │                             │
  │  PATCH /tasks/:id/assign      │                             │
  │  { assignee: "Alice" }        │                             │
  │──────────────────────────────▶│                             │
  │                               │                             │
  │                    ┌──────────▼──────────┐                 │
  │                    │  Validate assignee  │                 │
  │                    │  - must be present  │                 │
  │                    │  - must be string   │                 │
  │                    │  - non-empty/spaces │                 │
  │                    └──────────┬──────────┘                 │
  │                               │                             │
  │              ┌────────────────┼─────────────────┐          │
  │              │ Invalid        │ Valid            │          │
  │              ▼                ▼                  │          │
  │         400 Bad         assignTask(id,           │          │
  │         Request         trimmed assignee)────────────────▶  │
  │◀─────────────           │                        │          │
  │                         │               ┌────────▼───────┐ │
  │                         │               │ Find task by id│ │
  │                         │               └────────┬───────┘ │
  │                         │                        │          │
  │                    ┌────┴────┐      ┌────────────┴──────┐  │
  │                    │Not found│      │ Task found        │  │
  │                    │  404    │      │ Update assignee   │  │
  │◀───────────────────│         │      │ Return updated    │  │
  │                    └─────────┘      └────────┬──────────┘  │
  │                                              │              │
  │◀─────────────────────────────────────────────│              │
  │  200 OK + updated task                       │              │
```

### Validation Rules

| Condition | Response |
|-----------|----------|
| `assignee` field missing from body | `400 Bad Request` |
| `assignee` is not a string (e.g. number) | `400 Bad Request` |
| `assignee` is empty or whitespace-only (`" "`) | `400 Bad Request` |
| Task with `:id` does not exist | `404 Not Found` |
| Task already has an assignee | `200 OK` — reassignment allowed |
| Valid assignee, task found | `200 OK` + updated task |

### Example Responses

**Success (200)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Write tests",
  "status": "todo",
  "priority": "high",
  "assignee": "Alice",
  "createdAt": "2025-06-01T09:00:00.000Z",
  "completedAt": null,
  "dueDate": null,
  "description": ""
}
```

**Validation error (400)**
```json
{
  "error": "assignee is required and must be a non-empty string"
}
```

**Not found (404)**
```json
{
  "error": "Task not found"
}
```

### Implementation

**`taskService.js` — new `assignTask` function:**
```javascript
const assignTask = (id, assignee) => {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated = { ...tasks[index], assignee };
  tasks[index] = updated;
  return updated;
};
```

**`routes/tasks.js` — new route handler:**
```javascript
router.patch('/:id/assign', (req, res) => {
  const { assignee } = req.body;

  if (!assignee || typeof assignee !== 'string' || assignee.trim() === '') {
    return res.status(400).json({
      error: 'assignee is required and must be a non-empty string'
    });
  }

  const task = taskService.assignTask(req.params.id, assignee.trim());
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(task);
});
```

### Tests for `/assign`

```
PATCH /tasks/:id/assign
  ✓ assigns a valid assignee and returns the updated task
  ✓ returns 404 when task does not exist
  ✓ returns 400 when assignee is missing
  ✓ returns 400 when assignee is an empty string
  ✓ returns 400 when assignee is not a string
  ✓ allows reassigning an already-assigned task
```

---

## 11. Design Decisions

### `/assign` endpoint

**Empty/whitespace strings → 400, not silent store**

An empty assignee has no meaningful value. Storing `""` or `"   "` would leave the task in an ambiguous state — it appears assigned, but isn't. Failing with `400` forces the caller to be intentional. This is also consistent with how the rest of the API handles missing required string fields (`title` on create returns `400` for empty strings for the same reason).

**Reassignment allowed (no 409 conflict)**

There's nothing in the spec restricting assignment to a one-time write. In most real task-management tools, reassigning work is routine — a `409 Conflict` would add friction without a clear product justification. Treating it as a plain update is simple and predictable. If the product requirement changes (e.g. "a task can only be assigned once"), a single validation check can be added.

**Assignee string is trimmed before storing**

`assignee.trim()` is applied before passing to `assignTask()`. This prevents `"  Alice  "` and `"Alice"` being stored as different assignees, which would cause subtle bugs in any downstream filtering or display logic. The `400` check happens before the trim, so a string of only spaces (`"   "`) is still rejected.

---

## 12. What I'd Do Next

If given more time, the next testing priorities would be:

**Concurrent writes stress test**
The in-memory store uses a plain JavaScript array. Two simultaneous requests that both find-and-splice the same index could corrupt state. Worth stress-testing with a tool like `autocannon` or `k6` to verify behavior under load.

**Field whitelist on `PUT /tasks/:id`**
Currently the update endpoint allows overwriting `createdAt`, `completedAt`, and `id` — protected fields clients shouldn't touch. Adding a whitelist would prevent silent data corruption.

**`dueDate: null` on update**
The update validator checks `dueDate` when it's a string, but a client can send `dueDate: null` to clear it. That path isn't explicitly tested and the behavior is worth pinning with a test.

**Stat accuracy after deletion**
Delete a task and confirm the stats endpoint reflects the removal correctly.

**`PATCH /assign` on a completed task**
Should a completed task be assignable? Reasonable either way, but the behavior should be a conscious decision locked in with a test.

---

## 13. Questions Before Shipping

Before this goes to production, I'd want answers to:

1. **What's the persistence story?**
The in-memory store resets on restart. Is that intentional (ephemeral test environment) or is a database integration planned? The answer changes what kinds of data integrity issues matter.

2. **Authentication and authorization?**
Right now any caller can delete, complete, or reassign any task. Is there a user or ownership model coming? If so, the `/assign` endpoint especially needs to be gated.

3. **Is the `priority` reset on complete intentional or a leftover?**
It looked like a clear bug (and was fixed), but it's worth confirming — one could imagine a workflow where completing a task "clears" its urgency deliberately.

4. **What are the pagination conventions expected by clients?**
Is page-1-first assumed, or does the frontend expect 0-indexed pages? Fixing the off-by-one could be a breaking change if clients were already compensating for the buggy behavior.

5. **Rate limiting and input size limits?**
There's no cap on `title` or `description` length, and no rate limiting on `POST /tasks`. Both are easy to add and important before any public-facing deployment.

---

*Submission prepared as part of the Take-Home Assignment: The Untested API.*
