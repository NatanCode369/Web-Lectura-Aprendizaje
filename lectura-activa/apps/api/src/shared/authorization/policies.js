/**
 * Políticas de autorización para Lectura Activa.
 * Define quién puede hacer qué según su rol.
 */
import { AppError } from '../errors/AppError.js';

/**
 * Verifica si el usuario tiene el rol requerido
 * @param {Object} user - Objeto de usuario con propiedad 'role'
 * @param {string} requiredRole - Rol requerido ('student', 'teacher', 'admin')
 * @returns {boolean}
 */
export function hasRole(user, requiredRole) {
  if (!user || !user.role) return false;
  return user.role === requiredRole;
}

/**
 * Verifica si el usuario es administrador
 */
export function isAdmin(user) {
  return hasRole(user, 'admin');
}

/**
 * Verifica si el usuario es docente
 */
export function isTeacher(user) {
  return hasRole(user, 'teacher');
}

/**
 * Verifica si el usuario es estudiante
 */
export function isStudent(user) {
  return hasRole(user, 'student');
}

/**
 * Verifica si el usuario es docente O administrador
 */
export function isTeacherOrAdmin(user) {
  return isTeacher(user) || isAdmin(user);
}

/**
 * Verifica si el usuario es el propietario de un recurso
 * @param {Object} user - Usuario autenticado
 * @param {Object} resource - Recurso con propiedad 'teacherId' o 'authorId'
 * @returns {boolean}
 */
export function isResourceOwner(user, resource) {
  if (!user || !resource) return false;
  
  // Para grupos y asignaciones
  if (resource.teacherId && user.authUserId) {
    return resource.teacherId === user.authUserId;
  }
  
  // Para lecturas
  if (resource.authorId && user.authUserId) {
    return resource.authorId === user.authUserId;
  }
  
  return false;
}

/**
 * Verifica si el estudiante pertenece a un grupo
 * @param {Object} group - Objeto grupo con propiedad 'studentIds'
 * @param {string} studentAuthId - ID del estudiante en Supabase
 * @returns {boolean}
 */
export function isStudentInGroup(group, studentAuthId) {
  if (!group || !group.studentIds || !studentAuthId) return false;
  return group.studentIds.includes(studentAuthId);
}

/**
 * Middleware de Fastify para exigir un rol específico.
 * Uso: preHandler: [requireRole('teacher', 'admin')]
 * 
 * @param {...string} allowedRoles - Roles permitidos
 * @returns {Function} Middleware de Fastify
 */
export function requireRole(...allowedRoles) {
  return async (request, reply) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      throw AppError.forbidden(
        'FORBIDDEN',
        `Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      );
    }
  };
}

/**
 * Middleware de autorización para rutas de docente
 * Verifica que el usuario sea docente o administrador
 */
export function requireTeacherOrAdmin(request, reply) {
  if (!request.user || !isTeacherOrAdmin(request.user)) {
    throw AppError.forbidden('FORBIDDEN', 'Acceso denegado: se requieren permisos de docente o administrador');
  }
}

/**
 * Middleware de autorización para rutas de administrador
 */
export function requireAdmin(request, reply) {
  if (!request.user || !isAdmin(request.user)) {
    throw AppError.forbidden('FORBIDDEN', 'Acceso denegado: se requieren permisos de administrador');
  }
}

/**
 * Verifica que el docente sea propietario del grupo
 */
export function requireGroupOwner(request, reply) {
  if (!request.user || !isTeacherOrAdmin(request.user)) {
    throw AppError.forbidden('FORBIDDEN', 'Acceso denegado');
  }
  
  // Esta validación requiere acceso al recurso, se hace en el servicio
  // Aquí solo verificamos el rol
}