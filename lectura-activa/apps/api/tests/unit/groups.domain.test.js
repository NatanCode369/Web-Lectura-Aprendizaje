import { describe, it, expect } from 'vitest';
import {
  assertGroupName,
  assertCanArchive,
  assertStudentsFit,
  assertGroupBelongsToTeacher
} from '../../src/modules/groups/groups.domain.js';
import { ValidationError, ConflictError } from '../../src/shared/errors/index.js';

describe('groups.domain', () => {
  describe('assertGroupName', () => {
    it('acepta un nombre válido', () => {
      expect(() => assertGroupName('3° A')).not.toThrow();
    });

    it('rechaza nombre vacío', () => {
      expect(() => assertGroupName('')).toThrow(ValidationError);
    });

    it('rechaza nombre de un solo carácter', () => {
      expect(() => assertGroupName('A')).toThrow(ValidationError);
    });

    it('rechaza undefined', () => {
      expect(() => assertGroupName(undefined)).toThrow(ValidationError);
    });
  });

  describe('assertCanArchive', () => {
    it('permite archivar un grupo activo', () => {
      expect(() => assertCanArchive({ status: 'active' })).not.toThrow();
    });

    it('rechaza archivar un grupo ya archivado', () => {
      expect(() => assertCanArchive({ status: 'archived' })).toThrow(ConflictError);
    });
  });

  describe('assertStudentsFit', () => {
    it('devuelve la unión sin duplicados', () => {
      const result = assertStudentsFit(['a', 'b'], ['b', 'c']);
      expect(result.sort()).toEqual(['a', 'b', 'c']);
    });

    it('acepta llegar justo al límite de 500', () => {
      const current = Array.from({ length: 499 }, (_, i) => `s${i}`);
      expect(() => assertStudentsFit(current, ['nuevo'])).not.toThrow();
    });

    it('rechaza superar 500 estudiantes embebidos', () => {
      const current = Array.from({ length: 500 }, (_, i) => `s${i}`);
      expect(() => assertStudentsFit(current, ['nuevo'])).toThrow(ConflictError);
    });
  });

  describe('assertGroupBelongsToTeacher', () => {
    it('pasa si coincide el docente', () => {
      const group = { teacherId: { toString: () => 'teacher-1' } };
      expect(() => assertGroupBelongsToTeacher(group, 'teacher-1')).not.toThrow();
    });

    it('falla si el docente es distinto', () => {
      const group = { teacherId: { toString: () => 'teacher-2' } };
      expect(() => assertGroupBelongsToTeacher(group, 'teacher-1')).toThrow(ConflictError);
    });
  });
});