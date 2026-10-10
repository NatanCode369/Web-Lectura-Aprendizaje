/* Pantalla: Gestión de grupos — Dueño: Omar (P5) */

import { requireLogin } from "../../utils/authGuard.js";
import { groupsService } from "../../services/groupsService.js";
import { usersService } from "../../services/usersService.js";
import { qs, escapeHtml, debounce } from "../../utils/dom.js";

const state = {
  groups: [],
  allStudents: [], // Todos los estudiantes de la institución
  currentGroupId: null, // Grupo al que estamos agregando estudiantes
  selectedStudentIds: new Set(),
};

const els = {
  list: qs("#groups-list"),
  btnNew: qs("#btn-new-group"),
  modal: qs("#add-students-modal"),
  modalGroupName: qs("#modal-group-name"),
  searchStudents: qs("#search-students"),
  studentsList: qs("#students-to-add"),
  btnAddStudents: qs("#btn-add-students"),
};

/* ============================================================
   Render de grupos
   ============================================================ */
function renderGroups() {
  if (!els.list) return;

  if (state.groups.length === 0) {
    els.list.innerHTML = `
      <p class="panel__hint">
        Aún no tienes grupos.
        <button type="button" id="btn-empty-new" class="btn btn--link">Crea uno aquí</button>.
      </p>
    `;
    qs("#btn-empty-new")?.addEventListener("click", createGroup);
    return;
  }

  els.list.innerHTML = state.groups
    .map(
      (g) => `
    <article class="group-card">
      <div class="group-card__info">
        <h3 class="group-card__title">${escapeHtml(g.name)}</h3>
        <p class="group-card__meta">
          ${g.studentIds?.length || 0} estudiantes
        </p>
      </div>
      <div class="group-card__actions">
        <button type="button" class="btn btn--primary btn--sm btn-add" data-id="${escapeHtml(g._id)}" data-name="${escapeHtml(g.name)}">
          + Agregar estudiantes
        </button>
        <a href="./students.html?groupId=${encodeURIComponent(g._id)}" class="btn btn--ghost btn--sm">
          Ver estudiantes
        </a>
        <button type="button" class="btn btn--ghost btn--sm btn-delete" data-id="${escapeHtml(g._id)}">
          Eliminar
        </button>
      </div>
    </article>
  `,
    )
    .join("");

  els.list.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteGroup(btn.dataset.id));
  });

  els.list.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () =>
      openAddStudentsModal(btn.dataset.id, btn.dataset.name),
    );
  });
}

/* ============================================================
   Cargar grupos
   ============================================================ */
async function loadGroups() {
  try {
    const resp = await groupsService.list();
    state.groups = resp.items || [];
    renderGroups();
  } catch (error) {
    console.error("[groups] Error:", error);
    els.list.innerHTML = `<p class="panel__hint">No se pudieron cargar los grupos: ${escapeHtml(error.message)}</p>`;
  }
}

/* ============================================================
   Crear grupo
   ============================================================ */
async function createGroup() {
  const name = prompt("Nombre del nuevo grupo (ej: 4A - Mañana):");
  if (!name) return;

  const schoolYear = prompt("Año escolar (ej: 2026):") || "2026";

  try {
    await groupsService.create({ name, schoolYear });
    await loadGroups();
  } catch (error) {
    alert("No se pudo crear el grupo: " + error.message);
  }
}

/* ============================================================
   Eliminar grupo
   ============================================================ */
async function deleteGroup(id) {
  if (!confirm("¿Eliminar este grupo? Esta acción no se puede deshacer."))
    return;

  try {
    await groupsService.remove(id);
    await loadGroups();
  } catch (error) {
    alert("No se pudo eliminar el grupo: " + error.message);
  }
}

/* ============================================================
   Modal: Agregar estudiantes
   ============================================================ */
