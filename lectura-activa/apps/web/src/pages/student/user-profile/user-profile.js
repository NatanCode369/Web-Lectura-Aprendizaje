/**
 * user-profile.js
 * Carga los datos del perfil del estudiante.
 * Por ahora usa datos mock. Mañana se conecta a GET /api/v1/me.
 */

// ============================================================
// DATOS MOCK
// ============================================================
// TODO backend: reemplazar por:
//   import { api } from '../../../services/apiClient.js';
//   const user = await api.get('/me');
const USER_MOCK = {
  id: 'user-001',
  fullName: 'Juan López',
  email: 'estudiante@kinal.edu.gt',
  role: 'student',
  institution: { name: 'Fundación Kinal' },
  profile: { groupName: '3°A' },
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
// RENDER
// ============================================================
function renderPerfil(user) {
  document.title = `${user.fullName} — Lectura Activa`;

  llenarTodos('fullName', user.fullName);
  llenarTodos('email', user.email);
  llenarTodos('initials', iniciales(user.fullName));
  llenarTodos('roleLabel', ETIQUETA_ROL[user.role] || user.role);
  llenarTodos('institution', user.institution?.name || '—');
  llenarTodos('group', user.profile?.groupName || 'Sin grupo');
  llenarTodos('createdAt', formatearFecha(user.createdAt));
  llenarTodos('headerName', user.fullName);
}

// ============================================================
// CARGA
// ============================================================
async function cargarPerfil() {
  mostrarSoloCargando();

  // Simulamos un fetch con delay para ver el skeleton
  await new Promise((r) => setTimeout(r, 600));

  // TODO backend: reemplazar por:
  //   try {
  //     const user = await api.get('/me');
  //     renderPerfil(user);
  //     mostrarSoloContenido();
  //   } catch (err) {
  //     if (err.status === 401) { window.location.href = '../../auth/login.html'; return; }
  //     mostrarSoloError(err.message || 'Error al cargar el perfil.');
  //   }

  renderPerfil(USER_MOCK);
  mostrarSoloContenido();
}

// ============================================================
// CERRAR SESIÓN
// ============================================================
document.getElementById('logout-button').addEventListener('click', (e) => {
  // Si el href ya lleva a login, dejamos que navegue.
  // Aquí podríamos limpiar sesión antes.
  // TODO backend: llamar a authService.logout() antes de redirigir.

  // Por ahora, solo confirmamos.
  const ok = confirm('¿Cerrar sesión?');
  if (!ok) {
    e.preventDefault();
    return;
  }
  // El href ya apunta a ../../auth/login.html, dejamos que navegue.
});

// ============================================================
// INICIALIZAR
// ============================================================
cargarPerfil();