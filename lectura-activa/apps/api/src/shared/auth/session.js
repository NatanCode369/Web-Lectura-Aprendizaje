/**
 * session.js
 * Middleware de sesión para el backend.
 * Verifica el JWT de Supabase en el header Authorization
 * y adjunta el usuario autenticado a `request.user`.
 */

import { supabaseAdmin } from '../../config/supabase.js';

function getTokenFromRequest(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function requireSession(req, reply) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return reply.code(401).send({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Autenticación requerida.',
        requestId: req.id,
      },
    });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return reply.code(401).send({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token inválido o expirado.',
          requestId: req.id,
        },
      });
    }

    req.user = data.user;
    req.accessToken = token;
  } catch {
    return reply.code(401).send({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido o expirado.',
        requestId: req.id,
      },
    });
  }
}

export function requireRoles(...roles) {
  return async (req, reply) => {
    if (!req.user) {
      return reply.code(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Autenticación requerida.',
          requestId: req.id,
        },
      });
    }

    const userRole = req.user.user_metadata?.role || req.user.role;

    if (!roles.includes(userRole)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para esta operación.',
          requestId: req.id,
        },
      });
    }
  };
}