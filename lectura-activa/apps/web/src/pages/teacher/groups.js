/* Pantalla: Gestión de grupos — Dueño: Omar (P5) */

import { requireLogin } from "../../utils/authGuard.js";
import { groupsService } from "../../services/groupsService.js";
import { usersService } from "../../services/usersService.js";
import { teacherAssignmentService } from "../../services/teacherAssignmentsService.js";
import { teacherReadingService } from "../../services/teacherReadingsService.js";
import { qs, escapeHtml, debounce } from "../../utils/dom.js";

const state = {
  groups: [],
  allStudents: [],
  availableStudents: [],
  currentGroupId: null,
  selectedStudentIds: new Set(),
};

const els = {
  grid: qs("#groups-grid"),
  btnNew: qs("#btn-nuevo-grupo"),
  modalNew: qs("#modal-nuevo"),
  modalNewName: qs("#grupo-nombre"),
  modalNewYear: qs("#grupo-year"),
  btnSaveGroup: qs("#btn-guardar-grupo"),
  modalVer: qs("#modal-ver"),
  modalVerTitle: qs("#ver-titulo"),
  modalVerList: qs("#ver-estudiantes"),
  modalAdd: qs("#add-students-modal"),
  modalAddGroupName: qs("#modal-group-name"),
  searchStudents: qs("#search-students"),
  studentsList: qs("#students-to-add"),
  btnAddStudents: qs("#btn-add-students"),
  sinGrupos: qs("#sin-grupos"),
  // Modal: Asignar lectura
  modalAssign: qs("#assign-reading-modal"),
  assignGroupName: qs("#assign-group-name"),
  assignReading: qs("#assign-reading"),
  assignFrom: qs("#assign-from"),
  assignDue: qs("#assign-due"),
  assignError: qs("#assign-error"),
  assignSuccess: qs("#assign-success"),
  btnAssignReading: qs("#btn-assign-reading"),
};

/* ============================================================
   Render de grupos
   ============================================================ */
function renderGroups() {
  if (!els.grid) return;

  if (state.groups.length === 0) {
    els.grid.innerHTML = "";
    if (els.sinGrupos) els.sinGrupos.hidden = false;
    return;
  }

  if (els.sinGrupos) els.sinGrupos.hidden = true;

  els.grid.innerHTML = state.groups
    .map(
      (g) => `
    <article class="group-card">
      <h3 class="group-card__name">${escapeHtml(g.name)}</h3>
      <p class="group-card__meta">Año escolar: ${escapeHtml(g.schoolYear || "—")}</p>
      <p class="group-card__meta">${g.studentIds?.length || 0} estudiantes</p>
      <div class="group-card__actions">
        <button type="button" class="btn btn--primary btn--sm btn-add" data-id="${escapeHtml(g._id)}" data-name="${escapeHtml(g.name)}">
          + Agregar
        </button>
        <button type="button" class="btn btn--ghost btn--sm btn-assign" data-id="${escapeHtml(g._id)}" data-name="${escapeHtml(g.name)}">
          📖 Asignar
        </button>
        <button type="button" class="btn btn--ghost btn--sm btn-view" data-id="${escapeHtml(g._id)}" data-name="${escapeHtml(g.name)}">
          Ver
        </button>
        <button type="button" class="btn btn--ghost btn--sm btn-delete" data-id="${escapeHtml(g._id)}">
          Eliminar
        </button>
      </div>
    </article>
  `,
    )
    .join("");

  els.grid.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteGroup(btn.dataset.id));
  });

  els.grid.querySelectorAll(".btn-add").forEach((btn) => {
    btn.addEventListener("click", () =>
      openAddStudentsModal(btn.dataset.id, btn.dataset.name),
    );
  });

  els.grid.querySelectorAll(".btn-assign").forEach((btn) => {
    btn.addEventListener("click", () =>
      openAssignReadingModal(btn.dataset.id, btn.dataset.name),
    );
  });

  els.grid.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", () =>
      openViewStudentsModal(btn.dataset.id, btn.dataset.name),
    );
  });
}

/* ============================================================
   Cargar grupos
   ------------------------------------------------------------
   ⚠️ NOTA: GET /groups NO devuelve studentIds (por diseño del
   backend). Por eso hacemos una llamada extra por grupo a
   GET /groups/:id para traer el detalle y poder contar bien.
   ============================================================ */
