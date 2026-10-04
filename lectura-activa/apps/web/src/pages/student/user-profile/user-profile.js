/**
 * user-profile.js
 * Carga el perfil del estudiante y maneja la unión a grupos por código.
 * Por ahora usa localStorage (mock). Mañana se conecta a GET /api/v1/me.
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
const ESTUDIANTE_EMAIL = 'estudiante@kinal.edu.gt'; // TODO: reemplazar por user.email real
const STORAGE_KEY_GRUPO = `grupo_estudiante_${ESTUDIANTE_EMAIL}`;
const KEY_GRUPOS_DOCENTE = 'grupos_docente-demo';

const USER_MOCK = {
  id: 'user-001',
  fullName: 'Juan López',
  email: ESTUDIANTE_EMAIL,
  role: 'student',
  institution: { name: 'Fundación Kinal' },
  profile: { groupName: 'Sin grupo' },
  createdAt: '2026-08-01T12:00:00Z'
};

const ETIQUETA_ROL = {
  student: 'Estudiante',
  teacher: 'Docente',
  admin: 'Administrador'
};

// ============================================================
// REFERENCIAS
// ============================================================
const $ = (id) => document.getElementById(id);
const $loading = $('loading-state');
const $error = $('error-state');
const $content = $('profile-content');

// ============================================================
// UTILIDADES
// ============================================================
function mostrarSoloCargando() {
  $loading.hidden = false;
  $error.hidden = true;
  $content.hidden = true;
}

function mostrarSoloError(mensaje) {
  $loading.hidden = true;
  $error.hidden = false;
  $content.hidden = true;
  document.querySelector('[data-field="errorMessage"]').textContent = mensaje;
}

function mostrarSoloContenido() {
  $loading.hidden = true;
  $error.hidden = true;
  $content.hidden = false;
}

function llenarTodos(campo, valor) {
  document.querySelectorAll(`[data-field="${campo}"]`).forEach((el) => {
    el.textContent = valor;
  });
}

function iniciales(nombre) {
  if (!nombre) return '??';
  const partes = nombre.trim().split(/\s+/);
  const primera = partes[0]?.[0] || '';
  const segunda = partes[1]?.[0] || '';
  return (primera + segunda).toUpperCase();
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${dia}/${mes}/${year}`;
}

// ============================================================
// RENDER PERFIL
// ============================================================
function renderPerfil(user) {
  document.title = `${user.fullName} — Lectura Activa`;
  llenarTodos('fullName', user.fullName);
  llenarTodos('email', user.email);
  llenarTodos('initials', iniciales(user.fullName));
  llenarTodos('roleLabel', ETIQUETA_ROL[user.role] || user.role);
  llenarTodos('institution', user.institution?.name || '—');
  llenarTodos('createdAt', formatearFecha(user.createdAt));
  llenarTodos('headerName', user.fullName);
}

// ============================================================
// CARGA DE PERFIL
// ============================================================
async function cargarPerfil() {
  mostrarSoloCargando();
  await new Promise((r) => setTimeout(r, 400));

  // TODO backend: reemplazar por api.get('/me')
  const user = USER_MOCK;
  renderPerfil(user);
  mostrarSoloContenido();
}

cargarPerfil();

// ============================================================
// GRUPOS — unirse por código
// ============================================================
const $sinGrupo = $('sin-grupo');
const $conGrupo = $('con-grupo');
const $codigoGrupo = $('codigo-grupo');
const $unirseMensaje = $('unirse-mensaje');
const $nombreGrupo = $('nombre-grupo');
const $yearGrupo = $('year-grupo');

function cargarMiembro() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_GRUPO) || 'null');
  } catch {
    return null;
  }
}

function guardarMiembro(data) {
  if (data) localStorage.setItem(STORAGE_KEY_GRUPO, JSON.stringify(data));
  else localStorage.removeItem(STORAGE_KEY_GRUPO);
}

function cargarGruposDocente() {
  try {
    return JSON.parse(localStorage.getItem(KEY_GRUPOS_DOCENTE) || '[]');
  } catch {
    return [];
  }
}

function guardarGruposDocente(grupos) {
  localStorage.setItem(KEY_GRUPOS_DOCENTE, JSON.stringify(grupos));
}

function renderMiembro() {
  const miembro = cargarMiembro();
  if (miembro) {
    $sinGrupo.hidden = true;
    $conGrupo.hidden = false;
    $nombreGrupo.textContent = miembro.nombreGrupo;
    $yearGrupo.textContent = miembro.year;

    // Actualizar también el grupo en "Información personal"
    llenarTodos('group', miembro.nombreGrupo);
  } else {
    $sinGrupo.hidden = false;
    $conGrupo.hidden = true;
    llenarTodos('group', 'Sin grupo');
  }
}

function avisarUnirse(texto, tipo = 'ok') {
  $unirseMensaje.textContent = texto;
  $unirseMensaje.style.color = tipo === 'error' ? '#ef4444' : '#22c55e';
  $unirseMensaje.hidden = false;
  setTimeout(() => { $unirseMensaje.hidden = true; }, 4000);
}

// Unirse a un grupo
$('btn-unirse').addEventListener('click', () => {
  const codigo = $codigoGrupo.value.trim().toUpperCase();
  if (!codigo) {
    avisarUnirse('Ingresa el código del grupo.', 'error');
    return;
  }

  const grupos = cargarGruposDocente();
  const grupo = grupos.find((g) => g.codigo === codigo);
  if (!grupo) {
    avisarUnirse('Código no válido o grupo no encontrado.', 'error');
    return;
  }

  if (grupo.estudiantes.includes(ESTUDIANTE_EMAIL)) {
    avisarUnirse('Ya estás en este grupo.', 'error');
    return;
  }

  grupo.estudiantes.push(ESTUDIANTE_EMAIL);
  guardarGruposDocente(grupos);

  guardarMiembro({
    grupoId: grupo.id,
    nombreGrupo: grupo.nombre,
    year: grupo.year
  });

  avisarUnirse(`Te uniste al grupo "${grupo.nombre}".`);
  $codigoGrupo.value = '';
  renderMiembro();
});

// Salir de un grupo
$('btn-salir-grupo').addEventListener('click', () => {
  const miembro = cargarMiembro();
  if (!miembro) return;

  if (!confirm(`¿Salir del grupo "${miembro.nombreGrupo}"?`)) return;

  const grupos = cargarGruposDocente();
  const grupo = grupos.find((g) => g.id === miembro.grupoId);
  if (grupo) {
    grupo.estudiantes = grupo.estudiantes.filter((e) => e !== ESTUDIANTE_EMAIL);
    guardarGruposDocente(grupos);
  }

  guardarMiembro(null);
  renderMiembro();
});

renderMiembro();