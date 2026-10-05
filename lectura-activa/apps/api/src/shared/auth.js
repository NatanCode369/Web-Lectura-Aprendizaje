/**
 * Cliente de Supabase y lógica de autenticación.
 * 
 * Incluye degradación elegante: si las variables de entorno no están 
 * configuradas (desarrollo local), no crashea al importar, sino que 
 * lanza un error controlado solo cuando se intenta autenticar.
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { unauthorized, forbidden } from './errors.js';

// 1. Usar los nombres correctos de las variables (SCREAMING_SNAKE_CASE como en env.js)
// 2. Validar que no sea el placeholder antes de crear el cliente
const isValidUrl = env.SUPABASE_URL && !env.SUPABASE_URL.includes('YOUR_PROJECT');

let supabase = null;

if (isValidUrl && env.SUPABASE_ANON_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

export function buildAuth({ userRepository }) {
  return async function authenticate(request) {
    if (!supabase) {
      throw unauthorized('Supabase no configurado. Revisa tus variables de entorno (.env)');
    }

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized();
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw unauthorized();
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw unauthorized('Token inválido o expirado');
    }

    const user = await userRepository.findByAuthUserId(data.user.id);
    if (!user || user.status !== 'active') {
      throw unauthorized('Usuario no disponible');
    }

    request.user = user;
  };
}