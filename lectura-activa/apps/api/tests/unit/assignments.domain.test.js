import { describe, it, expect } from 'vitest';
import {
  assertReadingPublished,
  assertDatesValid,
  assertAssignmentIsOpen,
  buildActivitySnapshot
} from '../../src/modules/assignments/assignments.domain.js';
import { ValidationError, ConflictError } from '../../src/shared/errors/index.js';

describe('assignments.domain', () => {
  describe('assertReadingPublished', () => {
    it('pasa si la lectura está publicada', () => {
      expect(() => assertReadingPublished({ status: 'published' })).not.toThrow();
    });

    it('falla si la lectura es draft', () => {
      expect(() => assertReadingPublished({ status: 'draft' })).toThrow(ValidationError);
    });

    it('falla si la lectura es null', () => {
      expect(() => assertReadingPublished(null)).toThrow(ValidationError);
    });
  });

  describe('assertDatesValid', () => {
    it('pasa si dueAt es posterior a availableFrom', () => {
      expect(() =>
        assertDatesValid('2026-01-01', '2026-01-15')
      ).not.toThrow();
    });

    it('falla si dueAt es igual a availableFrom', () => {
      expect(() =>
        assertDatesValid('2026-01-01', '2026-01-01')
      ).toThrow(ValidationError);
    });

    it('falla si dueAt es anterior a availableFrom', () => {
      expect(() =>
        assertDatesValid('2026-01-15', '2026-01-01')
      ).toThrow(ValidationError);
    });
  });

  describe('assertAssignmentIsOpen', () => {
    const base = {
      status: 'published',
      availableFrom: new Date('2026-01-01T00:00:00Z'),
      dueAt: new Date('2026-12-31T23:59:59Z')
    };

    it('pasa si estamos dentro del rango', () => {
      const now = new Date('2026-06-15T12:00:00Z');
      expect(() => assertAssignmentIsOpen(base, now)).not.toThrow();
    });

    it('falla si no está publicada', () => {
      expect(() =>
        assertAssignmentIsOpen({ ...base, status: 'draft' })
      ).toThrow(ConflictError);
    });

    it('falla si aún no empieza', () => {
      const now = new Date('2025-12-31T23:59:59Z');
      expect(() => assertAssignmentIsOpen(base, now)).toThrow(ConflictError);
    });

    it('falla si ya venció', () => {
      const now = new Date('2027-01-01T00:00:01Z');
      expect(() => assertAssignmentIsOpen(base, now)).toThrow(ConflictError);
    });
  });

  describe('buildActivitySnapshot', () => {
    it('copia sólo los campos necesarios', () => {
      const reading = {
        activities: [
          {
            activityId: 'a1',
            type: 'multiple_choice',
            prompt: '¿Capital de Francia?',
            options: ['París', 'Londres'],
            correctAnswer: 'París',
            points: 2,
            order: 1,
            _id: 'ignored',
            extraField: 'ignored'
          }
        ]
      };
      const snap = buildActivitySnapshot(reading);
      expect(snap).toEqual([
        {
          activityId: 'a1',
          type: 'multiple_choice',
          prompt: '¿Capital de Francia?',
          options: ['París', 'Londres'],
          correctAnswer: 'París',
          points: 2,
          order: 1
        }
      ]);
      expect(snap[0]).not.toHaveProperty('extraField');
    });

    it('devuelve arreglo vacío si no hay actividades', () => {
      expect(buildActivitySnapshot({})).toEqual([]);
      expect(buildActivitySnapshot({ activities: null })).toEqual([]);
    });

    it('usa puntos por defecto 1 si no viene el campo', () => {
      const snap = buildActivitySnapshot({
        activities: [{ activityId: 'a', type: 'true_false' }]
      });
      expect(snap[0].points).toBe(1);
    });

    it('usa activityId derivado de _id si no viene', () => {
      const snap = buildActivitySnapshot({
        activities: [{ _id: 'from-id', type: 'true_false' }]
      });
      expect(snap[0].activityId).toBe('from-id');
    });
  });
  describe('buildActivitySnapshot — ordering y matching', () => {
  it('incluye items para ordering', () => {
    const reading = {
      activities: [
        {
          activityId: 'o1',
          type: 'ordering',
          prompt: 'Ordena',
          items: ['A', 'B', 'C'],
          correctAnswer: ['A', 'B', 'C'],
          points: 3
        }
      ]
    };
    const snap = buildActivitySnapshot(reading);
    expect(snap[0].items).toEqual(['A', 'B', 'C']);
  });

  it('incluye pairs para matching', () => {
    const reading = {
      activities: [
        {
          activityId: 'm1',
          type: 'matching',
          prompt: 'Empareja',
          pairs: [{ left: 'x', right: 'y' }],
          correctAnswer: [{ left: 'x', right: 'y' }],
          points: 4
        }
      ]
    };
    const snap = buildActivitySnapshot(reading);
    expect(snap[0].pairs).toEqual([{ left: 'x', right: 'y' }]);
  });
});
});