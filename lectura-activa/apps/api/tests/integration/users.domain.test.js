import { describe, it, expect } from 'vitest';
import {
  pickEditableFields,
  buildNewUserDoc,
  validateProfileSize,
  activeUserFilter,
} from '../../../lectura-activa/apps/api/src/modules/users/users.domain.js';

describe('users.domain — pickEditableFields', () => {
  it('permite fullName', () => {
    expect(pickEditableFields({ fullName: 'Ana' })).toEqual({ fullName: 'Ana' });
  });

  it('permite profile', () => {
    const payload = { profile: { avatarUrl: 'https://x.test/a.png' } };
    expect(pickEditableFields(payload)).toEqual(payload);
  });

  it('rechaza role con FORBIDDEN_FIELDS y statusCode 400', () => {
    try {
      pickEditableFields({ role: 'admin' });
      throw new Error('no debió llegar');
    } catch (err) {
      expect(err.code).toBe('FORBIDDEN_FIELDS');
      expect(err.statusCode).toBe(400);
      expect(err.message).toMatch(/role/);
    }
  });

  it('rechaza email', () => {
    expect(() => pickEditableFields({ email: 'x@y.z' })).toThrow(/email/);
  });

  it('rechaza institutionId', () => {
    expect(() => pickEditableFields({ institutionId: 'abc' })).toThrow(/institutionId/);
  });

  it('rechaza authUserId', () => {
    expect(() => pickEditableFields({ authUserId: 'sub' })).toThrow(/authUserId/);
  });

  it('acepta payload vacío sin quejarse', () => {
    expect(pickEditableFields({})).toEqual({});
  });
});

describe('users.domain — buildNewUserDoc', () => {
  const base = {
    authUserId: 'sub-123',
    email: 'Ana@Colegio.EDU.gt',
    fullName: 'Ana',
    institutionId: '000000000000000000000001',
    role: 'student',
  };

  it('normaliza email a minúsculas', () => {
    expect(buildNewUserDoc(base).email).toBe('ana@colegio.edu.gt');
  });

  it('aplica status active y deletedAt null', () => {
    const doc = buildNewUserDoc(base);
    expect(doc.status).toBe('active');
    expect(doc.deletedAt).toBeNull();
  });

  it('crea un profile vacío por defecto', () => {
    const doc = buildNewUserDoc(base);
    expect(doc.profile).toEqual({ avatarUrl: null, preferences: {} });
  });

  it('trunca fullName a 120 caracteres', () => {
    const doc = buildNewUserDoc({ ...base, fullName: 'a'.repeat(200) });
    expect(doc.fullName.length).toBe(120);
  });

  it('lanza si falta authUserId', () => {
    expect(() => buildNewUserDoc({ ...base, authUserId: undefined })).toThrow(/authUserId/);
  });

  it('lanza si falta institutionId', () => {
    expect(() => buildNewUserDoc({ ...base, institutionId: undefined })).toThrow(/institutionId/);
  });
});

describe('users.domain — validateProfileSize', () => {
  it('acepta perfil pequeño', () => {
    expect(validateProfileSize({ avatarUrl: 'x' })).toBe(true);
  });

  it('acepta undefined/null', () => {
    expect(validateProfileSize(undefined)).toBe(true);
    expect(validateProfileSize(null)).toBe(true);
  });

  it('rechaza perfil mayor de 8 KB', () => {
    const huge = { preferences: { data: 'x'.repeat(9 * 1024) } };
    try {
      validateProfileSize(huge);
      throw new Error('no debió llegar');
    } catch (err) {
      expect(err.code).toBe('PROFILE_TOO_LARGE');
      expect(err.statusCode).toBe(400);
    }
  });
});

describe('users.domain — activeUserFilter', () => {
  it('devuelve el filtro estándar', () => {
    expect(activeUserFilter()).toEqual({ status: 'active', deletedAt: null });
  });
});