const activitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'prompt', 'points', 'config'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[a-zA-Z0-9_-]+$' },
    type: { type: 'string', enum: ['multiple_choice', 'true_false', 'short_answer', 'ordering', 'matching'] },
    prompt: { type: 'string', minLength: 1, maxLength: 2000 },
    points: { type: 'integer', minimum: 1, maximum: 100 },
    config: { type: 'object', additionalProperties: true }
  }
};

export const readingWriteBody = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'content', 'difficulty', 'estimatedMinutes', 'activities'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    summary: { type: 'string', minLength: 1, maxLength: 1000 },
    content: { type: 'string', minLength: 1, maxLength: 100000 },
    difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
    estimatedMinutes: { type: 'integer', minimum: 1, maximum: 600 },
    media: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: false, required: ['type', 'url'], properties: { type: { type: 'string', enum: ['image', 'audio', 'video'] }, url: { type: 'string', minLength: 1, maxLength: 2048 }, alt: { type: 'string', maxLength: 500 } } } },
    activities: { type: 'array', maxItems: 50, items: activitySchema }
  }
};

export const readingPatchBody = { ...readingWriteBody, required: [] };

export const readingListQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    search: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    difficulty: {
      type: 'string',
      enum: ['easy', 'medium', 'hard']
    },
    maxMinutes: {
      type: 'integer',
      minimum: 1,
      maximum: 600
    },
    page: {
      type: 'integer',
      minimum: 1,
      default: 1
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 50,
      default: 20
    }
  }
};
