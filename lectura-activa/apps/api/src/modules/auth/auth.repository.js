/**
 * Repositorio de auth — acceso a MongoDB.
 *
 * Solo consulta `institutions` para validar dominios.
 * No conoce Fastify ni reglas de negocio.
 */

export function institutionsRepo(db) {
  const col = db.collection('institutions');

  return {
    /**
     * Busca una institución cuyo `allowedEmailDomains` contenga el dominio dado.
     * Devuelve solo los campos necesarios.
     */
    async findByDomain(domain) {
      if (!domain) return null;
      return col.findOne(
        { allowedEmailDomains: domain.toLowerCase(), deletedAt: null },
        { projection: { _id: 1, name: 1 } }
      );
    },

    /**
     * Devuelve todos los dominios permitidos de todas las instituciones activas.
     * Útil para diagnósticos; no usar en hot path.
     */
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