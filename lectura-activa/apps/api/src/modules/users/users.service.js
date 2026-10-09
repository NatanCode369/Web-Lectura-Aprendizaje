/**
 * Casos de uso de users.
 */

import { NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import {
  pickEditableFields,
  validateProfileSize,
} from './users.domain.js';

export function usersService(repo) {
  return {
    async getById(userId) {
      const user = await repo.findById(userId);
      if (!user) {
        throw new NotFoundError('Usuario');
      }
      return user;
    },

    async updateMe(userId, payload) {
      let safe;
      try {
        safe = pickEditableFields(payload);
      } catch (err) {
        throw new ValidationError('FORBIDDEN_FIELDS', err.message);
      }

      if (safe.profile) {
        try {
          validateProfileSize(safe.profile);
        } catch (err) {
          throw new ValidationError('PROFILE_TOO_LARGE', err.message);
        }
      }

      const updated = await repo.updateById(userId, safe);
      if (!updated) {
        throw new NotFoundError('Usuario');
      }
      return updated;
    },
  };
}