import { z } from 'zod';

// Regex para validar ObjectId de MongoDB (24 caracteres hexadecimales)
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Debe ser un ID válido de MongoDB');

/**
 * Esquema para crear un nuevo grupo.
 * Valida que el nombre y año escolar sean obligatorios,
 * y que los studentIds (si se envían) sean ObjectIds válidos.
 */
export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre del grupo debe tener al menos 2 caracteres')
    .max(120, 'El nombre del grupo no puede exceder 120 caracteres')
    .nonempty('El nombre del grupo es obligatorio'),
  schoolYear: z
    .string()
    .trim()
    .max(20, 'El año escolar no puede exceder 20 caracteres')
    .nonempty('El año escolar es obligatorio'),
  studentIds: z
    .array(objectIdSchema)
    .default([])
});

/**
 * Esquema para actualizar un grupo existente.
 * Todos los campos son opcionales, pero al menos uno debe enviarse.
 */
export const updateGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre del grupo debe tener al menos 2 caracteres')
    .max(120, 'El nombre del grupo no puede exceder 120 caracteres')
    .optional(),
  schoolYear: z
    .string()
    .trim()
    .max(20, 'El año escolar no puede exceder 20 caracteres')
    .optional(),
  status: z
    .enum(['active', 'archived'], {
      errorMap: () => ({ message: 'El estado debe ser "active" o "archived"' })
    })
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Debe enviar al menos un campo para actualizar' }
);

/**
 * Esquema para agregar estudiantes a un grupo.
 * Requiere al menos un studentId válido.
 */
export const addStudentsSchema = z.object({
  studentIds: z
    .array(objectIdSchema)
    .min(1, 'Debe enviar al menos un studentId')
});

/**
 * Esquema para listar grupos con paginación y filtro de estado.
 */
export const listGroupsSchema = z.object({
  status: z
    .enum(['active', 'archived'], {
      errorMap: () => ({ message: 'El estado debe ser "active" o "archived"' })
    })
    .optional(),
  page: z
    .number()
    .int('La página debe ser un número entero')
    .min(1, 'La página debe ser al menos 1')
    .default(1),
  limit: z
    .number()
    .int('El límite debe ser un número entero')
    .min(1, 'El límite debe ser al menos 1')
    .max(100, 'El límite no puede exceder 100')
    .default(20)
});