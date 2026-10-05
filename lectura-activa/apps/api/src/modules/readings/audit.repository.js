import { getDb } from '../../shared/db.js';

export function buildAuditRepository() {
  return {
    async record({ actorId, action, resourceId, metadata = {} }) {
      await getDb().collection('auditLogs').insertOne({
        actorId,
        action,
        resourceType: 'reading',
        resourceId,
        metadata,
        createdAt: new Date()
      });
    }
  };
}
