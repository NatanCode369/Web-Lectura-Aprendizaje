/**
 * Stub temporal del repositorio de lecturas.
 * 
 * PROPÓSITO: Desbloquear el arranque del servidor y las pruebas de 
 * assignments.service.js mientras se implementa la lógica real de MongoDB.
 * 
 * Este stub imita la interfaz (contrato) que esperan los servicios,
 * devolviendo datos mockeados que pasan las validaciones de dominio.
 */

export const readingsRepository = {
    /**
     * Busca una lectura por su ID (Versión Stub)
     */
    async findById(id) {
      console.warn(`[STUB] readingsRepository.findById llamado con ID: ${id}. Devolviendo mock.`);
      
      // Devuelve un objeto que cumple con el contrato mínimo esperado por assignments.domain
      return {
        _id: id,
        title: 'Lectura de Prueba (Stub)',
        status: 'published', // Importante: debe ser 'published' para pasar assertReadingPublished
        version: 1,
        activities: [
          { id: 'act_1', type: 'question', text: '¿Cuál es el tema principal?' }
        ]
      };
    },
  
    /**
     * Busca una versión específica de una lectura (Versión Stub)
     */
    async findByIdAndVersion(id, version) {
      console.warn(`[STUB] readingsRepository.findByIdAndVersion llamado.`);
      return {
        _id: id,
        version: version,
        status: 'published',
        activities: []
      };
    }
  };