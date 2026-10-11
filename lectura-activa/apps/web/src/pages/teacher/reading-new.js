import '../../utils/analytics.js';
/**
 * ============================================================
 * CONTRATO DE API — Nueva lectura
 * ============================================================
 * 
 * Flujo: aquí se crea la lectura Y, si el usuario clica "Publicar",
 * se publica inmediatamente. Luego se pasa al editor de actividades.
 * ============================================================
 */

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

const form = document.getElementById('reading-form');
const radios = document.querySelectorAll('input[name="formato"]');
const cajaTexto = document.getElementById('formato-texto');
const cajaPdf = document.getElementById('formato-pdf');
const $listaGrupos = document.getElementById('lista-grupos');
const pdfInput = document.getElementById('pdf');

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

radios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const esPdf = document.querySelector('input[name="formato"]:checked').value === 'pdf';
    cajaTexto.hidden = esPdf;
    cajaPdf.hidden = !esPdf;
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const titulo = document.getElementById('titulo').value.trim();
  const nivel = document.getElementById('nivel').value;
  const minutos = Number(document.getElementById('minutos').value) || 15;
  const resumen = document.getElementById('resumen').value.trim();
  const formato = document.querySelector('input[name="formato"]:checked').value;
  const contenido = document.getElementById('contenido').value.trim();

  // ✅ FIX: detectar qué botón disparó el submit
  const submitter = e.submitter;
  const esPublicar = submitter?.value === 'publish';

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

  if (submitter) submitter.disabled = true;

  try {
    const lectura = await teacherReadingService.create({
      title: titulo,
      summary: resumen || 'Sin resumen.',
      content: contenido,
      nivel,
      estimatedMinutes: minutos
    });

    const lecturaId = lectura._id ?? lectura.id;

    // Subir PDF si es necesario
    if (formato === 'pdf' && pdfInput?.files?.[0]) {
      const file = pdfInput.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/readings/${lecturaId}/media`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        console.warn('No se pudo subir el PDF:', await response.text());
      }
    }

    // ✅ FIX: si el usuario clicó "Publicar lectura", publicar ahora
    if (esPublicar) {
      try {
        await teacherReadingService.publish(lecturaId);
        console.log('[reading-new] Lectura publicada automáticamente');
      } catch (pubError) {
        console.warn('[reading-new] No se pudo publicar automáticamente:', pubError);
      }
    }

    const destino = new URLSearchParams({ id: lecturaId });
    if (gruposSeleccionados.length) destino.set('grupos', gruposSeleccionados.join(','));
    if (fechaInicio) destino.set('desde', fechaInicio);
    if (fechaEntrega) destino.set('entrega', fechaEntrega);

    window.location.href = `./activities-edit.html?${destino.toString()}`;
  } catch (error) {
    alert(`No se pudo guardar la lectura: ${error.message}`);
    if (submitter) submitter.disabled = false;
  }
});