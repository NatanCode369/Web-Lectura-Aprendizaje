import '../../utils/analytics.js';
/**
 * ============================================================
 * CONTRATO DE API — Nueva lectura
 * ============================================================
 * 
 * Endpoints usados (ya conectado, ver services/):
 *   GET  /api/v1/groups      → grupos del docente (para elegir a quién asignar)
 *   POST /api/v1/readings    → crea la lectura en estado 'draft'
 *
 * Flujo: aquí se crea el borrador y se pasa al editor de actividades
 * (activities-edit.html?id=...), donde se guardan las actividades, se
 * publica la lectura (POST /readings/:id/publish) y se crean las
 * asignaciones (POST /assignments) de los grupos elegidos. El backend
 * exige al menos una actividad para publicar, por eso va en ese orden.
 *
 * POST /readings  { title, summary, content, difficulty: easy|medium|hard,
 *                   estimatedMinutes, activities: [] }
 *   → 201 con la lectura (id en _id). El autor sale de la sesión; el campo
 *     "autor" del formulario ya no se envía.
 *
 * Auth: Bearer token (Supabase) · Rol requerido: teacher
 * ============================================================
 */

// ============================================================
// SERVICIOS
// ============================================================
import { groupsService } from '../../services/groupsService.js';
import { teacherReadingService } from '../../services/teacherReadingsService.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ============================================================
// REFERENCIAS
// ============================================================
const form = document.getElementById('reading-form');
const radios = document.querySelectorAll('input[name="formato"]');
const cajaTexto = document.getElementById('formato-texto');
const cajaPdf = document.getElementById('formato-pdf');
const $listaGrupos = document.getElementById('lista-grupos');
const pdfInput = document.getElementById('pdf-file');

// ============================================================
// CARGAR GRUPOS DEL DOCENTE (GET /groups)
// ============================================================
async function renderGrupos() {
  if (!$listaGrupos) return;

  let grupos = [];
  try {
    const respuesta = await groupsService.list();
    grupos = respuesta.items || [];
  } catch (error) {
    $listaGrupos.innerHTML = `
      <p class="panel__hint">
        No se pudieron cargar tus grupos (${escapeHtml(error.message)}).
        Puedes guardar la lectura y asignarla después.
      </p>
    `;
    return;
  }

  if (grupos.length === 0) {
    $listaGrupos.innerHTML = `
      <p class="panel__hint">
        Aún no tienes grupos. <a href="./groups.html">Crea uno aquí</a> antes de asignar esta lectura.
      </p>
    `;
    return;
  }

  $listaGrupos.innerHTML = grupos.map((g) => `
    <label class="check">
      <input type="checkbox" name="grupos" value="${escapeHtml(g._id)}">
      <div>
        <p class="check__title">${escapeHtml(g.name)}</p>
        <p class="check__desc">${escapeHtml(g.schoolYear ?? '')}</p>
      </div>
    </label>
  `).join('');
}

renderGrupos();

// ============================================================
// TOGGLE TEXTO / PDF
// ============================================================
radios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const esPdf = document.querySelector('input[name="formato"]:checked').value === 'pdf';
    cajaTexto.hidden = esPdf;
    cajaPdf.hidden = !esPdf;
  });
});

// ============================================================
// GUARDAR LECTURA (POST /readings) → editor de actividades
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const titulo = document.getElementById('titulo').value.trim();
  const nivel = document.getElementById('nivel').value;
  const minutos = Number(document.getElementById('minutos').value) || 15;
  const resumen = document.getElementById('resumen').value.trim();
  const formato = document.querySelector('input[name="formato"]:checked').value;
  const contenido = document.getElementById('contenido').value.trim();

  if (!titulo) {
    alert('El título es obligatorio.');
    return;
  }
  if (formato === 'pdf' && !pdfInput?.files?.[0]) {
    alert('Selecciona un archivo PDF.');
    return;
  }
  if (formato === 'texto' && !contenido) {
    alert('Escribe el texto de la lectura.');
    return;
  }

  const gruposSeleccionados = [...document.querySelectorAll('input[name="grupos"]:checked')]
    .map((c) => c.value);
  const fechaInicio = document.getElementById('fecha-inicio').value;
  const fechaEntrega = document.getElementById('fecha-entrega').value;

  const $boton = form.querySelector('[type="submit"]');
  if ($boton) $boton.disabled = true;

  try {
    const lectura = await teacherReadingService.create({
      title: titulo,
      summary: resumen || 'Sin resumen.',
      content: contenido,
      nivel,
      estimatedMinutes: minutos
    });

    // Si se seleccionó PDF, subir el archivo
    if (formato === 'pdf' && pdfInput?.files?.[0]) {
      const file = pdfInput.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/readings/${lectura._id ?? lectura.id}/media`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        console.warn('No se pudo subir el PDF:', await response.text());
      }
    }

    const destino = new URLSearchParams({ id: lectura._id ?? lectura.id });
    if (gruposSeleccionados.length) destino.set('grupos', gruposSeleccionados.join(','));
    if (fechaInicio) destino.set('desde', fechaInicio);
    if (fechaEntrega) destino.set('entrega', fechaEntrega);

    window.location.href = `./activities-edit.html?${destino.toString()}`;
  } catch (error) {
    alert(`No se pudo guardar la lectura: ${error.message}`);
    if ($boton) $boton.disabled = false;
  }
});
