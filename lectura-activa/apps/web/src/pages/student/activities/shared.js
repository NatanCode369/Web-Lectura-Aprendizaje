import { assignmentService } from "../../../services/assignmentsService.js";
import { qs, getParam, generateRequestId } from "../../../utils/dom.js";

/**
 * Carga la tarea + la actividad específica desde el backend.
 */
export async function loadActivityContext() {
  const studentAssignmentId = getParam("id");
  const activityId = getParam("activityId");

  if (!studentAssignmentId || !activityId) {
    throw new Error("Faltan parámetros en la URL.");
  }

  const saResponse = await assignmentService.getMine(studentAssignmentId);
  const studentAssignment = saResponse?.data ?? saResponse;

  if (!studentAssignment) {
    throw new Error("No encontramos esta tarea.");
  }

  const startResponse = await assignmentService.start(
    studentAssignment.assignmentId,
    generateRequestId(),
  );

  const activities = startResponse?.activitySnapshot || [];
  const activity = activities.find(
    (a) => String(a.activityId) === String(activityId),
  );

  if (!activity) {
    throw new Error("No encontramos esta actividad.");
  }

  return { studentAssignment, activity };
}

/**
 * Envía el intento al backend.
 */
export async function submitAttempt(
  studentAssignment,
  activityId,
  answers,
  timeSpentSeconds,
) {
  return assignmentService.submitAttempt(studentAssignment.assignmentId, {
    requestId: generateRequestId(),
    activityId,
    answers,
    timeSpentSeconds,
  });
}

/**
 * Redirige a la pantalla de lectura indicando "from=activity" para
 * que el flujo guiado continúe con la siguiente actividad pendiente.
 */
export function goBackToReading(studentAssignmentId) {
  window.location.href = `../reading-activity/reading-activity.html?id=${encodeURIComponent(
    studentAssignmentId,
  )}&from=activity`;
}

/**
 * Renderiza una pantalla de error.
 */
export function showActivityError(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="activity__finish">
      <h2>Algo salió mal</h2>
      <p class="activity__msg">${message}</p>
      <div class="activity__actions">
        <a href="../my-tasks/my-tasks.html" class="btn btn--primary">Volver a Mis tareas</a>
      </div>
    </div>
  `;
}

/**
 * Renderiza una pantalla de éxito con botón "Siguiente actividad".
 */
export function showActivitySuccess(
  container,
  { title, score, total, message },
  studentAssignmentId,
) {
  container.innerHTML = `
    <div class="activity__finish">
      <h2>${title}</h2>
      <p class="activity__score">${score} / ${total}</p>
      <p class="activity__msg">${message}</p>
      <div class="activity__actions">
        <a
          href="../reading-activity/reading-activity.html?id=${encodeURIComponent(
            studentAssignmentId,
          )}&from=activity"
          class="btn btn--primary"
        >
          Siguiente actividad →
        </a>
      </div>
    </div>
  `;
}