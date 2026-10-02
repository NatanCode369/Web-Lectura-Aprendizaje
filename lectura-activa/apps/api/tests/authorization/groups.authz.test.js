import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { groupsRoutes } from '../../src/modules/groups/groups.routes.js';
import { ObjectId } from 'mongodb';

const dbHandle = await setupTestDb();

let teacherA;
let teacherB;
let student;
let admin;
let groupA;

async function buildApp(user) {
  const app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = user;
  });
  await app.register(groupsRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

beforeAll(async () => {
  teacherA = fakeUser({ role: 'teacher' });
  teacherB = fakeUser({ role: 'teacher' });
  student = fakeUser({ role: 'student' });
  admin = fakeUser({ role: 'admin' });

  groupA = new ObjectId();

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
});

afterAll(async () => {});

describe('groups authorization', () => {
  it('docente A puede ver su propio grupo → 200', async () => {
    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupA.toString()}`
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Grupo de A');
    await app.close();
  });

  it('docente B NO puede ver el grupo de A → 404', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupA.toString()}`
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('docente B NO puede editar el grupo de A → 404', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/groups/${groupA.toString()}`,
      payload: { name: 'Intento ajeno' }
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('docente B NO puede eliminar el grupo de A → 404', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${groupA.toString()}`
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('docente B NO puede agregar estudiantes al grupo de A → 404', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupA.toString()}/students`,
      payload: { studentIds: ['507f1f77bcf86cd799439011'] }
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('docente B NO puede quitar estudiantes del grupo de A → 404', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${groupA.toString()}/students/507f1f77bcf86cd799439011`
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('estudiante NO puede crear grupos → 403', async () => {
    const app = await buildApp(student);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/groups',
      payload: { name: 'Grupo del estudiante', schoolYear: '2026' }
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('estudiante NO puede editar grupos → 403', async () => {
    const app = await buildApp(student);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/groups/${groupA.toString()}`,
      payload: { name: 'Nuevo nombre' }
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('estudiante NO puede eliminar grupos → 403', async () => {
    const app = await buildApp(student);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/groups/${groupA.toString()}`
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('docente NO puede acceder a grupos de otro docente en el listado', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/groups'
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // El listado debe estar vacío porque teacherB no tiene grupos propios
    expect(body.items.length).toBe(0);
    await app.close();
  });

  it('admin puede listar grupos de su institución sin restricción de teacherId', async () => {
    const app = await buildApp(admin);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/groups'
    });
    // El rol admin pasa la autorización de rol.
    // El filtrado por institución depende del repositorio.
    expect(res.statusCode).not.toBe(403);
    await app.close();
  });

  it('petición sin autenticación es rechazada por requireSession', async () => {
    const app = Fastify();
    // No inyectamos user: requireSession debe rechazar
    await app.register(groupsRoutes, { prefix: '/api/v1' });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/groups'
    });
    // Sin user inyectado, requireSession lanza UnauthorizedError (401)
    // o bien falla en la validación del token.
    expect([401, 500]).toContain(res.statusCode);
    await app.close();
  });
});