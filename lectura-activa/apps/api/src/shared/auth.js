import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { unauthorized, forbidden } from './errors.js';

const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

export function buildAuth({ userRepository }) {
  return async function authenticate(request) {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw unauthorized();

    const token = header.slice('Bearer '.length).trim();
    if (!token) throw unauthorized();

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw unauthorized('Token inválido o expirado');

    const user = await userRepository.findByAuthUserId(data.user.id);
    if (!user || user.status !== 'active') throw unauthorized('Usuario no disponible');

    request.user = user;
  };
}

export function requireRoles(...roles) {
  return async function authorize(request) {
    if (!request.user || !roles.includes(request.user.role)) throw forbidden();
  };
}
