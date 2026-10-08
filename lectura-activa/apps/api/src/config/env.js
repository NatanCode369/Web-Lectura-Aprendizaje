import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuración del entorno — validada al arranque.
 */

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

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
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  ORIGIN_SHARED_SECRET: z.string().min(32).optional(),
  REQUIRE_EDGE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  MAILER_MODE: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: isProd
      ? z.string().min(1, 'RESEND_API_KEY es obligatorio en producción')
      : z.string().min(1).optional(),
  MAILER_FROM: z.string().email().default('no-reply@lectura-activa.local'),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
}).superRefine((value, ctx) => {
  if (value.REQUIRE_EDGE && !value.ORIGIN_SHARED_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['ORIGIN_SHARED_SECRET'],
      message: 'Es obligatorio cuando REQUIRE_EDGE=true',
    });
  }
  if (value.MAILER_MODE === 'resend' && !value.RESEND_API_KEY) {
    ctx.addIssue({
      code: 'custom',
      path: ['RESEND_API_KEY'],
      message: 'Es obligatorio cuando MAILER_MODE=resend',
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
