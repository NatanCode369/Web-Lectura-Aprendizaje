/**
 * Logger estructurado en JSON.
 *
 * - En desarrollo: salida legible con pino-pretty.
 * - En producción: JSON puro para ingesta en Cloud Logging.
 *
 * Nunca loggear tokens, contraseñas, headers de autorización ni emails
 * completos (a lo sumo primeros caracteres en debug).
 */

import pino from 'pino';
import { env, isDevEnv } from '../config/env.js';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-internal-secret"]',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'token',
  '*.token',
  'access_token',
  '*.access_token',
  'refresh_token',
  '*.refresh_token',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_HOOK_SECRET',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  base: {
    service: 'lectura-activa-api',
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDevEnv
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,service,env',
          },
        },
      }
    : {}),
});