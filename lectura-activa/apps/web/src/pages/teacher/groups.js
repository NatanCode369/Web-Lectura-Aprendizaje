/**
 * ============================================================
 * CONTRATO DE API — Grupos del docente
 * ============================================================
 * 
 * Endpoints usados:
 *   GET    /api/v1/groups              → listar grupos del docente
 *   POST   /api/v1/groups              → crear grupo
 *   GET    /api/v1/groups/:id          → ver un grupo
 *   DELETE /api/v1/groups/:id          → eliminar grupo (borrado lógico)
 * 
 * Endpoint extra (NO está en el MD, requiere ADR):
 *   POST   /api/v1/groups/join         → unirse por código (rol: student)
 * 
 * Auth: Bearer token (Supabase)
 * Rol requerido: teacher
 * 
 * GET /groups
 *   Response 200:
 *     {
 *       data: [
 *         {
 *           id: string,
 *           name: string,
 *           schoolYear: number,
 *           code: string,
 *           studentIds: string[],
 *           studentEmails: string[],
 *           status: 'active' | 'archived',
 *           createdAt: ISO,
 *           updatedAt: ISO
 *         }
 *       ],
 *       meta: { page: 1, limit: 20, total: 1 }
 *     }
 * 
 * POST /groups
 *   Request body:
 *     { name: string, schoolYear: number, studentIds: string[] }
 *   Response 201:
 *     {
 *       id: string,
 *       name: string,
 *       schoolYear: number,
 *       code: string,          // generado por el backend
 *       studentIds: [],
 *       status: 'active',
 *       createdAt: ISO
 *     }
 * 
 * DELETE /groups/:id
 *   Response 204 (no content)
 * 
 * Errores comunes:
 *   400 VALIDATION_ERROR
 *   401 UNAUTHENTICATED
 *   403 FORBIDDEN — no es docente o el grupo no es suyo
 *   404 NOT_FOUND — grupo no existe
 *   409 CONFLICT — código ya existe (raro, el backend lo genera)
 * 
 * TODO backend: este archivo usa localStorage por ahora.
 * Cuando el backend esté listo:
 *   import { api } from '../../services/apiClient.js';
 *   const grupos = await api.get('/groups');
 *   const nuevo = await api.post('/groups', { name, schoolYear });
 *   await api.delete(`/groups/${id}`);
 * ============================================================
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const DOCENTE_ID = 'docente-demo'; // TODO: reemplazar por user.id real
const STORAGE_KEY = `grupos_${DOCENTE_ID}`;

const $ = (id) => document.getElementById(id);

let grupos = [];

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

function avisar(texto, tipo = 'ok') {
  const $msg = $('mensaje');
  if (!$msg) return;
  $msg.textContent = texto;
  $msg.className = `alert alert--${tipo}`;
  $msg.hidden = false;
  setTimeout(() => { $msg.hidden = true; }, 3000);
}

function generarCodigo(nombre, year) {
  const limpio = nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'GRUPO';
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${limpio}-KINAL-${year}-${random}`;
}

function generarId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

// ============================================================
// PERSISTENCIA
// ============================================================
function cargarGrupos() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function guardarGrupos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(grupos));
}

// ============================================================
// RENDER
// ============================================================
function renderGrupos() {
  const $grid = $('groups-grid');
  const $sin = $('sin-grupos');
  if (!$grid || !$sin) return;

  if (grupos.length === 0) {
    $grid.innerHTML = '';
    $sin.hidden = false;
    return;
  }

  $sin.hidden = true;
  $grid.innerHTML = grupos.map((g) => `
    <div class="group-card" data-id="${g.id}">
      <h3 class="group-card__name">${escapeHtml(g.nombre)}</h3>
      <p class="group-card__meta">Año escolar: ${g.year}</p>
      <p class="group-card__meta">
        ${g.estudiantes.length} estudiante${g.estudiantes.length === 1 ? '' : 's'}
      </p>
      <div class="group-card__code">
        <span>${escapeHtml(g.codigo)}</span>
        <button type="button" class="group-card__copy" data-copy="${escapeHtml(g.codigo)}" title="Copiar código">📋</button>
      </div>
      <div class="group-card__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-ver="${g.id}">Ver estudiantes</button>
        <button type="button" class="btn btn--ghost btn--sm" data-del="${g.id}">Eliminar</button>
      </div>
    </div>
  `).join('');
}

// ============================================================
// MODAL: NUEVO GRUPO
// ============================================================
function abrirModalNuevo() {
  const yearActual = new Date().getFullYear();
  $('grupo-nombre').value = '';
  $('grupo-year').value = yearActual;
  $('grupo-codigo').value = generarCodigo('GRUPO', yearActual);
  $('modal-nuevo').hidden = false;
  $('grupo-nombre').focus();
}

function cerrarModales() {
  $('modal-nuevo').hidden = true;
  $('modal-ver').hidden = true;
}

function crearGrupo() {
  const nombre = $('grupo-nombre').value.trim();
  const year = Number($('grupo-year').value);
  const codigo = $('grupo-codigo').value.trim();

  if (!nombre) { avisar('Escribe un nombre para el grupo.', 'error'); return; }
  if (!year || year < 2024) { avisar('Año inválido.', 'error'); return; }
  if (grupos.some((g) => g.codigo === codigo)) {
    avisar('Ese código ya existe. Genera otro.', 'error');
    return;
  }

  grupos.push({
    id: generarId(),
    nombre,
    year,
    codigo,
    estudiantes: [],
    createdAt: new Date().toISOString()
  });

  guardarGrupos();
  renderGrupos();
  cerrarModales();
  avisar(`Grupo "${nombre}" creado. Código: ${codigo}`);
}

// ============================================================
// MODAL: VER GRUPO
// ============================================================
function verGrupo(id) {
  const grupo = grupos.find((g) => g.id === id);
  if (!grupo) return;

  $('ver-titulo').textContent = grupo.nombre;
  $('ver-codigo').textContent = grupo.codigo;

  const $lista = $('ver-estudiantes');
  if (grupo.estudiantes.length === 0) {
    $lista.innerHTML = '<li class="empty">Aún no hay estudiantes en este grupo.</li>';
  } else {
    $lista.innerHTML = grupo.estudiantes
      .map((e) => `<li>${escapeHtml(e)}</li>`)
      .join('');
  }

  $('modal-ver').hidden = false;
}

// ============================================================
// ELIMINAR
// ============================================================
function eliminarGrupo(id) {
  const grupo = grupos.find((g) => g.id === id);
  if (!grupo) return;

  if (!confirm(`¿Eliminar el grupo "${grupo.nombre}"?`)) return;

  grupos = grupos.filter((g) => g.id !== id);
  guardarGrupos();
  renderGrupos();
  avisar(`Grupo "${grupo.nombre}" eliminado.`);
}

// ============================================================
// EVENTOS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  grupos = cargarGrupos();
  renderGrupos();
});

// Solo conectar los eventos si los elementos existen
if ($('btn-nuevo-grupo')) $('btn-nuevo-grupo').addEventListener('click', abrirModalNuevo);
if ($('btn-guardar-grupo')) $('btn-guardar-grupo').addEventListener('click', crearGrupo);
if ($('btn-regenerar')) {
  $('btn-regenerar').addEventListener('click', () => {
    const nombre = $('grupo-nombre').value.trim() || 'GRUPO';
    const year = Number($('grupo-year').value) || new Date().getFullYear();
    $('grupo-codigo').value = generarCodigo(nombre, year);
  });
}

if ($('grupo-nombre')) {
  $('grupo-nombre').addEventListener('input', () => {
    const nombre = $('grupo-nombre').value.trim() || 'GRUPO';
    const year = Number($('grupo-year').value) || new Date().getFullYear();
    $('grupo-codigo').value = generarCodigo(nombre, year);
  });
}

if ($('grupo-year')) {
  $('grupo-year').addEventListener('input', () => {
    const nombre = $('grupo-nombre').value.trim() || 'GRUPO';
    const year = Number($('grupo-year').value) || new Date().getFullYear();
    $('grupo-codigo').value = generarCodigo(nombre, year);
  });
}

document.addEventListener('click', (e) => {
  // Cerrar modales
  if (e.target.closest('[data-close]')) {
    cerrarModales();
    return;
  }

  // Copiar código
  const $copy = e.target.closest('[data-copy]');
  if ($copy) {
    navigator.clipboard.writeText($copy.dataset.copy).then(() => {
      avisar('Código copiado al portapapeles.');
    });
    return;
  }

  // Ver estudiantes
  const $ver = e.target.closest('[data-ver]');
  if ($ver) {
    verGrupo($ver.dataset.ver);
    return;
  }

  // Eliminar
  const $del = e.target.closest('[data-del]');
  if ($del) {
    eliminarGrupo($del.dataset.del);
    return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarModales();
});