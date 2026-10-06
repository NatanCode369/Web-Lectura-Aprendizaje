import { describe, it, expect } from 'vitest';
import {
  scoreAnswer,
  findActivityInSnapshot,
  buildProgressEntry
} from '../../src/modules/attempts/attempts.domain.js';
import { ValidationError } from '../../src/shared/errors/index.js';
import { toPublicSnapshot } from '../../src/modules/attempts/attempts.domain.js';

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
  describe('toPublicSnapshot', () => {
  it('excluye correctAnswer de cada actividad', () => {
    const snapshot = [
      {
        activityId: 'a1',
        type: 'multiple_choice',
        prompt: '¿?',
        options: ['A', 'B'],
        correctAnswer: 'B',
        points: 5,
        order: 0
      }
    ];
    const pub = toPublicSnapshot(snapshot);
    expect(pub[0]).not.toHaveProperty('correctAnswer');
    expect(pub[0].activityId).toBe('a1');
    expect(pub[0].options).toEqual(['A', 'B']);
  });

  it('preserva items para ordering y pairs para matching', () => {
    const snapshot = [
      { activityId: 'a1', type: 'ordering', items: ['1', '2'], points: 3 },
      { activityId: 'a2', type: 'matching', pairs: [{ left: 'x', right: 'y' }], points: 4 }
    ];
    const pub = toPublicSnapshot(snapshot);
    expect(pub[0].items).toEqual(['1', '2']);
    expect(pub[1].pairs).toEqual([{ left: 'x', right: 'y' }]);
  });

  it('devuelve [] si el snapshot no es arreglo', () => {
    expect(toPublicSnapshot(null)).toEqual([]);
    expect(toPublicSnapshot(undefined)).toEqual([]);
  });
});

describe('scoreAnswer — short_answer', () => {
  it('acepta short_answer igual que short_text', () => {
    const activity = { type: 'short_answer', correctAnswer: 'París', points: 4 };
    expect(scoreAnswer(activity, { text: 'paris' })).toBe(4);
  });
});

describe('scoreAnswer — matching', () => {
  it('acierta si todos los pares coinciden', () => {
    const activity = {
      type: 'matching',
      correctAnswer: [
        { left: 'a', right: '1' },
        { left: 'b', right: '2' }
      ],
      points: 6
    };
    const answers = {
      matches: [
        { left: 'a', right: '1' },
        { left: 'b', right: '2' }
      ]
    };
    expect(scoreAnswer(activity, answers)).toBe(6);
  });

  it('falla si un par no coincide', () => {
    const activity = {
      type: 'matching',
      correctAnswer: [{ left: 'a', right: '1' }],
      points: 6
    };
    expect(
      scoreAnswer(activity, { matches: [{ left: 'a', right: '2' }] })
    ).toBe(0);
  });
});
});