/* Pantalla: Mi perfil — Dueño: Omar */

import { api } from "../../../services/apiClient.js";
import { getCurrentUser, clearSession } from "../../../state/session.js";
import { formatRole, getInitials } from "../../../utils/formatters.js";
import { qs } from "../../../utils/dom.js";

/* Estado */
const state = {
  user: null,
};

/* Referencias del DOM */
const els = {
  loading: qs("#loading-state"),
  error: qs("#error-state"),
  errorMessage: qs('[data-field="errorMessage"]'),
  content: qs("#profile-content"),
  headerName: qs('[data-field="headerName"]'),
  initials: qs('[data-field="initials"]'),
  fullName: qs('[data-field="fullName"]'),
  email: qs('[data-field="email"]'),
  roleLabel: qs('[data-field="roleLabel"]'),
  logoutButton: qs("#logout-button"),
};

/* Estados */
function showState(name) {
  if (els.loading) els.loading.hidden = name !== "loading";
  if (els.error) els.error.hidden = name !== "error";
  if (els.content) els.content.hidden = name !== "content";
}

function showError(message) {
  if (els.errorMessage) els.errorMessage.textContent = message;
  showState("error");
}

/* Render del perfil */
function renderProfile(user) {
  if (!user) {
    showError("No pudimos obtener tu información.");
    return;
  }

  const fullName = user.fullName || "Estudiante";
  const email = user.email || "—";
  const roleLabel = formatRole(user.role) || "Estudiante";
  const initials = getInitials(fullName);

  if (els.headerName) els.headerName.textContent = fullName;
  if (els.initials) els.initials.textContent = initials;
  if (els.fullName) els.fullName.textContent = fullName;
  if (els.email) els.email.textContent = email;
  if (els.roleLabel) els.roleLabel.textContent = roleLabel;

  document.title = `${fullName} — Lectura Activa`;
}

/* Cargar usuario: intenta /me, si falla usa session.js */
async function loadUser() {
  showState("loading");

  /* 1. Intentar desde el backend */
  try {
    const response = await api.get("/me");
    const user = response?.data ?? response;

    if (user) {
      state.user = user;
      renderProfile(user);
      showState("content");
      return;
    }
  } catch (error) {
    console.warn(
      "[user-profile] No se pudo cargar /me, usando session.js:",
      error,
    );
  }

  /* 2. Fallback: session.js */
  const sessionUser = getCurrentUser();

  if (sessionUser) {
    state.user = sessionUser;
    renderProfile(sessionUser);
    showState("content");
    return;
  }

  /* 3. Sin usuario: error */
  showError("No hay sesión activa. Inicia sesión de nuevo.");
}

/* Logout */
async function handleLogout() {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.warn("[user-profile] Error al cerrar sesión:", error);
  }

  clearSession();
  window.location.href = "../../auth/login.html";
}

/* Init */
function init() {
  console.info("[user-profile] Pantalla cargada.");

  if (els.logoutButton) {
    els.logoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  loadUser();
}

init();
