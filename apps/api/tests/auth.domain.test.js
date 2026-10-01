import { describe, it, expect } from 'vitest';
import {
  extractDomain,
  normalizeEmail,
  normalizeAllowedDomains,
  isDomainAllowed,
  defaultRoleForNewUser,
  defaultStatus,
} from '../src/modules/auth/auth.domain.js';

describe('auth.domain — extractDomain', () => {
  it('extrae el dominio y lo pasa a minúsculas', () => {
    expect(extractDomain('Ana@Colegio.EDU.gt')).toBe('colegio.edu.gt');
  });

  it('devuelve null si no hay @', () => {
    expect(extractDomain('sin-arroba')).toBeNull();
  });

  it('devuelve null si el @ está al inicio', () => {
    expect(extractDomain('@dominio.com')).toBeNull();
  });

  it('devuelve null si el @ está al final', () => {
    expect(extractDomain('alguien@')).toBeNull();
  });

  it('devuelve null si no es string', () => {
    expect(extractDomain(null)).toBeNull();
    expect(extractDomain(undefined)).toBeNull();
    expect(extractDomain(123)).toBeNull();
  });
});

describe('auth.domain — normalizeEmail', () => {
  it('pasa a minúsculas y quita espacios', () => {
    expect(normalizeEmail('  Ana@Colegio.EDU.gt  ')).toBe('ana@colegio.edu.gt');
  });

  it('convierte null/undefined a string vacío', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });
});

describe('auth.domain — normalizeAllowedDomains', () => {
  it('quita @ inicial y pasa a minúsculas', () => {
    expect(normalizeAllowedDomains(['@X.edu', 'Y.EDU'])).toEqual(['x.edu', 'y.edu']);
  });

  it('filtra entradas vacías', () => {
    expect(normalizeAllowedDomains(['x.edu', '', '   '])).toEqual(['x.edu']);
  });
});

describe('auth.domain — isDomainAllowed', () => {
  it('acepta dominio que coincide exactamente', () => {
    expect(isDomainAllowed('a@x.edu', ['x.edu'])).toBe(true);
  });

  it('acepta dominio con @ inicial en la lista', () => {
    expect(isDomainAllowed('a@x.edu', ['@x.edu'])).toBe(true);
  });

  it('rechaza dominio ajeno', () => {
    expect(isDomainAllowed('a@gmail.com', ['x.edu'])).toBe(false);
  });

  it('rechaza si la lista está vacía', () => {
    expect(isDomainAllowed('a@x.edu', [])).toBe(false);
  });

  it('es case-insensitive en ambos lados', () => {
    expect(isDomainAllowed('A@X.EDU', ['x.edu'])).toBe(true);
  });
});

describe('auth.domain — defaults', () => {
  it('el rol por defecto es student', () => {
    expect(defaultRoleForNewUser()).toBe('student');
  });

  it('el estado por defecto es active', () => {
    expect(defaultStatus()).toBe('active');
  });
});