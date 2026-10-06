/**
 * ============================================================
 * CONTRATO DE API — Editar lectura (ya conectado)
 * ============================================================
 *
 * Endpoints usados (ver services/):
 *   GET   /api/v1/readings/:id   → carga la lectura (el autor ve sus borradores)
 *   PATCH /api/v1/readings/:id   → { title, summary, content, difficulty,
 *                                    estimatedMinutes } (suben la version)
 *   GET   /api/v1/assignments    → asignaciones del docente (se filtran por lectura)
 *   GET   /api/v1/groups         → nombres de los grupos
 *
 * Las actividades se editan en activities-edit.html. El autor sale de la
 * sesión: el backend no permite cambiarlo, por eso el campo va bloqueado.
 *
 * Auth: Bearer token (Supabase) · Rol requerido: teacher (autor)
 * ============================================================
 */

import { teacherReadingService, nivelFromApi } from '../../services/teacherReadingsService.js';
import { teacherAssignmentService } from '../../services/teacherAssignmentsService.js';
import { groupsService } from '../../services/groupsService.js';

const TIPO_INFO = {
  multiple_choice: 'Preguntas tipo trivia',
  true_false: 'Verdadero o falso rápido',
  ordering: 'Ordena la historia',
  matching: 'Mapa mental',
  short_answer: 'Respuesta corta'
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
  return `${dia}/${mes}/${d.getFullYear()}`;
}

const $ = (id) => document.getElementById(id);

// ============================================================
// RENDER
// ============================================================
function renderActividades(actividades) {
  const $lista = $('lista-actividades');
  if (!$lista) return;

  if (!actividades.length) {
    $lista.innerHTML = '<p class="panel__hint">Esta lectura no tiene actividades configuradas.</p>';
    return;
  }

  $lista.innerHTML = actividades.map((a) => `
    <label class="check">
      <input type="checkbox" checked disabled>
      <div>
        <p class="check__title">${escapeHtml(TIPO_INFO[a.type] || a.type)}</p>
        <p class="check__desc">${escapeHtml(a.prompt)}</p>
      </div>
    </label>
  `).join('');
}

async function renderAsignaciones(lecturaId) {
  const $body = $('asignaciones-body');
  if (!$body) return;

  const fila = (texto) => `
    <tr>
      <td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">${texto}</td>
    </tr>
  `;

  try {
    const [asignaciones, grupos] = await Promise.all([
      teacherAssignmentService.list(),
      groupsService.list()
    ]);
    const nombres = new Map((grupos.items || []).map((g) => [g._id, g.name]));
    const propias = (asignaciones.items || []).filter((a) => a.readingId === lecturaId);

    if (!propias.length) {
      $body.innerHTML = fila('Esta lectura no está asignada a ningún grupo.');
      return;
    }

    $body.innerHTML = propias.map((a) => `
      <tr>
        <td>${escapeHtml(nombres.get(a.groupId) || 'Grupo')}</td>
        <td>${formatearFecha(a.availableFrom)}</td>
        <td>${formatearFecha(a.dueAt)}</td>
        <td><span class="badge badge--ok">${a.status === 'closed' ? 'Cerrada' : 'En curso'}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    $body.innerHTML = fila(`No se pudieron cargar las asignaciones (${escapeHtml(error.message)}).`);
  }
}

// ============================================================
// INICIAR: cargar la lectura desde ?id=
// ============================================================
async function init() {
  const lecturaId = new URLSearchParams(window.location.search).get('id');
  if (!lecturaId) {
    alert('No se especificó qué lectura editar.');
    window.location.href = './dashboard-teacher.html';
    return;
  }

  let lectura;
  try {
    lectura = await teacherReadingService.getById(lecturaId);
  } catch (error) {
    alert(`No se pudo cargar la lectura: ${error.message}`);
    window.location.href = './dashboard-teacher.html';
    return;
  }

  $('titulo').value = lectura.title || '';
  $('autor').value = '';
  $('autor').placeholder = 'Se toma de tu sesión';
  $('autor').disabled = true;
  $('nivel').value = nivelFromApi(lectura.difficulty);
  $('minutos').value = lectura.estimatedMinutes || 15;
  $('resumen').value = lectura.summary || '';
  $('contenido').value = lectura.content || '';

  renderActividades(lectura.activities || []);
  renderAsignaciones(lecturaId);

  // ============================================================
  // GUARDAR CAMBIOS (PATCH /readings/:id)
  // ============================================================
  $('reading-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = $('titulo').value.trim();
    const contenido = $('contenido').value.trim();
    if (!titulo) {
      alert('El título es obligatorio.');
      return;
    }
    if (!contenido) {
      alert('El texto de la lectura no puede quedar vacío.');
      return;
    }

    const $boton = e.target.querySelector('[type="submit"]');
    if ($boton) $boton.disabled = true;

    try {
      await teacherReadingService.update(lecturaId, {
        title: titulo,
        summary: $('resumen').value.trim() || 'Sin resumen.',
        content: contenido,
        nivel: $('nivel').value,
        estimatedMinutes: Number($('minutos').value) || 15
      });
      alert('✅ Cambios guardados.');
      window.location.href = './dashboard-teacher.html';
    } catch (error) {
      alert(`No se pudieron guardar los cambios: ${error.message}`);
      if ($boton) $boton.disabled = false;
    }
  });
}

init();
