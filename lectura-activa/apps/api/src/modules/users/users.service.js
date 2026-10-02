/**
 * Casos de uso de users.
 */

import { AppError, ErrorCodes } from '../../shared/errors/AppError.js';
import {
  pickEditableFields,
  validateProfileSize,
} from './users.domain.js';

export function usersService(repo) {
  return {
    async getById(userId) {
      const user = await repo.findById(userId);
      if (!user) {
        throw AppError.notFound(
          ErrorCodes.USER_NOT_FOUND,
          'Usuario no encontrado.'
        );
      }
      return user;
    },

    async updateMe(userId, payload) {
      let safe;
      try {
        safe = pickEditableFields(payload);
      } catch (err) {
        // Convertimos el error de dominio al tipo AppError.
        throw AppError.badRequest(
          ErrorCodes.FORBIDDEN_FIELDS,
          err.message
        );
      }

      if (safe.profile) {
        try {
          validateProfileSize(safe.profile);
        } catch (err) {
          throw AppError.badRequest(
            'PROFILE_TOO_LARGE',
            err.message
          );
        }
      }

      const updated = await repo.updateById(userId, safe);
      if (!updated) {
        throw AppError.notFound(
          ErrorCodes.USER_NOT_FOUND,
          'Usuario no encontrado.'
        );
      }
      return updated;
    },
  };
}