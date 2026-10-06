/**
 * ============================================================
 * CONTRATO DE API — Grupos (ya conectado)
 * ============================================================
 *
 * Endpoints usados (ver services/groupsService.js):
 *   GET    /api/v1/groups?status=active  → { items, total, page, limit }
 *   POST   /api/v1/groups                → { name, schoolYear: string }
 *   GET    /api/v1/groups/:id            → detalle con studentIds
 *   DELETE /api/v1/groups/:id            → borrado lógico
 *
 * Lo que el backend todavía NO ofrece (por eso no está en pantalla):
 *   - código de grupo para que el estudiante se una
 *   - alta de estudiantes por correo (POST /groups/:id/students recibe
 *     ObjectId de Mongo y no hay endpoint para buscarlos)
 *   - nombres/correos de los estudiantes del grupo
 *
 * Auth: Bearer token (Supabase) · Rol requerido: teacher
 * ============================================================
 */

import { groupsService } from '../../services/groupsService.js';

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

// ============================================================
// CARGA (GET /groups)
// ============================================================
async function cargarGrupos() {
  try {
    const respuesta = await groupsService.list({ status: 'active' });
    grupos = respuesta.items || [];
    renderGrupos();
  } catch (error) {
    avisar(`No se pudieron cargar los grupos: ${error.message}`, 'error');
  }
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
    <div class="group-card" data-id="${escapeHtml(g._id)}">
      <h3 class="group-card__name">${escapeHtml(g.name)}</h3>
      <p class="group-card__meta">Año escolar: ${escapeHtml(g.schoolYear)}</p>
      <div class="group-card__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-ver="${escapeHtml(g._id)}">Ver estudiantes</button>
        <button type="button" class="btn btn--ghost btn--sm" data-del="${escapeHtml(g._id)}">Eliminar</button>
      </div>
    </div>
  `).join('');
}

// ============================================================
// MODAL: NUEVO GRUPO (POST /groups)
// ============================================================
function abrirModalNuevo() {
  $('grupo-nombre').value = '';
  $('grupo-year').value = new Date().getFullYear();
  $('modal-nuevo').hidden = false;
  $('grupo-nombre').focus();
}

function cerrarModales() {
  $('modal-nuevo').hidden = true;
  $('modal-ver').hidden = true;
}

async function crearGrupo() {
  const nombre = $('grupo-nombre').value.trim();
  const year = Number($('grupo-year').value);

  if (nombre.length < 2) { avisar('El nombre debe tener al menos 2 caracteres.', 'error'); return; }
  if (!year || year < 2024) { avisar('Año inválido.', 'error'); return; }

  const $boton = $('btn-guardar-grupo');
  $boton.disabled = true;
  try {
    await groupsService.create({ name: nombre, schoolYear: String(year) });
    cerrarModales();
    avisar(`Grupo "${nombre}" creado.`);
    await cargarGrupos();
  } catch (error) {
    avisar(`No se pudo crear el grupo: ${error.message}`, 'error');
  } finally {
    $boton.disabled = false;
  }
}

// ============================================================
// MODAL: VER GRUPO (GET /groups/:id)
// ============================================================
async function verGrupo(id) {
  const grupo = grupos.find((g) => g._id === id);
  if (!grupo) return;

  $('ver-titulo').textContent = grupo.name;
  const $lista = $('ver-estudiantes');
  $lista.innerHTML = '<li class="empty">Cargando…</li>';
  $('modal-ver').hidden = false;

  try {
    const detalle = await groupsService.getById(id);
    const total = detalle.studentIds?.length || 0;
    $lista.innerHTML = total === 0
      ? '<li class="empty">Aún no hay estudiantes en este grupo.</li>'
      : `<li>${total} estudiante${total === 1 ? '' : 's'} en este grupo.</li>`;
  } catch (error) {
    $lista.innerHTML = `<li class="empty">No se pudo cargar: ${escapeHtml(error.message)}</li>`;
  }
}

// ============================================================
// ELIMINAR (DELETE /groups/:id)
// ============================================================
async function eliminarGrupo(id) {
  const grupo = grupos.find((g) => g._id === id);
  if (!grupo) return;

  if (!confirm(`¿Eliminar el grupo "${grupo.name}"?`)) return;

  try {
    await groupsService.remove(id);
    avisar(`Grupo "${grupo.name}" eliminado.`);
    await cargarGrupos();
  } catch (error) {
    avisar(`No se pudo eliminar: ${error.message}`, 'error');
  }
}

// ============================================================
// EVENTOS
// ============================================================
cargarGrupos();

if ($('btn-nuevo-grupo')) $('btn-nuevo-grupo').addEventListener('click', abrirModalNuevo);
if ($('btn-guardar-grupo')) $('btn-guardar-grupo').addEventListener('click', crearGrupo);

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) {
    cerrarModales();
    return;
  }

  const $ver = e.target.closest('[data-ver]');
  if ($ver) {
    verGrupo($ver.dataset.ver);
    return;
  }

  const $del = e.target.closest('[data-del]');
  if ($del) {
    eliminarGrupo($del.dataset.del);
    return;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarModales();
});