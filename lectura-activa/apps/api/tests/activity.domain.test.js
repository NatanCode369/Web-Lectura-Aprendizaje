import { describe, expect, it } from 'vitest';
import { validateActivities } from '../src/modules/readings/activity.domain.js';

describe('validateActivities', () => {
  it('accepts supported activity formats', () => {
    expect(() => validateActivities([
      { id: 'a1', type: 'multiple_choice', prompt: 'Pregunta', points: 2, config: { options: ['A', 'B'], correctIndex: 0 } },
      { id: 'a2', type: 'true_false', prompt: 'Afirmación', points: 1, config: { correctAnswer: true } }
    ])).not.toThrow();
  });

  it('rejects duplicate activity ids', () => {
    expect(() => validateActivities([
      { id: 'a1', type: 'true_false', prompt: 'A', points: 1, config: { correctAnswer: true } },
      { id: 'a1', type: 'true_false', prompt: 'B', points: 1, config: { correctAnswer: false } }
    ])).toThrow(/Actividad duplicada/);
  });
});
