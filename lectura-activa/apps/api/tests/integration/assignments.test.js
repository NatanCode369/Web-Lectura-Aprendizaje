import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { assignmentsRoutes } from '../../src/modules/assignments/assignments.routes.js';
import { ObjectId } from 'mongodb';

const dbHandle = await setupTestDb();

let app;
let teacher;
let readingId;
let groupId;

beforeAll(async () => {
  teacher = fakeUser({ role: 'teacher' });

  readingId = new ObjectId();
  groupId = new ObjectId();

  await seed(dbHandle.getDb(), 'readings', [
    {
      _id: readingId,
      institutionId: teacher.institutionId,
      title: 'El Quijote',
      status: 'published',
      version: 1,
      activities: [
        {
          activityId: 'a1',
          type: 'multiple_choice',
          prompt: '¿Autor?',
          options: ['Cervantes', 'Shakespeare'],
          correctAnswer: 'Cervantes',
          points: 5
        }
      ]
    }
  ]);

  await seed(dbHandle.getDb(), 'groups', [
    {
      _id: groupId,
      institutionId: teacher.institutionId,
      name: '3° A',
      schoolYear: '2026',
      teacherId: teacher.userId,
      studentIds: ['507f1f77bcf86cd799439011'],
      status: 'active',
      deletedAt: null
    }
  ]);

  app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = teacher;
  });
  await app.register(assignmentsRoutes, { prefix: '/api/v1' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('assignments integration', () => {
  it('POST /assignments crea con snapshot', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: readingId.toString(),
        groupId: groupId.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.activitySnapshot.length).toBe(1);
    expect(body.activitySnapshot[0].activityId).toBe('a1');
    expect(body.readingVersion).toBe(1);
  });

  it('rechaza asignar lectura en draft', async () => {
    const draftId = new ObjectId();
    await seed(dbHandle.getDb(), 'readings', [
      { _id: draftId, status: 'draft', activities: [], version: 1 }
    ]);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: draftId.toString(),
        groupId: groupId.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    expect(res.statusCode).toBe(422);
  });

  it('GET /assignments lista sólo del docente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assignments'
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.every((a) => a.teacherId.toString() === teacher.userId)).toBe(true);
  });

  it('POST /assignments/:id/close cierra la asignación', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: readingId.toString(),
        groupId: groupId.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    const id = created.json()._id;

    const closed = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${id}/close`
    });
    expect(closed.statusCode).toBe(200);
    expect(closed.json().status).toBe('closed');
  });
});