async function loadGroups() {
  try {
    const resp = await groupsService.list();
    const gruposBase = resp.items || [];

    // Traer detalle (studentIds) para cada grupo
    const gruposConDetalle = await Promise.all(
      gruposBase.map(async (g) => {
        try {
          const detalle = await groupsService.getById(g._id);
          return { ...g, studentIds: detalle.studentIds || [] };
        } catch (err) {
          console.warn(
            `[groups] No se pudo cargar detalle del grupo ${g._id}:`,
            err,
          );
          return { ...g, studentIds: [] };
        }
      }),
    );

    state.groups = gruposConDetalle;
    renderGroups();
  } catch (error) {
    console.error("[groups] Error:", error);
    if (els.grid) {
      els.grid.innerHTML = `<p class="panel__hint">No se pudieron cargar los grupos: ${escapeHtml(error.message)}</p>`;
    }
  }
}

/* ============================================================
   Crear grupo (usando el modal)
   ============================================================ */
if (els.btnNew) {
  els.btnNew.addEventListener("click", () => {
    if (els.modalNewName) els.modalNewName.value = "";
    if (els.modalNewYear) els.modalNewYear.value = new Date().getFullYear();
    if (els.modalNew) els.modalNew.hidden = false;
  });
}

if (els.btnSaveGroup) {
  els.btnSaveGroup.addEventListener("click", async () => {
    const name = (els.modalNewName?.value || "").trim();
    const schoolYear = (els.modalNewYear?.value || "").trim();

    if (!name || name.length < 2) {
      alert("El nombre del grupo debe tener al menos 2 caracteres.");
      return;
    }
    if (!schoolYear) {
      alert("El año escolar es obligatorio.");
      return;
    }

    try {
      await groupsService.create({ name, schoolYear });
      if (els.modalNew) els.modalNew.hidden = true;
      await loadGroups();
    } catch (error) {
      alert("No se pudo crear el grupo: " + error.message);
    }
  });
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
   Modal: Ver estudiantes (con botón Quitar)
   ============================================================ */
async function openViewStudentsModal(groupId, groupName) {
  if (els.modalVerTitle)
    els.modalVerTitle.textContent = `Estudiantes de ${groupName}`;
  if (els.modalVerList) {
    els.modalVerList.innerHTML = `<li class="students-list__empty">Cargando...</li>`;
  }
  if (els.modalVer) els.modalVer.hidden = false;

  // Guardamos el groupId para usarlo en el delete
  state.currentGroupId = groupId;

  try {
    const resp = await groupsService.getStudents(groupId);
    const students = resp.items || [];

    if (students.length === 0) {
      els.modalVerList.innerHTML = `<li class="students-list__empty">Este grupo no tiene estudiantes todavía.</li>`;
      return;
    }

    els.modalVerList.innerHTML = students
      .map(
        (s) => `
      <li class="students-list__item">
        <div class="students-list__info">
          <span class="students-list__name">${escapeHtml(s.fullName || "—")}</span>
          <span class="students-list__email">${escapeHtml(s.email || "")}</span>
        </div>
        <button
          type="button"
          class="btn btn--ghost btn--sm btn-remove-student"
          data-student-id="${escapeHtml(s._id)}"
          data-student-name="${escapeHtml(s.fullName || s.email || "este estudiante")}"
        >
          Quitar
        </button>
      </li>
    `,
      )
      .join("");

    // Listeners de eliminar
    els.modalVerList.querySelectorAll(".btn-remove-student").forEach((btn) => {
      btn.addEventListener("click", () =>
        removeStudentFromGroup(btn.dataset.studentId, btn.dataset.studentName),
      );
    });
  } catch (error) {
    console.error("[groups] Error al cargar estudiantes del grupo:", error);
    els.modalVerList.innerHTML = `<li class="students-list__empty">Error: ${escapeHtml(error.message)}</li>`;
  }
}

/* ============================================================
   Quitar un estudiante del grupo
   ============================================================ */
async function removeStudentFromGroup(studentId, studentName) {
  if (
    !confirm(
      `¿Quitar a ${studentName} de este grupo? El estudiante seguirá existiendo, solo se quitará del grupo.`,
    )
  )
    return;

  try {
    await groupsService.removeStudent(state.currentGroupId, studentId);
    alert(`${studentName} fue quitado del grupo.`);

    // Recargar el modal (por si quiere quitar otro)
    const group = state.groups.find((g) => g._id === state.currentGroupId);
    if (group) {
      await openViewStudentsModal(state.currentGroupId, group.name);
    }

    // Recargar la lista de grupos (para actualizar el contador)
    await loadGroups();
  } catch (error) {
    console.error("[groups] Error al quitar estudiante:", error);
    alert("No se pudo quitar al estudiante: " + error.message);
  }
}

/* ============================================================
   Modal: Agregar estudiantes
   ============================================================ */
async function openAddStudentsModal(groupId, groupName) {
  state.currentGroupId = groupId;
  state.selectedStudentIds.clear();

  if (els.modalAddGroupName) els.modalAddGroupName.textContent = groupName;
  if (els.searchStudents) els.searchStudents.value = "";

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
      if (els.modalAdd) els.modalAdd.hidden = false;
      return;
    }
  }

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
  if (els.modalAdd) els.modalAdd.hidden = false;
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
    if (els.modalAdd) els.modalAdd.hidden = true;
    await loadGroups();
    alert(`${studentIds.length} estudiante(s) agregado(s) correctamente.`);
  } catch (error) {
    alert("No se pudieron agregar los estudiantes: " + error.message);
  } finally {
    updateAddButton();
  }
}

