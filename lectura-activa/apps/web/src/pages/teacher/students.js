/* Pantalla: Lista de estudiantes — Dueño: Omar (P5) */

import { requireLogin } from "../../utils/authGuard.js";
import { groupsService } from "../../services/groupsService.js";
import { qs, escapeHtml } from "../../utils/dom.js";

const state = {
  groups: [],
  students: [],
  filterGroupId: "",
};

const els = {
  filterGroup: qs("#filter-group"),
  tableBody: qs("#students-body"),
};

/* ---------- Render del filtro de grupos ---------- */
function renderGroupsFilter() {
  if (!els.filterGroup) return;
  els.filterGroup.innerHTML = `
    <option value="">Todos los grupos</option>
    ${state.groups
      .map(
        (g) => `
      <option value="${escapeHtml(g._id)}">${escapeHtml(g.name)}</option>
    `,
      )
      .join("")}
  `;
}

/* ---------- Render de la tabla ---------- */
function renderStudents() {
  if (!els.tableBody) return;

  const filtered = state.filterGroupId
    ? state.students.filter((s) => s.groupId === state.filterGroupId)
    : state.students;

  if (filtered.length === 0) {
    els.tableBody.innerHTML = `
      <tr><td colspan="5" class="table__empty">No hay estudiantes en este grupo.</td></tr>
    `;
    return;
  }

  els.tableBody.innerHTML = filtered
    .map(
      (s) => `
    <tr>
      <td>${escapeHtml(s.fullName || "—")}</td>
      <td>${escapeHtml(s.email || "—")}</td>
      <td>${escapeHtml(s.groupName || "—")}</td>
      <td>
        <div class="progress progress--sm">
          <div class="progress__bar" style="width: ${s.progress || 0}%"></div>
        </div>
        <span class="progress__label">${s.progress || 0}%</span>
      </td>
      <td>${s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleDateString("es-GT") : "—"}</td>
    </tr>
  `,
    )
    .join("");
}

/* ---------- Carga de datos ---------- */
async function loadStudents() {
  try {
    // 1. Cargar grupos del profesor
    const groupsResp = await groupsService.list({ limit: 100 });
    state.groups = groupsResp.items || [];
    renderGroupsFilter();

    // 2. Cargar estudiantes de cada grupo
    const allStudents = [];
    for (const group of state.groups) {
      try {
        const studentsResp = await groupsService.getStudents(group._id);
        const students = studentsResp.items || [];
        students.forEach((s) => {
          allStudents.push({
            ...s,
            groupId: group._id,
            groupName: group.name,
          });
        });
      } catch (err) {
        console.warn(
          `[students] Error al cargar estudiantes del grupo ${group._id}:`,
          err,
        );
      }
    }
    state.students = allStudents;

    renderStudents();
  } catch (error) {
    console.error("[students] Error:", error);
    if (els.tableBody) {
      els.tableBody.innerHTML = `
        <tr><td colspan="5" class="table__empty">No se pudo cargar la lista: ${escapeHtml(error.message)}</td></tr>
      `;
    }
  }
}

/* ---------- Eventos ---------- */
els.filterGroup?.addEventListener("change", (e) => {
  state.filterGroupId = e.target.value;
  renderStudents();
});

/* ---------- Init ---------- */
function init() {
  console.info("[students] Pantalla cargada.");
  requireLogin().then((user) => {
    if (!user) return;
    loadStudents();
  });
}

init();
