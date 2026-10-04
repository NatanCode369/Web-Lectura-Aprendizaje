import { badRequest } from '../../shared/errors.js';

const ACTIVITY_TYPES = new Set([
  'multiple_choice',
  'true_false',
  'short_answer',
  'ordering',
  'matching'
]);

const LIMITS = Object.freeze({ maxActivities: 50, maxPromptLength: 2_000 });

function assertNonEmptyString(value, field, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw badRequest(`Campo inválido: ${field}`);
  }
}

function validateMultipleChoice(config) {
  if (!Array.isArray(config.options) || config.options.length < 2 || config.options.length > 8) {
    throw badRequest('Una actividad multiple_choice requiere entre 2 y 8 opciones');
  }
  config.options.forEach((option, index) => assertNonEmptyString(option, `config.options[${index}]`, 300));
  if (!Number.isInteger(config.correctIndex) || config.correctIndex < 0 || config.correctIndex >= config.options.length) {
    throw badRequest('correctIndex no corresponde a una opción válida');
  }
}

function validateTrueFalse(config) {
  if (typeof config.correctAnswer !== 'boolean') throw badRequest('correctAnswer debe ser boolean');
}

function validateShortAnswer(config) {
  if (!Array.isArray(config.acceptedAnswers) || config.acceptedAnswers.length < 1 || config.acceptedAnswers.length > 20) {
    throw badRequest('acceptedAnswers debe contener entre 1 y 20 respuestas');
  }
  config.acceptedAnswers.forEach((answer, index) => assertNonEmptyString(answer, `config.acceptedAnswers[${index}]`, 500));
}

function validateOrdering(config) {
  if (!Array.isArray(config.items) || config.items.length < 2 || config.items.length > 12) {
    throw badRequest('Una actividad ordering requiere entre 2 y 12 elementos');
  }
  config.items.forEach((item, index) => assertNonEmptyString(item, `config.items[${index}]`, 300));
  if (!Array.isArray(config.correctOrder) || config.correctOrder.length !== config.items.length) {
    throw badRequest('correctOrder debe contener todos los índices de items');
  }
  const expected = new Set(config.items.map((_, index) => index));
  if (config.correctOrder.some((value) => !Number.isInteger(value) || !expected.has(value)) || new Set(config.correctOrder).size !== config.items.length) {
    throw badRequest('correctOrder debe ser una permutación válida de items');
  }
}

function validateMatching(config) {
  if (!Array.isArray(config.pairs) || config.pairs.length < 2 || config.pairs.length > 12) {
    throw badRequest('Una actividad matching requiere entre 2 y 12 pares');
  }
  config.pairs.forEach((pair, index) => {
    if (!pair || typeof pair !== 'object') throw badRequest(`config.pairs[${index}] inválido`);
    assertNonEmptyString(pair.left, `config.pairs[${index}].left`, 300);
    assertNonEmptyString(pair.right, `config.pairs[${index}].right`, 300);
  });
}

function validateConfig(type, config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw badRequest('config debe ser un objeto');
  if (type === 'multiple_choice') validateMultipleChoice(config);
  if (type === 'true_false') validateTrueFalse(config);
  if (type === 'short_answer') validateShortAnswer(config);
  if (type === 'ordering') validateOrdering(config);
  if (type === 'matching') validateMatching(config);
}

export function validateActivities(activities = []) {
  if (!Array.isArray(activities) || activities.length > LIMITS.maxActivities) {
    throw badRequest(`activities debe ser un arreglo de 0 a ${LIMITS.maxActivities} elementos`);
  }

  const ids = new Set();
  for (const activity of activities) {
    if (!activity || typeof activity !== 'object') throw badRequest('Cada actividad debe ser un objeto');
    assertNonEmptyString(activity.id, 'activity.id', 64);
    if (!/^[a-zA-Z0-9_-]+$/.test(activity.id)) throw badRequest('activity.id contiene caracteres no permitidos');
    if (ids.has(activity.id)) throw badRequest(`Actividad duplicada: ${activity.id}`);
    ids.add(activity.id);

    if (!ACTIVITY_TYPES.has(activity.type)) throw badRequest(`Tipo de actividad no soportado: ${activity.type}`);
    assertNonEmptyString(activity.prompt, `activity(${activity.id}).prompt`, LIMITS.maxPromptLength);
    if (!Number.isInteger(activity.points) || activity.points < 1 || activity.points > 100) {
      throw badRequest(`Puntos inválidos en actividad ${activity.id}`);
    }
    validateConfig(activity.type, activity.config);
  }

  return activities;
}

export function sanitizeActivities(activities) {
  return activities.map((activity) => structuredClone(activity));
}
