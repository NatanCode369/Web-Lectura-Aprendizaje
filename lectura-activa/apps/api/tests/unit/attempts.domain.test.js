import { describe, it, expect } from 'vitest';
import {
  scoreAnswer,
  findActivityInSnapshot,
  buildProgressEntry
} from '../../src/modules/attempts/attempts.domain.js';
import { ValidationError } from '../../src/shared/errors/index.js';

describe('attempts.domain', () => {
  describe('scoreAnswer', () => {
    it('multiple_choice: acierta', () => {
      const activity = { type: 'multiple_choice', correctAnswer: 'B', points: 5 };
      expect(scoreAnswer(activity, { choice: 'B' })).toBe(5);
    });

    it('multiple_choice: falla', () => {
      const activity = { type: 'multiple_choice', correctAnswer: 'B', points: 5 };
      expect(scoreAnswer(activity, { choice: 'A' })).toBe(0);
    });

    it('true_false: acierta', () => {
      const activity = { type: 'true_false', correctAnswer: 'true', points: 3 };
      expect(scoreAnswer(activity, { choice: 'true' })).toBe(3);
    });

    it('short_text: acierta ignorando mayúsculas y espacios', () => {
      const activity = { type: 'short_text', correctAnswer: '  París ', points: 4 };
      expect(scoreAnswer(activity, { text: 'parís' })).toBe(4);
    });

    it('short_text: sin correctAnswer no auto-puntúa', () => {
      const activity = { type: 'short_text', correctAnswer: null, points: 4 };
      expect(scoreAnswer(activity, { text: 'lo que sea' })).toBe(0);
    });

    it('multi_select: sólo cuenta si coincide exactamente', () => {
      const activity = { type: 'multi_select', correctAnswer: ['a', 'b'], points: 6 };
      expect(scoreAnswer(activity, { choices: ['a', 'b'] })).toBe(6);
      expect(scoreAnswer(activity, { choices: ['a'] })).toBe(0);
      expect(scoreAnswer(activity, { choices: ['a', 'b', 'c'] })).toBe(0);
    });

    it('multi_select: ignora el orden', () => {
      const activity = { type: 'multi_select', correctAnswer: ['a', 'b'], points: 6 };
      expect(scoreAnswer(activity, { choices: ['b', 'a'] })).toBe(6);
    });

    it('ordering: exige orden exacto', () => {
      const activity = { type: 'ordering', correctAnswer: ['1', '2', '3'], points: 8 };
      expect(scoreAnswer(activity, { order: ['1', '2', '3'] })).toBe(8);
      expect(scoreAnswer(activity, { order: ['3', '2', '1'] })).toBe(0);
    });

    it('tipo desconocido lanza ValidationError', () => {
      const activity = { type: 'unknown', correctAnswer: null, points: 1 };
      expect(() => scoreAnswer(activity, {})).toThrow(ValidationError);
    });
  });

  describe('findActivityInSnapshot', () => {
    const snapshot = [
      { activityId: 'a1', type: 'multiple_choice' },
      { activityId: 'a2', type: 'true_false' }
    ];

    it('encuentra la actividad por id', () => {
      expect(findActivityInSnapshot(snapshot, 'a2').type).toBe('true_false');
    });

    it('acepta id numérico comparándolo como string', () => {
      expect(findActivityInSnapshot(snapshot, 'a1').activityId).toBe('a1');
    });

    it('lanza ValidationError si no existe', () => {
      expect(() => findActivityInSnapshot(snapshot, 'nope')).toThrow(ValidationError);
    });

    it('maneja snapshot nulo', () => {
      expect(() => findActivityInSnapshot(null, 'a1')).toThrow(ValidationError);
    });
  });

  describe('buildProgressEntry', () => {
    it('construye la entrada con los campos esperados', () => {
      const activity = { activityId: 'a1', points: 5 };
      const entry = buildProgressEntry(activity, { choice: 'B' }, 5, 2);
      expect(entry).toMatchObject({
        activityId: 'a1',
        status: 'completed',
        score: 5,
        maxScore: 5,
        attemptNumber: 2
      });
      expect(entry.submittedAt).toBeInstanceOf(Date);
    });
  });
});