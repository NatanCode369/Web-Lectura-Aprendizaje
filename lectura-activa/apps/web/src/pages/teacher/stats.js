/**
 * ============================================================
 * CONTRATO DE API — Estadísticas del docente
 * ============================================================
 * 
 * Endpoints usados:
 *   GET /api/v1/analytics/groups/:groupId      → stats por grupo
 *   GET /api/v1/analytics/readings/:readingId  → stats por lectura
 * 
 * Auth: Bearer token (Supabase)
 * Rol requerido: teacher
 * 
 * GET /analytics/groups/:groupId
 *   Query params:
 *     readingId?: string
 *   Response 200:
 *     {
 *       groupId: string,
 *       groupName: string,
 *       totalStudents: number,
 *       studentsOnTrack: number,
 *       studentsBehind: number,
 *       averageScore: number,
 *       averageTimeSeconds: number,
 *       students: [
 *         {
 *           studentId: string,
 *           studentName: string,
 *           status: 'on-track' | 'behind' | 'not-started',
 *           score: number,
 *           timeSpentSeconds: number
 *         }
 *       ]
 *     }
 * 
 * GET /analytics/readings/:readingId
 *   Response 200:
 *     {
 *       readingId: string,
 *       readingTitle: string,
 *       totalAssigned: number,
 *       totalCompleted: number,
 *       averageScore: number,
 *       averageTimeSeconds: number,
 *       hardestQuestions: [
 *         { questionId: string, questionText: string, failureRate: number }
 *       ]
 *     }
 * 
 * Errores comunes:
 *   401 UNAUTHENTICATED
 *   403 FORBIDDEN — el grupo o lectura no es del docente
 *   404 NOT_FOUND
 * 
 * TODO backend: este archivo usa localStorage por ahora.
 * Cuando el backend esté listo:
 *   import { api } from '../../services/apiClient.js';
 *   const data = await api.get(`/analytics/groups/${groupId}`);
 * ============================================================
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================
  const DOCENTE_ID = 'docente-demo';
  const KEY_GRUPOS = `grupos_${DOCENTE_ID}`;
  const KEY_LECTURAS = 'lecturas_docente';
  const NOMBRE_ESTADO = { alDia: 'Al día', atrasado: 'Atrasado', 'sin-empezar': 'Sin empezar'
};
const CLASE_ESTADO = { alDia: 'badge--ok', atrasado: 'badge--late', 'sin-empezar': 'badge--soon' };

// ============================================================
// REFERENCIAS
// ============================================================
const $ = (id) => document.getElementById(id);
const selLectura = $('filtro-lectura');
const selGrupo = $('filtro-grupo');

// ============================================================
// UTILIDADES
// ============================================================
function escapeHtml(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function promedio(valores) {
  const v = valores.filter((x) => x !== null && x !== undefined);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

function cargarGrupos() {
  try {
    return JSON.parse(localStorage.getItem(KEY_GRUPOS) || '[]');
  } catch {
    return [];
  }

  function promedio(valores) {
    const v = valores.filter((x) => x !== null && x !== undefined);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }

  function cargarGrupos() {
    try {
      return JSON.parse(localStorage.getItem(KEY_GRUPOS) || '[]');
    } catch {
      return [];
    }
  }

  function cargarLecturas() {
    try {
      return JSON.parse(localStorage.getItem(KEY_LECTURAS) || '[]');
    } catch {
      return [];
    }
  }

  // ============================================================
  // CALCULAR SCORE REAL
  // ============================================================
  function calcularScore(lecturaId, resultado) {
    const actsGuardadas = localStorage.getItem(`actividades_${lecturaId}`);
    if (!actsGuardadas) return 0;

    const acts = JSON.parse(actsGuardadas);
    const respuestas = resultado.respuestas || {};

    let correctas = 0;
    let total = 0;

    (acts.trivia || []).forEach((q, i) => {
      const idx = String(i);
      total++;
      if (respuestas[idx] === q.correcta) correctas++;
    });

    const offset = (acts.trivia || []).length;
    (acts.verdaderoFalso || []).forEach((v, j) => {
      const idx = String(offset + j);
      total++;
      if (respuestas[idx] === v.respuesta) correctas++;
    });

    if (total === 0) return 0;
    return Math.round((correctas / total) * 100);
  }

  // ============================================================
  // CONSTRUIR FILAS
  // ============================================================
  function construirFilas() {
    const lecturaId = selLectura.value;
    const grupoFiltro = selGrupo.value;

    if (!lecturaId) return [];

    const grupos = cargarGrupos();
    const filas = [];

    grupos.forEach((grupo) => {
      if (grupoFiltro !== 'todos' && grupo.nombre !== grupoFiltro) return;

      grupo.estudiantes.forEach((email) => {
        const asignaciones = JSON.parse(localStorage.getItem(`asignaciones_${email}`) || '[]');
        const asignacion = asignaciones.find((a) => a.lecturaId === lecturaId);

        if (!asignacion) return;

        const resultadoGuardado = localStorage.getItem(`resultado_${lecturaId}`);
        let estado = 'sin-empezar';
        let puntaje = null;
        let minutos = null;

        if (resultadoGuardado) {
          const r = JSON.parse(resultadoGuardado);
          puntaje = calcularScore(lecturaId, r);
          minutos = Math.round((r.tiempoUsadoSegundos || 0) / 60);

          if (puntaje >= 60) estado = 'al-dia';
          else estado = 'atrasado';
        }

        filas.push({
          nombre: email.split('@')[0],
          grupo: grupo.nombre,
          estado,
          puntaje,
          minutos
        });
      });
    });

    return filas;
  }

  // ============================================================
  // RENDER
  // ============================================================
  function renderResumen(filas) {
    const prom = promedio(filas.map((f) => f.puntaje));
    const tiempo = promedio(filas.map((f) => f.minutos));
    const alDia = filas.filter((f) => f.estado === 'al-dia').length;
    const atrasados = filas.filter((f) => f.estado === 'atrasado').length;

    $('stat-promedio').textContent = prom === null ? '—' : prom + '/100';
    $('stat-tiempo').textContent = tiempo === null ? '—' : tiempo + ' min';
    $('stat-aldia').textContent = filas.length ? Math.round((alDia / filas.length) * 100) + '%' : '—';
    $('stat-atrasados').textContent = atrasados;
  }

  function renderGrupos(filas) {
    const grupos = [...new Set(filas.map((f) => f.grupo))];

    $('progreso-grupos').innerHTML = grupos.map((g) => {
      const delGrupo = filas.filter((f) => f.grupo === g);
      const alDia = delGrupo.filter((f) => f.estado === 'al-dia').length;
      const pct = delGrupo.length ? Math.round((alDia / delGrupo.length) * 100) : 0;
      return `
        <div>
          <div class="progress__row"><span>${escapeHtml(g)}</span><span>${pct}%</span></div>
          <div class="progress"><div class="progress__bar" style="width: ${pct}%"></div></div>
        </div>`;
    }).join('') || '<p class="panel__hint">Sin datos para mostrar.</p>';
  }

  function renderEstudiantes(filas) {
    const cuerpo = $('estudiantes-body');

    if (filas.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No hay estudiantes con esta lectura asignada.</td></tr>';
      return;
    }

    cuerpo.innerHTML = filas.map((f) => `
      <tr>
        <td>${escapeHtml(f.nombre)}</td>
        <td>${escapeHtml(f.grupo)}</td>
        <td><span class="badge ${CLASE_ESTADO[f.estado]}">${NOMBRE_ESTADO[f.estado]}</span></td>
        <td>${f.puntaje === null ? '—' : f.puntaje + '/100'}</td>
        <td>${f.minutos === null ? '—' : f.minutos + ' min'}</td>
      </tr>
    `).join('');
  }

  function renderPreguntas() {
    $('preguntas-list').innerHTML = '<p class="panel__hint">Disponible cuando haya más resultados registrados.</p>';
  }

  function render() {
    const filas = construirFilas();
    renderResumen(filas);
    renderGrupos(filas);
    renderEstudiantes(filas);
    renderPreguntas();
  }

  // ============================================================
  // ARRANQUE
  // ============================================================
  const lecturas = cargarLecturas();

  if (lecturas.length === 0) {
    selLectura.innerHTML = '<option value="">— Sin lecturas —</option>';
  } else {
    selLectura.innerHTML = lecturas
      .map((l) => `<option value="${l.id}">${escapeHtml(l.title)}</option>`)
      .join('');
  }

  const grupos = cargarGrupos();
  selGrupo.innerHTML = '<option value="todos">Todos los grupos</option>' +
    grupos.map((g) => `<option value="${escapeHtml(g.nombre)}">${escapeHtml(g.nombre)}</option>`).join('');

  selLectura.addEventListener('change', render);
  selGrupo.addEventListener('change', render);

  render();
})();