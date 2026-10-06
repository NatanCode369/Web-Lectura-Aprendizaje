import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { attemptsRoutes } from '../../src/modules/attempts/attempts.routes.js';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';

const dbHandle = await setupTestDb();

let studentA;
let studentB;
let teacher;
let admin;
let openAssignmentId;
let expiredAssignmentId;

async function buildApp(user) {
  const app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = user;
  });
  await app.register(attemptsRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

beforeAll(async () => {
  studentA = fakeUser({ role: 'student' });
  studentB = fakeUser({ role: 'student' });
  teacher = fakeUser({ role: 'teacher' });
  admin = fakeUser({ role: 'admin' });

  openAssignmentId = new ObjectId();
  expiredAssignmentId = new ObjectId();

  const now = new Date();
  const past = new Date(now.getTime() - 60 * 60 * 1000);
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const longPast = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  await seed(dbHandle.getDb(), 'assignments', [
    {
      _id: openAssignmentId,
      readingId: new ObjectId(),
      groupId: new ObjectId(),
      teacherId: teacher.userId,
      status: 'published',
      availableFrom: past,
      dueAt: future,
      readingVersion: 1,
      activitySnapshot: [
        {
          activityId: 'a1',
          type: 'multiple_choice',
          prompt: '¿?',
          options: ['A', 'B'],
          correctAnswer: 'B',
          points: 5
        }
      ]
    },
    {
      _id: expiredAssignmentId,
      readingId: new ObjectId(),
      groupId: new ObjectId(),
      teacherId: teacher.userId,
      status: 'published',
      availableFrom: longPast,
      dueAt: past,
      readingVersion: 1,
      activitySnapshot: [
        {
          activityId: 'a1',
          type: 'multiple_choice',
          correctAnswer: 'B',
          points: 5
        }
      ]
    }
  ]);

  // Sólo el estudiante A tiene studentAssignment en la asignación abierta
  await seed(dbHandle.getDb(), 'studentAssignments', [
    {
      assignmentId: openAssignmentId,
      studentId: studentA.userId,
      status: 'pending',
      score: 0,
      timeSpentSeconds: 0,
      activityProgress: []
    }
  ]);
});

afterAll(async () => {});

describe('attempts authorization', () => {
  it('estudiante A puede hacer start en su asignación', async () => {
    const app = await buildApp(studentA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${openAssignmentId.toString()}/start`,
      payload: { requestId: randomUUID() }
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('estudiante B (ajeno) NO puede enviar intento → 403', async () => {
    const app = await buildApp(studentB);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${openAssignmentId.toString()}/attempts`,
      payload: {
        requestId: randomUUID(),
        activityId: 'a1',
        answers: { choice: 'B' },
        timeSpentSeconds: 5
      }
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('estudiante NO puede enviar intento en asignación vencida → 409', async () => {
    // Creamos studentAssignment para A en la vencida
    await seed(dbHandle.getDb(), 'studentAssignments', [
      {
        assignmentId: expiredAssignmentId,
        studentId: studentA.userId,
        status: 'pending',
        score: 0,
        timeSpentSeconds: 0,
        activityProgress: []
      }
    ]);

    const app = await buildApp(studentA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${expiredAssignmentId.toString()}/attempts`,
      payload: {
        requestId: randomUUID(),
        activityId: 'a1',
        answers: { choice: 'B' },
        timeSpentSeconds: 5
      }
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it('docente NO puede enviar intentos (solo estudiantes) → 403', async () => {
    const app = await buildApp(teacher);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${openAssignmentId.toString()}/start`,
      payload: { requestId: randomUUID() }
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('admin NO puede enviar intentos → 403', async () => {
    const app = await buildApp(admin);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${openAssignmentId.toString()}/attempts`,
      payload: {
        requestId: randomUUID(),
        activityId: 'a1',
        answers: { choice: 'B' },
        timeSpentSeconds: 5
      }
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('estudiante ajeno a la asignación tampoco puede hacer start → 403', async () => {
    const app = await buildApp(studentB);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${openAssignmentId.toString()}/start`,
      payload: { requestId: randomUUID() }
    });
    // El start no requiere studentAssignment previo, pero sólo debe permitir
    // a estudiantes que pertenecen al grupo. Aquí studentB no está en el grupo,
    // por lo que el servicio debe rechazar (403 o 404 según implementación).
    expect([403, 404]).toContain(res.statusCode);
    await app.close();
  });
  it('el snapshot público NO expone correctAnswer', async () => {
  const app = await buildApp(studentA);
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/assignments/${openAssignmentId.toString()}/start`,
    payload: { requestId: randomUUID() }
  });
  expect(res.statusCode).toBe(200);
  const snapshot = res.json().activitySnapshot;
  for (const activity of snapshot) {
    expect(activity).not.toHaveProperty('correctAnswer');
  }
  await app.close();
});

it('start devuelve timeLimitMinutes', async () => {
  const app = await buildApp(studentA);
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/assignments/${openAssignmentId.toString()}/start`,
    payload: { requestId: randomUUID() }
  });
  expect(res.statusCode).toBe(200);
  expect(res.json().timeLimitMinutes).toBeDefined();
  await app.close();
});
});