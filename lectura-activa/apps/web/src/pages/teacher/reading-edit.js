/**
 * ============================================================
 * CONTRATO DE API — Editar lectura
 * ============================================================
 * 
 * Endpoints usados:
 *   GET   /api/v1/readings/:id   → cargar lectura para editar
 *   PATCH /api/v1/readings/:id   → guardar cambios
 *   GET   /api/v1/groups         → cargar grupos para mostrar asignaciones
 * 
 * Auth: Bearer token (Supabase)
 * Rol requerido: teacher (dueño de la lectura)
 * 
 * GET /readings/:id
 *   Response 200:
 *     {
 *       id: string,
 *       title: string,
 *       authorName: string,
 *       summary: string,
 *       content: string,
 *       difficulty: 'easy' | 'medium' | 'hard',
 *       estimatedMinutes: number,
 *       activities: string[],
 *       status: 'draft' | 'published',
 *       authorId: string,
 *       version: number,
 *       createdAt: ISO,
 *       updatedAt: ISO
 *     }
 * 
 * PATCH /readings/:id
 *   Request body:
 *     {
 *       title?: string,
 *       authorName?: string,
 *       summary?: string,
 *       content?: string,
 *       difficulty?: 'easy' | 'medium' | 'hard',
 *       estimatedMinutes?: number
 *     }
 *   Response 200: lectura actualizada
 *   Nota: al editar, el backend incrementa `version`.
 * 
 * Errores comunes:
 *   400 VALIDATION_ERROR — datos inválidos
 *   401 UNAUTHENTICATED — sin token
 *   403 FORBIDDEN — no es el autor de la lectura
 *   404 NOT_FOUND — la lectura no existe
 * 
 * TODO backend: este archivo usa localStorage por ahora.
 * Cuando el backend esté listo:
 *   import { api } from '../../services/apiClient.js';
 *   const lectura = await api.get(`/readings/${id}`);
 *   await api.patch(`/readings/${id}`, data);
 * ============================================================
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const KEY_LECTURAS = 'lecturas_docente';
const DOCENTE_ID = 'docente-demo';
const KEY_GRUPOS = `grupos_${DOCENTE_ID}`;

const ACTIVIDAD_INFO = {
  trivia: 'Preguntas tipo trivia',
  'verdadero-falso': 'Verdadero o falso rápido',
  detective: 'Detective de palabras',
  ordenar: 'Ordena la historia',
  mapa: 'Mapa mental'
};

// ============================================================
// UTILIDADES
// ============================================================
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${dia}/${mes}/${year}`;
}

function cargarLecturas() {
  try {
    return JSON.parse(localStorage.getItem(KEY_LECTURAS) || '[]');
  } catch {
    return [];
  }
}

function cargarGrupos() {
  try {
    return JSON.parse(localStorage.getItem(KEY_GRUPOS) || '[]');
  } catch {
    return [];
  }
}

// ============================================================
// CARGAR LECTURA DESDE ?id=
// ============================================================
const params = new URLSearchParams(window.location.search);
const lecturaId = params.get('id');

if (!lecturaId) {
  alert('No se especificó qué lectura editar.');
  window.location.href = './dashboard-teacher.html';
}

const lecturas = cargarLecturas();
const lectura = lecturas.find((l) => l.id === lecturaId);

if (!lectura) {
  alert('Lectura no encontrada.');
  window.location.href = './dashboard-teacher.html';
}

// ============================================================
// RELLENAR FORMULARIO
// ============================================================
document.getElementById('titulo').value = lectura.title || '';
document.getElementById('autor').value = lectura.authorName || '';
document.getElementById('nivel').value =
  lectura.difficulty === 'easy' ? 'basico' :
  lectura.difficulty === 'medium' ? 'intermedio' : 'avanzado';
document.getElementById('minutos').value = lectura.estimatedMinutes || 15;
document.getElementById('resumen').value = lectura.summary || '';
document.getElementById('contenido').value = lectura.content || '';

// ============================================================
// LISTA DE ACTIVIDADES
// ============================================================
const $listaActividades = document.getElementById('lista-actividades');
const actividadesLectura = lectura.actividades || [];

if ($listaActividades) {
  if (actividadesLectura.length === 0) {
    $listaActividades.innerHTML = '<p class="panel__hint">Esta lectura no tiene actividades configuradas.</p>';
  } else {
    $listaActividades.innerHTML = actividadesLectura.map((tipo) => `
      <label class="check">
        <input type="checkbox" checked disabled>
        <div>
          <p class="check__title">${escapeHtml(ACTIVIDAD_INFO[tipo] || tipo)}</p>
        </div>
      </label>
    `).join('');
  }
}

// ============================================================
// ASIGNACIONES EXISTENTES
// ============================================================
const $asignacionesBody = document.getElementById('asignaciones-body');
const grupos = cargarGrupos();
const gruposAsignados = lectura.gruposAsignados || [];

if ($asignacionesBody) {
  if (gruposAsignados.length === 0) {
    $asignacionesBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">
          Esta lectura no está asignada a ningún grupo.
        </td>
      </tr>
    `;
  } else {
    $asignacionesBody.innerHTML = gruposAsignados.map((grupoId) => {
      const grupo = grupos.find((g) => g.id === grupoId);
      if (!grupo) return '';

      return `
        <tr>
          <td>${escapeHtml(grupo.nombre)}</td>
          <td>${formatearFecha(lectura.fechaInicio)}</td>
          <td>${formatearFecha(lectura.fechaEntrega)}</td>
          <td><span class="badge badge--ok">En curso</span></td>
        </tr>
      `;
    }).join('');
  }
}

// ============================================================
// GUARDAR CAMBIOS
// ============================================================
document.getElementById('reading-edit-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const titulo = document.getElementById('titulo').value.trim();
  const autor = document.getElementById('autor').value.trim();
  const nivel = document.getElementById('nivel').value;
  const minutos = Number(document.getElementById('minutos').value) || 15;
  const resumen = document.getElementById('resumen').value.trim();
  const contenido = document.getElementById('contenido').value.trim();

  if (!titulo) {
    alert('El título es obligatorio.');
    return;
  }

  // Actualizar la lectura
  lectura.title = titulo;
  lectura.authorName = autor || 'Anónimo';
  lectura.difficulty = nivel === 'basico' ? 'easy' : nivel === 'intermedio' ? 'medium' : 'hard';
  lectura.estimatedMinutes = minutos;
  lectura.summary = resumen || 'Sin resumen.';
  lectura.content = contenido;
  lectura.updatedAt = new Date().toISOString();

  // Guardar en la lista global
  const index = lecturas.findIndex((l) => l.id === lecturaId);
  lecturas[index] = lectura;
  localStorage.setItem(KEY_LECTURAS, JSON.stringify(lecturas));

  // Guardar por id
  localStorage.setItem(`lectura_${lecturaId}`, JSON.stringify(lectura));

  alert('✅ Cambios guardados.');
  window.location.href = './dashboard-teacher.html';
});