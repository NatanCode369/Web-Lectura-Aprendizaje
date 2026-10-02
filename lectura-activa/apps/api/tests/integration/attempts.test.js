import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { attemptsRoutes } from '../../src/modules/attempts/attempts.routes.js';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'node:crypto';

const dbHandle = await setupTestDb();

let app;
let student;
let assignmentId;
let studentAssignmentId;

beforeAll(async () => {
  student = fakeUser({ role: 'student' });
  assignmentId = new ObjectId();
  studentAssignmentId = new ObjectId();

  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await seed(dbHandle.getDb(), 'assignments', [
    {
      _id: assignmentId,
      readingId: new ObjectId(),
      groupId: new ObjectId(),
      teacherId: 'otro',
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
    }
  ]);

  await seed(dbHandle.getDb(), 'studentAssignments', [
    {
      _id: studentAssignmentId,
      assignmentId,
      studentId: student.userId,
      status: 'pending',
      score: 0,
      timeSpentSeconds: 0,
      activityProgress: []
    }
  ]);

  app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = student;
  });
  await app.register(attemptsRoutes, { prefix: '/api/v1' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('attempts integration', () => {
  it('POST /start abre la tarea', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId.toString()}/start`,
      payload: { requestId: randomUUID() }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().studentAssignment.status).toBe('in_progress');
  });

  it('POST /attempts guarda intento y actualiza progreso', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId.toString()}/attempts`,
      payload: {
        requestId: randomUUID(),
        activityId: 'a1',
        answers: { choice: 'B' },
        timeSpentSeconds: 30
      }
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.attempt.score).toBe(5);
    expect(body.studentAssignment.status).toBe('completed');
    expect(body.studentAssignment.score).toBe(5);
  });

  it('POST /attempts con mismo requestId es idempotente', async () => {
    const requestId = randomUUID();
    const payload = {
      requestId,
      activityId: 'a1',
      answers: { choice: 'B' },
      timeSpentSeconds: 10
    };

    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId.toString()}/attempts`,
      payload
    });

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId.toString()}/attempts`,
      payload
    });

    // La primera ya cerró la tarea, así que la segunda debe recibir conflicto de "completada"
    // o ser marcada como duplicada. Verificamos que no se crearon dos intentos.
    const attempts = await dbHandle
      .getDb()
      .collection('activityAttempts')
      .find({ requestId })
      .toArray();
    expect(attempts.length).toBe(1);
  });

  it('rechaza intento en asignación vencida', async () => {
    const expiredId = new ObjectId();
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await seed(dbHandle.getDb(), 'assignments', [
      {
        _id: expiredId,
        status: 'published',
        availableFrom: new Date(past.getTime() - 1000),
        dueAt: past,
        activitySnapshot: [
          { activityId: 'a1', type: 'multiple_choice', correctAnswer: 'B', points: 5 }
        ]
      }
    ]);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${expiredId.toString()}/attempts`,
      payload: {
        requestId: randomUUID(),
        activityId: 'a1',
        answers: { choice: 'B' },
        timeSpentSeconds: 5
      }
    });
    expect(res.statusCode).toBe(409);
  });
});