if (els.searchStudents) {
  els.searchStudents.addEventListener(
    "input",
    debounce(() => renderStudentsToAdd(), 200),
  );
}

if (els.btnAddStudents) {
  els.btnAddStudents.addEventListener("click", submitAddStudents);
}

/* ============================================================
   Modal: Asignar lectura al grupo
   ============================================================ */
async function openAssignReadingModal(groupId, groupName) {
  state.currentGroupId = groupId;

  if (els.assignGroupName) els.assignGroupName.textContent = groupName;
  if (els.assignError) els.assignError.hidden = true;
  if (els.assignSuccess) els.assignSuccess.hidden = true;

  // Defaults de fechas: hoy y +7 días
  const hoy = new Date();
  const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (els.assignFrom) els.assignFrom.value = hoy.toISOString().slice(0, 10);
  if (els.assignDue)
    els.assignDue.value = enUnaSemana.toISOString().slice(0, 10);

  // Cargar lecturas publicadas
  if (els.assignReading) {
    els.assignReading.innerHTML = `<option value="">Cargando...</option>`;
    try {
      const resp = await teacherReadingService.listPublished({ limit: 100 });
      const lecturas = resp?.data || resp?.items || [];
      if (lecturas.length === 0) {
        els.assignReading.innerHTML = `<option value="">No hay lecturas publicadas</option>`;
      } else {
        els.assignReading.innerHTML = `
          <option value="">Selecciona una lectura...</option>
          ${lecturas
            .map(
              (l) => `
            <option value="${escapeHtml(l.id || l._id)}">${escapeHtml(l.title)}</option>
          `,
            )
            .join("")}
        `;
      }
    } catch (error) {
      console.error("[groups] Error al cargar lecturas:", error);
      els.assignReading.innerHTML = `<option value="">Error al cargar lecturas</option>`;
    }
  }

  if (els.modalAssign) els.modalAssign.hidden = false;
}

async function submitAssignReading() {
  const readingId = els.assignReading?.value;
  const availableFrom = els.assignFrom?.value;
  const dueAt = els.assignDue?.value;

  if (els.assignError) els.assignError.hidden = true;
  if (els.assignSuccess) els.assignSuccess.hidden = true;

  if (!readingId) {
    if (els.assignError) {
      els.assignError.textContent = "Selecciona una lectura.";
      els.assignError.hidden = false;
    }
    return;
  }

  if (!availableFrom || !dueAt) {
    if (els.assignError) {
      els.assignError.textContent = "Completa las fechas de inicio y entrega.";
      els.assignError.hidden = false;
    }
    return;
  }

  if (new Date(dueAt) <= new Date(availableFrom)) {
    if (els.assignError) {
      els.assignError.textContent =
        "La fecha de entrega debe ser posterior a la de inicio.";
      els.assignError.hidden = false;
    }
    return;
  }

  if (els.btnAssignReading) {
    els.btnAssignReading.disabled = true;
    els.btnAssignReading.textContent = "Asignando...";
  }

  try {
    await teacherAssignmentService.create({
      readingId,
      groupId: state.currentGroupId,
      availableFrom,
      dueAt,
    });

    if (els.assignSuccess) {
      els.assignSuccess.textContent = "✅ Lectura asignada correctamente.";
      els.assignSuccess.hidden = false;
    }

    setTimeout(() => {
      if (els.modalAssign) els.modalAssign.hidden = true;
    }, 1500);
  } catch (error) {
    console.error("[groups] Error al asignar lectura:", error);
    if (els.assignError) {
      els.assignError.textContent =
        error.message || "No se pudo asignar la lectura.";
      els.assignError.hidden = false;
    }
  } finally {
    if (els.btnAssignReading) {
      els.btnAssignReading.disabled = false;
      els.btnAssignReading.textContent = "Asignar lectura";
    }
  }
}

if (els.btnAssignReading) {
  els.btnAssignReading.addEventListener("click", submitAssignReading);
}

/* ============================================================
   Cerrar modales
   ============================================================ */
[els.modalNew, els.modalVer, els.modalAdd, els.modalAssign].forEach((modal) => {
  if (!modal) return;
  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", () => {
      modal.hidden = true;
    });
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    [els.modalNew, els.modalVer, els.modalAdd, els.modalAssign].forEach(
      (modal) => {
        if (modal && !modal.hidden) modal.hidden = true;
      },
    );
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