async function openAddStudentsModal(groupId, groupName) {
  state.currentGroupId = groupId;
  state.selectedStudentIds.clear();

  if (els.modalGroupName) els.modalGroupName.textContent = groupName;
  if (els.searchStudents) els.searchStudents.value = "";

  // Cargar TODOS los estudiantes (si no están cargados)
  if (state.allStudents.length === 0) {
    try {
      const resp = await usersService.listStudents();
      state.allStudents = resp.items || [];
    } catch (error) {
      console.error("[groups] Error al cargar estudiantes:", error);
      if (els.studentsList) {
        els.studentsList.innerHTML = `
          <li class="students-list__empty">
            No se pudieron cargar los estudiantes: ${escapeHtml(error.message)}
          </li>
        `;
      }
      if (els.modal) els.modal.hidden = false;
      return;
    }
  }

  // Filtrar estudiantes que ya están en el grupo
  try {
    const groupStudents = await groupsService.getStudents(groupId);
    const existingIds = new Set((groupStudents.items || []).map((s) => s._id));
    state.availableStudents = state.allStudents.filter(
      (s) => !existingIds.has(s._id),
    );
  } catch (error) {
    console.warn(
      "[groups] No se pudieron cargar estudiantes del grupo:",
      error,
    );
    state.availableStudents = state.allStudents;
  }

  renderStudentsToAdd();
  if (els.modal) els.modal.hidden = false;
}

function renderStudentsToAdd() {
  if (!els.studentsList) return;

  const query = (els.searchStudents?.value || "").trim().toLowerCase();
  const filtered = query
    ? state.availableStudents.filter(
        (s) =>
          (s.fullName || "").toLowerCase().includes(query) ||
          (s.email || "").toLowerCase().includes(query),
      )
    : state.availableStudents;

  if (filtered.length === 0) {
    els.studentsList.innerHTML = `
      <li class="students-list__empty">No hay estudiantes disponibles.</li>
    `;
    return;
  }

  els.studentsList.innerHTML = filtered
    .map(
      (s) => `
    <li class="students-list__item">
      <input
        type="checkbox"
        id="student-${escapeHtml(s._id)}"
        value="${escapeHtml(s._id)}"
        ${state.selectedStudentIds.has(s._id) ? "checked" : ""}
      />
      <label for="student-${escapeHtml(s._id)}" class="students-list__info">
        <span class="students-list__name">${escapeHtml(s.fullName || "—")}</span>
        <span class="students-list__email">${escapeHtml(s.email || "")}</span>
      </label>
    </li>
  `,
    )
    .join("");

  // Listeners de checkbox
  els.studentsList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", (e) => {
      if (e.target.checked) {
        state.selectedStudentIds.add(e.target.value);
      } else {
        state.selectedStudentIds.delete(e.target.value);
      }
      updateAddButton();
    });
  });

  updateAddButton();
}

function updateAddButton() {
  if (!els.btnAddStudents) return;
  const count = state.selectedStudentIds.size;
  els.btnAddStudents.textContent =
    count > 0
      ? `Agregar ${count} estudiante${count !== 1 ? "s" : ""}`
      : "Agregar seleccionados";
  els.btnAddStudents.disabled = count === 0;
}

async function submitAddStudents() {
  const studentIds = Array.from(state.selectedStudentIds);
  if (studentIds.length === 0) return;

  if (els.btnAddStudents) {
    els.btnAddStudents.disabled = true;
    els.btnAddStudents.textContent = "Agregando...";
  }

  try {
    await groupsService.addStudents(state.currentGroupId, studentIds);
    if (els.modal) els.modal.hidden = true;
    await loadGroups();
    alert(`${studentIds.length} estudiante(s) agregado(s) correctamente.`);
  } catch (error) {
    alert("No se pudieron agregar los estudiantes: " + error.message);
  } finally {
    updateAddButton();
  }
}

/* ============================================================
   Eventos del modal
   ============================================================ */
if (els.searchStudents) {
  els.searchStudents.addEventListener(
    "input",
    debounce(() => renderStudentsToAdd(), 200),
  );
}

if (els.btnAddStudents) {
  els.btnAddStudents.addEventListener("click", submitAddStudents);
}

if (els.modal) {
  els.modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => {
      els.modal.hidden = true;
    });
  });
}

// ESC para cerrar el modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && els.modal && !els.modal.hidden) {
    els.modal.hidden = true;
  }
});

/* ============================================================
   Init
   ============================================================ */
function init() {
  console.info("[groups] Pantalla cargada.");
  requireLogin().then((user) => {
    if (!user) return;
    loadGroups();
  });
}

init();
