import Fastify from 'fastify';
import { groupsRoutes } from './modules/groups/groups.routes.js';
import { assignmentsRoutes } from './modules/assignments/assignments.routes.js';
import { studentAssignmentsRoutes } from './modules/studentAssignments/studentAssignments.routes.js';
import { attemptsRoutes } from './modules/attempts/attempts.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';

const app = Fastify({
  logger: true,
});

app.get('/health', async () => ({
  status: 'ok',
  service: 'lectura-activa-api',
  timestamp: new Date().toISOString(),
}));

await app.register(groupsRoutes, { prefix: '/api/v1/groups' });
await app.register(assignmentsRoutes, { prefix: '/api/v1/assignments' });
await app.register(studentAssignmentsRoutes, { prefix: '/api/v1/student-assignments' });
await app.register(attemptsRoutes, { prefix: '/api/v1/attempts' });
await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
  console.log(`API started at http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
