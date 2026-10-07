/**
 * Configuración del entorno — validada al arranque.
 *
 * Reglas:
 * - En producción TODAS las variables críticas son obligatorias.
 * - En desarrollo las de Supabase son opcionales: la API arranca y los
 *   endpoints protegidos devuelven 503 AUTH_NOT_CONFIGURED.
 * - MongoDB siempre tiene un default local para no bloquear el arranque.
 */

import { z } from 'zod';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

// Helper: en producción exige string no vacío; en dev permite ausencia.
const optionalInDev = (name) =>
    isProd
        ? z.string().min(1, `Falta ${name}`)
        : z.string().min(1).optional();

const schema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    //Validar cual de las dos es la correcta
    //PORT: z.coerce.number().int().positive().default(3000),
    PORT: z.coerce.number().int().positive().default(8080),
    HOST: z.string().min(1).default('0.0.0.0'),

    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
        .default('info'),

    // ---------- MongoDB ----------
    MONGODB_URI: isProd
        ? z
            .string()
            .url()
            .refine(
                (value) => value.startsWith('mongodb+srv://'),
                'En producción MONGODB_URI debe apuntar a MongoDB Atlas'
            )
        : z
            .string()
            .url()
            .default('mongodb://localhost:27017'),
    MONGODB_DB: z.string().min(1).default('lectura_activa'),

    // ---------- Supabase (opcionales en dev) ----------
    SUPABASE_URL: optionalInDev('SUPABASE_URL'),
    SUPABASE_ANON_KEY: optionalInDev('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: optionalInDev('SUPABASE_SERVICE_ROLE_KEY'),

    // ---------- Secreto del hook de dominio ----------
    INTERNAL_HOOK_SECRET: isProd
        ? z
            .string()
            .min(32, 'INTERNAL_HOOK_SECRET debe tener al menos 32 caracteres')
        : z
            .string()
            .min(32)
            .default('dev-secret-0123456789abcdef0123456789abcdef'),

    // ---------- Secreto de jobs de analítica ----------
    ANALYTICS_JOB_SECRET: isProd
        ? z
            .string()
            .min(32, 'ANALYTICS_JOB_SECRET debe tener al menos 32 caracteres')
        : z
            .string()
            .min(1)
            .optional(),

  // ---------- Cookies ----------
  COOKIE_SECRET: isProd
      ? z.string().min(32, 'COOKIE_SECRET debe tener al menos 32 caracteres')
      : z.string().min(32).default('dev-cookie-secret-change-me-32chars'),

  // ---------- Frontend ----------
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // ---------- CORS ----------
  CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((v) =>
          v
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
      ),

  // ---------- Cloudflare (opcional) ----------
  // Secreto compartido con el Worker proxy (apps/edge). Con él la API sabe
  // que la petición pasó por Cloudflare y puede confiar en x-client-ip.
  ORIGIN_SHARED_SECRET: z.string().min(32).optional(),
  // true = rechaza (403) lo que no venga del Worker. Solo en producción.
  REQUIRE_EDGE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
}).superRefine((value, ctx) => {
  if (value.REQUIRE_EDGE && !value.ORIGIN_SHARED_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['ORIGIN_SHARED_SECRET'],
      message: 'Es obligatorio cuando REQUIRE_EDGE=true',
    });
  }
});

function loadEnv() {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        console.error(`Configuración de entorno inválida:\n${issues}`);
        process.exit(1);
    }
    return parsed.data;
}

export const env = loadEnv();

export const isProdEnv = env.NODE_ENV === 'production';
export const isDevEnv = env.NODE_ENV === 'development';
export const isTestEnv = env.NODE_ENV === 'test';