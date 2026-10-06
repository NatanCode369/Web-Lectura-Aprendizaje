# apps/edge — Worker proxy de Cloudflare

Reenvía `https://TU-DOMINIO/api/*` a la API (Cloud Run) agregando
`x-origin-secret` y `x-client-ip`. No valida JWT: eso lo hace la API.

```bash
cd apps/edge
npm install
# prueba local (crea .dev.vars con: ORIGIN_SHARED_SECRET=<el mismo de la API>)
npx wrangler dev --var ORIGIN_URL:http://localhost:3000
# producción
npx wrangler login
npx wrangler secret put ORIGIN_SHARED_SECRET   # pega el mismo valor que en la API
npx wrangler deploy
```
Antes de `deploy`: edita `ORIGIN_URL` y la sección `routes` en `wrangler.toml`.
