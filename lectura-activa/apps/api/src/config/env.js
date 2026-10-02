const required = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'CORS_ORIGIN'
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  corsOrigin: process.env.CORS_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean)
});

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65_535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
