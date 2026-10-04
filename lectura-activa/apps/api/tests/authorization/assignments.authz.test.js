import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { assignmentsRoutes } from '../../src/modules/assignments/assignments.routes.js';
import { ObjectId } from 'mongodb';

const dbHandle = await setupTestDb();

let teacherA;
let teacherB;
let student;
let admin;
let groupA;
let readingPublished;

async function buildApp(user) {
  const app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = user;
  });
  await app.register(assignmentsRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

beforeAll(async () => {
  teacherA = fakeUser({ role: 'teacher' });
  teacherB = fakeUser({ role: 'teacher' });
  student = fakeUser({ role: 'student' });
  admin = fakeUser({ role: 'admin' });

  groupA = new ObjectId();
  readingPublished = new ObjectId();

  await seed(dbHandle.getDb(), 'groups', [
    {
      _id: groupA,
      teacherId: teacherA.userId,
      institutionId: teacherA.institutionId,
      name: 'Grupo de A',
      schoolYear: '2026',
      studentIds: [student.userId],
      status: 'active',
      deletedAt: null
    }
  ]);

  await seed(dbHandle.getDb(), 'readings', [
    {
      _id: readingPublished,
      institutionId: teacherA.institutionId,
      title: 'Lectura publicada',
      status: 'published',
      version: 1,
      activities: [
        { activityId: 'a1', type: 'true_false', correctAnswer: 'true', points: 1 }
      ]
    }
  ]);
});

afterAll(async () => {});

describe('assignments authorization', () => {
  it('docente A puede crear asignación en su grupo', async () => {
    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: readingPublished.toString(),
        groupId: groupA.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it('docente B NO puede crear asignación en grupo de A → 403', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: readingPublished.toString(),
        groupId: groupA.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('docente B NO puede ver asignación de A → 404', async () => {
    // Creamos una asignación de A
    const appA = await buildApp(teacherA);
    const created = await appA.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: readingPublished.toString(),
        groupId: groupA.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    const assignmentId = created.json()._id;
    await appA.close();

    const appB = await buildApp(teacherB);
    const res = await appB.inject({
      method: 'GET',
      url: `/api/v1/assignments/${assignmentId}`
    });
    expect(res.statusCode).toBe(404);
    await appB.close();
  });

  it('docente B NO puede cerrar asignación de A → 404', async () => {
    const appA = await buildApp(teacherA);
    const created = await appA.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: readingPublished.toString(),
        groupId: groupA.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    const assignmentId = created.json()._id;
    await appA.close();

    const appB = await buildApp(teacherB);
    const res = await appB.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/close`
    });
    expect(res.statusCode).toBe(404);
    await appB.close();
  });

  it('estudiante NO puede listar asignaciones (solo docente/admin) → 403', async () => {
    const app = await buildApp(student);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assignments'
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('estudiante NO puede crear asignación → 403', async () => {
    const app = await buildApp(student);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      payload: {
        readingId: readingPublished.toString(),
        groupId: groupA.toString(),
        availableFrom: '2026-01-01T00:00:00Z',
        dueAt: '2026-02-01T00:00:00Z'
      }
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('admin puede listar asignaciones dentro de su institución', async () => {
    const app = await buildApp(admin);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assignments'
    });
    // El admin tiene rol permitido; lo que ve depende del filtro por teacherId
    // del repositorio, pero la autorización de rol debe pasar (no 403).
    expect(res.statusCode).not.toBe(403);
    await app.close();
  });
});