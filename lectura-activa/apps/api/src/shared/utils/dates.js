/**
 * Utilidades de fechas para el proyecto Lectura Activa.
 */

export function utcDayKey(date = new Date()) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
  
  export function startOfUtcDay(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  
  export function endOfUtcDay(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }
  
  // Alias por si algún otro archivo usa los nombres anteriores
  export const getStartOfDay = startOfUtcDay;
  export const getEndOfDay = endOfUtcDay;
  
  export function toISOString(date) {
    return new Date(date).toISOString();
  }
  
  export function subtractDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }