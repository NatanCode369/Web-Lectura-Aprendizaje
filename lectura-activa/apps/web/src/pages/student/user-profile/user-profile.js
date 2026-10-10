import "../../../utils/analytics.js";
/* Pantalla: Mi perfil — Dueño: Omar */

import { api } from "../../../services/apiClient.js";
import { getCurrentUser, clearSession } from "../../../state/session.js";
import { formatRole, getInitials } from "../../../utils/formatters.js";
import { qs, qsa } from "../../../utils/dom.js";

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
  // ⚠️ Estos aparecen MÁS DE UNA VEZ en el HTML → usar qsa()
  fullName: qsa('[data-field="fullName"]'),
  email: qsa('[data-field="email"]'),
  roleLabel: qsa('[data-field="roleLabel"]'),
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

/* Helper: actualizar todos los elementos de un array */
function setAll(elements, text) {
  if (!elements) return;
  elements.forEach((el) => {
    el.textContent = text;
  });
}

/* Render */
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

  // ⚠️ Actualizar TODOS los elementos con el mismo data-field
  setAll(els.fullName, fullName);
  setAll(els.email, email);
  setAll(els.roleLabel, roleLabel);

  document.title = `${fullName} — Lectura Activa`;
}

/* Cargar usuario: intenta /me, si falla usa session.js */
async function loadUser() {
  showState("loading");

  try {
    const response = await api.get("/me");
    const user = response?.user ?? response?.data ?? response;

    if (user && (user._id || user.email)) {
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

  /* Fallback: session.js */
  const sessionUser = getCurrentUser();

  if (sessionUser) {
    state.user = sessionUser;
    renderProfile(sessionUser);
    showState("content");
    return;
  }

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
