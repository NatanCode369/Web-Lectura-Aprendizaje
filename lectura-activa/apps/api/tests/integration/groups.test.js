import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { groupsRoutes } from '../../src/modules/groups/groups.routes.js';

const dbHandle = await setupTestDb();

let app;
let teacher;

beforeAll(async () => {
  teacher = fakeUser({ role: 'teacher' });
  app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = teacher;
  });
  await app.register(groupsRoutes, { prefix: '/api/v1' });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('groups integration', () => {
  it('POST /groups crea un grupo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      payload: { name: '3° A', schoolYear: '2026' }
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('3° A');
    expect(body.teacherId.toString()).toBe(teacher.userId);
  });

  it('GET /groups lista sólo los del docente', async () => {
    await seed(dbHandle.getDb(), 'groups', [
      {
        name: 'Grupo mío',
        schoolYear: '2026',
        teacherId: teacher.userId,
        studentIds: [],
        status: 'active',
        deletedAt: null
      },
      {
        name: 'Grupo ajeno',
        schoolYear: '2026',
        teacherId: 'otro-docente',
        studentIds: [],
        status: 'active',
        deletedAt: null
      }
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/v1/groups' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].name).toBe('Grupo mío');
  });

  it('POST /groups/:id/students agrega estudiantes sin duplicar', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      payload: { name: 'Grupo X', schoolYear: '2026' }
    });
    const groupId = create.json()._id;

    const studentA = '507f1f77bcf86cd799439011';
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupId}/students`,
      payload: { studentIds: [studentA, studentA] }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().studentIds.length).toBe(1);
  });

  it('DELETE /groups/:id hace soft delete', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      payload: { name: 'Grupo a borrar', schoolYear: '2026' }
    });
    const groupId = create.json()._id;

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${groupId}`
    });
    expect(del.statusCode).toBe(200);

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupId}`
    });
    expect(get.statusCode).toBe(404);
  });
});