# Imagen de producción para Google Cloud Run.
# Multi-stage: el stage `deps` instala paquetes; `runner` copia solo lo necesario.

FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# npm ci = instalación reproducible a partir del lockfile.
# Si aún no hay lockfile, caemos a npm install (menos ideal en CI).
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
# Cloud Run inyecta PORT en runtime; 8080 es el valor por defecto de la plataforma.
ENV PORT=8080

RUN addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER app
EXPOSE 8080

CMD ["node", "src/server.js"]
