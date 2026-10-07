import { buildServer } from '../lectura-activa/apps/api/src/server.js';

let serverPromise;

async function getServer() {
  serverPromise ??= buildServer({ withDb: true }).then(async (server) => {
    await server.ready();
    return server;
  });

  return serverPromise;
}

export default async function handler(request, response) {
  try {
    const server = await getServer();
    server.server.emit('request', request, response);
  } catch (error) {
    console.error('No se pudo inicializar la API de Vercel:', error);

    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        error: {
          code: 'SERVER_INITIALIZATION_FAILED',
          message: 'No se pudo inicializar el servidor.',
        },
      }));
    }
  }
}
