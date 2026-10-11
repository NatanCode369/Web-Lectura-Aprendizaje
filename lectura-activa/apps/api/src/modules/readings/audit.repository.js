import { ObjectId } from 'mongodb';
import { getDb } from '../../shared/db.js';

export function buildAuditRepository() {
  return {
    async record({ actorId, action, resourceId, metadata = {} }) {
      try {
        await getDb().collection('auditLogs').insertOne({
          actorId: actorId ? new ObjectId(actorId) : null,
          action,
          resourceType: 'reading',
          resourceId: resourceId ? new ObjectId(resourceId) : null,
          metadata,
          createdAt: new Date(),
        });
      } catch (err) {
        // NO romper el flujo principal por un fallo de auditoría
        console.error('[audit.repository] Fallo al registrar auditLog:', err.message);
      }
    }
  };
}