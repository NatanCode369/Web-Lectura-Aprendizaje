export async function registerReadingsModule(fastify) {
    const userRepository = buildUserRepository();
    const readingRepository = buildReadingRepository();
    const auditRepository = buildAuditRepository();
    const readingService = buildReadingService({ readingRepository, auditRepository });
    const auth = authenticate(db);

    await registerReadingRoutes(fastify, { auth, readingService, prefix: '/api/v1/readings' });
}