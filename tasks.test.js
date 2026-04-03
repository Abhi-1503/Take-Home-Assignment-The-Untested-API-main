const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');
const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeTask = (overrides = {}) => ({
  title: 'Test Task',
  description: 'A test description',
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  ...overrides,
});

beforeEach(() => {
  taskService._reset();
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT TESTS — taskService
// ═══════════════════════════════════════════════════════════════════════════

describe('taskService', () => {
  // ── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('creates a task with required fields and sensible defaults', () => {
      const task = taskService.create({ title: 'Buy milk' });
      expect(task).toMatchObject({
        title: 'Buy milk',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: null,
        completedAt: null,
      });
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    it('stores provided optional fields', () => {
      const task = taskService.create({
        title: 'Ship it',
        description: 'Deploy to prod',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-12-31T00:00:00.000Z',
      });
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2025-12-31T00:00:00.000Z');
    });

    it('generates unique ids for each task', () => {
      const a = taskService.create({ title: 'A' });
      const b = taskService.create({ title: 'B' });
      expect(a.id).not.toBe(b.id);
    });
  });

  // ── getAll ───────────────────────────────────────────────────────────────
  describe('getAll', () => {
    it('returns empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('returns all created tasks', () => {
      taskService.create({ title: 'A' });
      taskService.create({ title: 'B' });
      expect(taskService.getAll()).toHaveLength(2);
    });

    it('returns a copy — mutating result does not affect the store', () => {
      taskService.create({ title: 'A' });
      const all = taskService.getAll();
      all.push({ id: 'fake' });
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('returns the task when found', () => {
      const task = taskService.create({ title: 'Find me' });
      expect(taskService.findById(task.id)).toEqual(task);
    });

    it('returns undefined when not found', () => {
      expect(taskService.findById('nonexistent-id')).toBeUndefined();
    });
  });

  // ── getByStatus ──────────────────────────────────────────────────────────
  describe('getByStatus', () => {
    beforeEach(() => {
      taskService.create({ title: 'Todo task', status: 'todo' });
      taskService.create({ title: 'In progress task', status: 'in_progress' });
      taskService.create({ title: 'Done task', status: 'done' });
    });

    it('returns only tasks with the exact matching status', () => {
      const result = taskService.getByStatus('todo');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Todo task');
    });

    it('returns in_progress tasks', () => {
      const result = taskService.getByStatus('in_progress');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('In progress task');
    });

    it('returns done tasks', () => {
      const result = taskService.getByStatus('done');
      expect(result).toHaveLength(1);
    });

    it('returns empty array for invalid status', () => {
      // BUG: currently uses .includes() which is a substring match.
      // "in_progress".includes("in") is true, so this currently returns
      // the in_progress task. After fix, it should return [].
      const result = taskService.getByStatus('nonexistent');
      expect(result).toHaveLength(0);
    });

    // Regression test for the substring-match bug
    it('does not return in_progress tasks when filtering by "do" (substring bug)', () => {
      // "in_progress".includes("do") is false, but this test guards the boundary.
      // The real risk: getByStatus("todo") matching "in_progress" via substring.
      // With the fix (strict equality), only exact matches should be returned.
      const result = taskService.getByStatus('todo');
      const hasInProgress = result.some((t) => t.status === 'in_progress');
      expect(hasInProgress).toBe(false);
    });
  });

  // ── getPaginated ─────────────────────────────────────────────────────────
  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it('page 1 returns the first N items', () => {
      // BUG: current implementation uses `page * limit` as offset,
      // so page 1 starts at index 10, not 0. After fix this should pass.
      const result = taskService.getPaginated(1, 10);
      expect(result).toHaveLength(10);
      expect(result[0].title).toBe('Task 1');
    });

    it('page 2 returns the next N items', () => {
      const result = taskService.getPaginated(2, 10);
      expect(result).toHaveLength(5);
      expect(result[0].title).toBe('Task 11');
    });

    it('returns empty array when page is beyond total', () => {
      const result = taskService.getPaginated(10, 10);
      expect(result).toHaveLength(0);
    });

    it('respects custom limit', () => {
      const result = taskService.getPaginated(1, 5);
      expect(result).toHaveLength(5);
    });
  });

  // ── getStats ─────────────────────────────────────────────────────────────
  describe('getStats', () => {
    it('returns zeroed counts when store is empty', () => {
      expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('counts tasks by status correctly', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'todo' });
      taskService.create({ title: 'C', status: 'in_progress' });
      taskService.create({ title: 'D', status: 'done' });
      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
    });

    it('counts overdue tasks (past dueDate, not done)', () => {
      taskService.create({ title: 'Overdue', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
      taskService.create({ title: 'Future', status: 'todo', dueDate: '2999-12-31T00:00:00.000Z' });
      taskService.create({ title: 'Done overdue', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    it('does not count done tasks as overdue even if dueDate passed', () => {
      taskService.create({ title: 'Done', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });
      expect(taskService.getStats().overdue).toBe(0);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────
  describe('update', () => {
    it('updates provided fields on an existing task', () => {
      const task = taskService.create({ title: 'Old title' });
      const updated = taskService.update(task.id, { title: 'New title', status: 'in_progress' });
      expect(updated.title).toBe('New title');
      expect(updated.status).toBe('in_progress');
    });

    it('returns null for a nonexistent id', () => {
      expect(taskService.update('nope', { title: 'X' })).toBeNull();
    });

    it('preserves untouched fields', () => {
      const task = taskService.create({ title: 'A', priority: 'high' });
      const updated = taskService.update(task.id, { title: 'B' });
      expect(updated.priority).toBe('high');
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('removes an existing task and returns true', () => {
      const task = taskService.create({ title: 'Delete me' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('returns false when task does not exist', () => {
      expect(taskService.remove('ghost-id')).toBe(false);
    });
  });

  // ── completeTask ─────────────────────────────────────────────────────────
  describe('completeTask', () => {
    it('sets status to done and records completedAt', () => {
      const task = taskService.create({ title: 'Finish me', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
    });

    it('returns null when task does not exist', () => {
      expect(taskService.completeTask('nope')).toBeNull();
    });

    it('preserves the original priority (not reset to medium)', () => {
      // BUG: current implementation forces priority to 'medium' on complete.
      // After fix, the original priority should be preserved.
      const task = taskService.create({ title: 'High priority', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      expect(completed.priority).toBe('high');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UNIT TESTS — validators
// ═══════════════════════════════════════════════════════════════════════════

describe('validators', () => {
  describe('validateCreateTask', () => {
    it('returns null for a valid minimal body', () => {
      expect(validateCreateTask({ title: 'Hello' })).toBeNull();
    });

    it('requires title', () => {
      expect(validateCreateTask({})).toBeTruthy();
    });

    it('rejects empty string title', () => {
      expect(validateCreateTask({ title: '   ' })).toBeTruthy();
    });

    it('rejects non-string title', () => {
      expect(validateCreateTask({ title: 42 })).toBeTruthy();
    });

    it('rejects invalid status', () => {
      expect(validateCreateTask({ title: 'X', status: 'pending' })).toBeTruthy();
    });

    it('accepts valid statuses', () => {
      for (const s of ['todo', 'in_progress', 'done']) {
        expect(validateCreateTask({ title: 'X', status: s })).toBeNull();
      }
    });

    it('rejects invalid priority', () => {
      expect(validateCreateTask({ title: 'X', priority: 'critical' })).toBeTruthy();
    });

    it('accepts valid priorities', () => {
      for (const p of ['low', 'medium', 'high']) {
        expect(validateCreateTask({ title: 'X', priority: p })).toBeNull();
      }
    });

    it('rejects a non-date dueDate string', () => {
      expect(validateCreateTask({ title: 'X', dueDate: 'not-a-date' })).toBeTruthy();
    });

    it('accepts a valid ISO dueDate', () => {
      expect(validateCreateTask({ title: 'X', dueDate: '2025-12-01T00:00:00.000Z' })).toBeNull();
    });
  });

  describe('validateUpdateTask', () => {
    it('returns null for an empty body (no changes)', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    it('rejects empty string title when provided', () => {
      expect(validateUpdateTask({ title: '' })).toBeTruthy();
    });

    it('accepts a valid title update', () => {
      expect(validateUpdateTask({ title: 'New name' })).toBeNull();
    });

    it('rejects invalid status', () => {
      expect(validateUpdateTask({ status: 'finished' })).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS — API routes via Supertest
// ═══════════════════════════════════════════════════════════════════════════

describe('API routes', () => {
  // ── GET /tasks ────────────────────────────────────────────────────────────
  describe('GET /tasks', () => {
    it('returns an empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all tasks', async () => {
      await request(app).post('/tasks').send({ title: 'Task A' });
      await request(app).post('/tasks').send({ title: 'Task B' });
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ── GET /tasks?status= ────────────────────────────────────────────────────
  describe('GET /tasks?status=', () => {
    beforeEach(async () => {
      await request(app).post('/tasks').send({ title: 'Todo 1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'IP 1', status: 'in_progress' });
      await request(app).post('/tasks').send({ title: 'Done 1', status: 'done' });
    });

    it('filters by status=todo', async () => {
      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('todo');
    });

    it('filters by status=in_progress', async () => {
      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns empty array for a nonexistent status', async () => {
      const res = await request(app).get('/tasks?status=unknown');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── GET /tasks?page=&limit= ───────────────────────────────────────────────
  describe('GET /tasks?page=&limit=', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 12; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }
    });

    it('page 1 returns first 10 tasks', async () => {
      const res = await request(app).get('/tasks?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(10);
      expect(res.body[0].title).toBe('Task 1');
    });

    it('page 2 returns remaining tasks', async () => {
      const res = await request(app).get('/tasks?page=2&limit=10');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  // ── GET /tasks/stats ──────────────────────────────────────────────────────
  describe('GET /tasks/stats', () => {
    it('returns all-zero stats on empty store', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });

    it('reflects created task counts', async () => {
      await request(app).post('/tasks').send({ title: 'T1', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'T2', status: 'in_progress' });
      const res = await request(app).get('/tasks/stats');
      expect(res.body.todo).toBe(1);
      expect(res.body.in_progress).toBe(1);
    });

    it('counts overdue tasks', async () => {
      await request(app).post('/tasks').send({
        title: 'Overdue',
        status: 'todo',
        dueDate: '2000-01-01T00:00:00.000Z',
      });
      const res = await request(app).get('/tasks/stats');
      expect(res.body.overdue).toBe(1);
    });
  });

  // ── POST /tasks ───────────────────────────────────────────────────────────
  describe('POST /tasks', () => {
    it('creates a task and returns 201 with the new task', async () => {
      const res = await request(app).post('/tasks').send({ title: 'New task' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New task');
      expect(res.body.id).toBeDefined();
    });

    it('rejects missing title with 400', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects empty title with 400', async () => {
      const res = await request(app).post('/tasks').send({ title: '' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid status with 400', async () => {
      const res = await request(app).post('/tasks').send({ title: 'X', status: 'pending' });
      expect(res.status).toBe(400);
    });

    it('stores all optional fields when provided', async () => {
      const res = await request(app).post('/tasks').send({
        title: 'Full task',
        description: 'desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-06-01T00:00:00.000Z',
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        description: 'desc',
        status: 'in_progress',
        priority: 'high',
      });
    });
  });

  // ── PUT /tasks/:id ────────────────────────────────────────────────────────
  describe('PUT /tasks/:id', () => {
    it('updates an existing task', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Old' });
      const id = created.body.id;

      const res = await request(app).put(`/tasks/${id}`).send({ title: 'New', status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New');
      expect(res.body.status).toBe('in_progress');
    });

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app).put('/tasks/nonexistent-id').send({ title: 'X' });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid status', async () => {
      const created = await request(app).post('/tasks').send({ title: 'T' });
      const res = await request(app).put(`/tasks/${created.body.id}`).send({ status: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /tasks/:id ─────────────────────────────────────────────────────
  describe('DELETE /tasks/:id', () => {
    it('deletes an existing task and returns 204', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Delete me' });
      const res = await request(app).delete(`/tasks/${created.body.id}`);
      expect(res.status).toBe(204);

      const listRes = await request(app).get('/tasks');
      expect(listRes.body).toHaveLength(0);
    });

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app).delete('/tasks/ghost-id');
      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /tasks/:id/complete ─────────────────────────────────────────────
  describe('PATCH /tasks/:id/complete', () => {
    it('marks a task as done and sets completedAt', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Finish me' });
      const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
    });

    it('returns 404 for nonexistent id', async () => {
      const res = await request(app).patch('/tasks/nope/complete');
      expect(res.status).toBe(404);
    });

    it('preserves the task priority after completing (bug regression)', async () => {
      const created = await request(app).post('/tasks').send({ title: 'High pri', priority: 'high' });
      const res = await request(app).patch(`/tasks/${created.body.id}/complete`);
      expect(res.body.priority).toBe('high');
    });
  });

  // ── PATCH /tasks/:id/assign ───────────────────────────────────────────────
  describe('PATCH /tasks/:id/assign', () => {
    it('assigns a valid assignee and returns the updated task', async () => {
      const created = await request(app).post('/tasks').send({ title: 'Assign me' });
      const res = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: 'Alice' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Alice');
    });

    it('returns 404 when task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/nonexistent/assign')
        .send({ assignee: 'Bob' });
      expect(res.status).toBe(404);
    });

    it('returns 400 when assignee is missing', async () => {
      const created = await request(app).post('/tasks').send({ title: 'T' });
      const res = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 when assignee is an empty string', async () => {
      const created = await request(app).post('/tasks').send({ title: 'T' });
      const res = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: '   ' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when assignee is not a string', async () => {
      const created = await request(app).post('/tasks').send({ title: 'T' });
      const res = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: 42 });
      expect(res.status).toBe(400);
    });

    it('allows reassigning an already-assigned task', async () => {
      const created = await request(app).post('/tasks').send({ title: 'T' });
      await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: 'Alice' });
      const res = await request(app)
        .patch(`/tasks/${created.body.id}/assign`)
        .send({ assignee: 'Bob' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Bob');
    });
  });
});
