import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { setupTestDb, fakeUser, seed } from '../helpers/setup.js';
import { groupsRoutes } from '../../src/modules/groups/groups.routes.js';
import { meGroupsRoutes } from '../../src/modules/groups/meGroups.routes.js';
import { ObjectId } from 'mongodb';

const dbHandle = await setupTestDb();

let teacherA;
let teacherB;
let student;
let admin;
let groupA;
let studentId;

async function buildApp(user) {
  const app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = user;
  });
  await app.register(groupsRoutes, { prefix: '/api/v1' });
  await app.register(meGroupsRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

beforeAll(async () => {
  teacherA = fakeUser({ role: 'teacher' });
  teacherB = fakeUser({ role: 'teacher' });
  student = fakeUser({ role: 'student' });
  admin = fakeUser({ role: 'admin' });

  groupA = new ObjectId();
  studentId = new ObjectId();

  // Crear el estudiante en la colección users
  await seed(dbHandle.getDb(), 'users', [
    {
      _id: studentId,
      authUserId: 'auth-test-student',
      email: 'alumno@kinal.edu.gt',
      fullName: 'Alumno Test',
      role: 'student',
      institutionId: new ObjectId(teacherA.institutionId),
      status: 'active'
    }
  ]);

  await seed(dbHandle.getDb(), 'groups', [
    {
      _id: groupA,
      teacherId: new ObjectId(teacherA.userId),
      institutionId: new ObjectId(teacherA.institutionId),
      name: 'Grupo de A',
      schoolYear: '2026',
      studentIds: [studentId],
      status: 'active',
      deletedAt: null
    }
  ]);
});

afterAll(async () => {});

describe('GET /groups/:id/students', () => {
  it('docente dueño puede listar miembros → 200', async () => {
    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupA.toString()}/students`
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.members).toHaveLength(1);
    expect(body.members[0].fullName).toBe('Alumno Test');
    await app.close();
  });

  it('docente ajeno NO puede listar miembros → 404', async () => {
    const app = await buildApp(teacherB);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupA.toString()}/students`
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('estudiante NO puede listar miembros → 403', async () => {
    const app = await buildApp(student);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/groups/${groupA.toString()}/students`
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

describe('GET /me/groups', () => {
  it('estudiante ve sus grupos', async () => {
    const studentInGroup = {
      ...student,
      userId: studentId.toString()
    };
    const app = await buildApp(studentInGroup);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/groups'
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.groups[0].name).toBe('Grupo de A');
    await app.close();
  });

  it('estudiante sin grupos ve lista vacía', async () => {
    const otroStudent = fakeUser({ role: 'student' });
    const app = await buildApp(otroStudent);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/groups'
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
    await app.close();
  });

  it('docente NO puede usar /me/groups → 403', async () => {
    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/groups'
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

describe('POST /groups/:id/students con validaciones', () => {
  it('añade estudiante válido de la misma institución → 200', async () => {
    const newStudent = new ObjectId();
    await seed(dbHandle.getDb(), 'users', [
      {
        _id: newStudent,
        authUserId: 'auth-new',
        email: 'nuevo@kinal.edu.gt',
        fullName: 'Nuevo Alumno',
        role: 'student',
        institutionId: new ObjectId(teacherA.institutionId),
        status: 'active'
      }
    ]);

    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupA.toString()}/students`,
      payload: { studentIds: [newStudent.toString()] }
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.added).toContain(newStudent.toString());
    expect(body.rejected).toHaveLength(0);
    await app.close();
  });

  it('rechaza estudiante de otra institución → rejected[]', async () => {
    const otherInstitution = new ObjectId();
    const foreignStudent = new ObjectId();
    await seed(dbHandle.getDb(), 'users', [
      {
        _id: foreignStudent,
        authUserId: 'auth-foreign',
        email: 'ajeno@otra.edu.gt',
        fullName: 'Ajeno',
        role: 'student',
        institutionId: otherInstitution,
        status: 'active'
      }
    ]);

    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupA.toString()}/students`,
      payload: { studentIds: [foreignStudent.toString()] }
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rechaza usuario que no es estudiante', async () => {
    const teacherId = new ObjectId();
    await seed(dbHandle.getDb(), 'users', [
      {
        _id: teacherId,
        authUserId: 'auth-other-teacher',
        email: 'otro-docente@kinal.edu.gt',
        fullName: 'Otro Docente',
        role: 'teacher',
        institutionId: new ObjectId(teacherA.institutionId),
        status: 'active'
      }
    ]);

    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupA.toString()}/students`,
      payload: { studentIds: [teacherId.toString()] }
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rechaza más de 100 estudiantes en un request → 400', async () => {
    const manyIds = Array.from({ length: 101 }, () => new ObjectId().toString());
    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupA.toString()}/students`,
      payload: { studentIds: manyIds }
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('no duplica membresías existentes', async () => {
    const app = await buildApp(teacherA);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/groups/${groupA.toString()}/students`,
      payload: { studentIds: [studentId.toString()] }
    });
    // El estudiante ya está → merged.length === current.length → 400
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});