/**
 * Tests end-to-end del módulo auth + users.
 *
 * En Fase 0 (antes de Supabase y Mongo reales) estos tests quedan como
 * placeholders documentados. Cuando P7 confirme Supabase y Mongo,
 * se activan descomentando los bloques.
 *
 * Lo que cubrirán:
 *  1. GET /me sin token → 401 UNAUTHENTICATED
 *  2. GET /me con Supabase no configurado → 503 AUTH_NOT_CONFIGURED
 *  3. GET /me con token válido y usuario existente → 200
 *  4. GET /me con token válido y usuario nuevo → 200 (crea en Mongo)
 *  5. GET /me con dominio no autorizado → 403 DOMAIN_NOT_ALLOWED
 *  6. PATCH /me con { role: 'admin' } → 400 FORBIDDEN_FIELDS
 *  7. PATCH /me con { fullName } → 200
 *  8. POST /internal/validate-domain sin secreto → 401
 *  9. POST /internal/validate-domain con dominio válido → 200
 * 10. POST /internal/validate-domain con dominio inválido → 403
 */

import { describe, it, expect } from 'vitest';

describe('auth+users — e2e (pendiente de activar)', () => {
  it.todo('GET /me sin token devuelve 401 UNAUTHENTICATED');
  it.todo('GET /me con Supabase no configurado devuelve 503 AUTH_NOT_CONFIGURED');
  it.todo('GET /me con token válido y usuario existente devuelve 200');
  it.todo('GET /me con token válido y usuario nuevo lo crea en Mongo');
  it.todo('GET /me con dominio no autorizado devuelve 403 DOMAIN_NOT_ALLOWED');
  it.todo('PATCH /me con role devuelve 400 FORBIDDEN_FIELDS');
  it.todo('PATCH /me con fullName devuelve 200');
  it.todo('POST /internal/validate-domain sin secreto devuelve 401');
  it.todo('POST /internal/validate-domain con dominio válido devuelve 200');
  it.todo('POST /internal/validate-domain con dominio inválido devuelve 403');
});