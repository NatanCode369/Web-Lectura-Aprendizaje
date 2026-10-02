/**
 * Clientes de Supabase Auth — construcción perezosa.
 *
 * Si las variables de entorno no están presentes (p. ej. durante la Fase 0
 * antes de que P7 provisione el proyecto), exportamos `null` y el resto del
 * código responde 503 AUTH_NOT_CONFIGURED en lugar de romper el arranque.
 *
 * - supabaseAuth: cliente público. Se usa SOLO para validar JWTs de usuario.
 * - supabaseAdmin: cliente con service role. Operaciones administrativas.
 */

import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../shared/logger.js';

function buildClient(url, key, label) {
  if (!url || !key) {
    logger.warn(
      { client: label },
      'Supabase no configurado todavía: faltan URL o clave.'
    );
    return null;
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabaseAuth = buildClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  'auth'
);

export const supabaseAdmin = buildClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  'admin'
);

/** ¿Está Supabase listo para usarse? */
export const supabaseReady = supabaseAuth !== null;

/** ¿Está el cliente administrativo listo? */
export const supabaseAdminReady = supabaseAdmin !== null;