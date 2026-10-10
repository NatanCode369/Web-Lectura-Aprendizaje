/**
 * Lógica de autenticación usando clientes Supabase centralizados.
 * 
 * Usa los clientes de config/supabase.js (supabaseAuth para validar JWTs).
 * Incluye degradación elegante: si las variables de entorno no están 
 * configuradas, lanza error controlado al intentar autenticar.
 */

import { supabaseAuth, supabaseReady } from '../config/supabase.js';
import { AppError, ErrorCodes } from './errors/index.js';

export { requireRole as requireRoles } from './authorization/policies.js';

export function buildAuth({ userRepository }) {
  return async function authenticate(request) {
    if (!supabaseReady) {
      throw AppError.unauthorized(
        'AUTH_NOT_CONFIGURED',
        'Supabase no configurado. Revisa tus variables de entorno (.env)'
      );
    }

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized(ErrorCodes.UNAUTHENTICATED, 'No autenticado');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw AppError.unauthorized(ErrorCodes.UNAUTHENTICATED, 'No autenticado');
    }

    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data?.user) {
      throw AppError.unauthorized('INVALID_TOKEN', 'Token inválido o expirado');
    }

    const user = await userRepository.findByAuthUserId(data.user.id);
    if (!user || user.status !== 'active') {
      throw AppError.unauthorized('USER_NOT_FOUND', 'Usuario no disponible');
    }

    request.user = user;
  };
}