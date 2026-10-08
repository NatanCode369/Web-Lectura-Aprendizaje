/**
 * Repositorio de auth — acceso a MongoDB.
 *
 * - institutions: valida dominios.
 * - passwordResets: guarda tokens de recuperación.
 */

export function institutionsRepo(db) {
  const col = db.collection('institutions');

  return {
    async findByDomain(domain) {
      if (!domain) return null;
      return col.findOne(
        { allowedEmailDomains: domain.toLowerCase(), deletedAt: null },
        { projection: { _id: 1, name: 1 } }
      );
    },

    async findAllAllowedDomains() {
      const docs = await col
        .find(
          { deletedAt: null },
          { projection: { _id: 0, allowedEmailDomains: 1 } }
        )
        .toArray();
      return docs.flatMap((d) => d.allowedEmailDomains ?? []);
    },
  };
}

export function passwordResetsRepo(db) {
  const col = db.collection('passwordResets');

  return {
    /**
     * Guarda un nuevo token de recuperación.
     */
    async create(doc) {
      const result = await col.insertOne(doc);
      return { ...doc, _id: result.insertedId };
    },

    /**
     * Busca un token por su hash.
     * Devuelve el documento completo (incluye expiresAt y usedAt).
     */
    async findByTokenHash(tokenHash) {
      if (!tokenHash) return null;
      return col.findOne({ tokenHash });
    },

    /**
     * Marca un token como usado (para que no se pueda reutilizar).
     */
    async markAsUsed(tokenHash) {
      return col.updateOne(
        { tokenHash, usedAt: null },
        { $set: { usedAt: new Date() } }
      );
    },

    /**
     * Invalida todos los tokens activos de un email.
     * Se usa al pedir uno nuevo (por seguridad).
     */
    async invalidateAllForEmail(email) {
      return col.updateMany(
        { email, usedAt: null },
        { $set: { usedAt: new Date() } }
      );
    },

    /**
     * Limpia tokens expirados. Se puede llamar desde un job periódico.
     */
    async deleteExpired() {
      return col.deleteMany({ expiresAt: { $lt: new Date() } });
    },
  };
}
// Re-exportar los repos de whitelist para que `auth.service.js` los importe
// desde el mismo lugar.
export { adminsRepo, teachersRepo } from './roles.repository.js';