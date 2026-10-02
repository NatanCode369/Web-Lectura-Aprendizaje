import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { analyticsRoutes } from '../../src/modules/analytics/analytics.routes.js';
import { runDailyAnalytics } from '../../src/modules/analytics/analytics.jobs.js';
import { ObjectId } from 'mongodb';

const dbHandle = await setupTestDb();

let app;
let teacher;
let groupId;
let assignmentId;

beforeAll(async () => {
  teacher = fakeUser({ role: 'teacher' });
  groupId = new ObjectId();
  assignmentId = new ObjectId();

  const now = new Date();
  const past = new Date(now.getTime() - 60 * 60 * 1000);
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await seed(dbHandle.getDb(), 'groups', [
    {
      _id: groupId,
      teacherId: teacher.userId,
      institutionId: teacher.institutionId,
      name: 'G1',
      schoolYear: '2026',
      studentIds: [],
      status: 'active',
      deletedAt: null
    }
  ]);

  await seed(dbHandle.getDb(), 'assignments', [
    {
      _id: assignmentId,
      readingId: new ObjectId(),
      groupId,
      teacherId: teacher.userId,
      status: 'published',
      availableFrom: past,
      dueAt: future,
      activitySnapshot: []
    }
  ]);

  await seed(dbHandle.getDb(), 'studentAssignments', [
    {
      assignmentId,
      studentId: '507f1f77bcf86cd799439011',
      status: 'completed',
      score: 8,
      timeSpentSeconds: 120,
      activityProgress: []
    },
    {
      assignmentId,
      studentId: '507f1f77bcf86cd799439012',
      status: 'completed',
      score: 10,
      timeSpentSeconds: 180,
      activityProgress: []
    },
    {
      assignmentId,
      studentId: '507f1f77bcf86cd799439013',
      status: 'pending',
      score: 0,
      timeSpentSeconds: 0,
      activityProgress: []
    }
  ]);

  app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = teacher;
  });
  await app.register(analyticsRoutes, { prefix: '/api/v1' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('analytics integration', () => {
  it('runDailyAnalytics hace upsert idempotente', async () => {
    const first = await runDailyAnalytics({});
    expect(first.processed).toBeGreaterThanOrEqual(1);

    const rows = await dbHandle
      .getDb()
      .collection('analyticsDaily')
      .find({ assignmentId })
      .toArray();

    expect(rows.length).toBe(1);
    expect(rows[0].assignedCount).toBe(3);
    expect(rows[0].completedCount).toBe(2);
    expect(rows[0].averageScore).toBe(9);

    // Correrlo de nuevo no debe duplicar
    await runDailyAnalytics({});
    const rowsAfter = await dbHandle
      .getDb()
      .collection('analyticsDaily')
      .find({ assignmentId })
      .toArray();
    expect(rowsAfter.length).toBe(1);
  });

  it('GET /analytics/groups/:groupId devuelve filas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/groups/${groupId.toString()}`
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.rows)).toBe(true);
  });
});