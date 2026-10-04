/* Utilidades de formato — Dueño: Omar */

const DIFFICULTY_LABELS = {
  easy: "Fácil",
  medium: "Medio",
  hard: "Difícil",
};

const LEVEL_LABELS = {
  easy: "Principiante",
  medium: "Intermedio",
  hard: "Avanzado",
};

const ROLE_LABELS = {
  student: "Estudiante",
  teacher: "Docente",
  admin: "Administrador",
};

export function formatDifficulty(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || difficulty || "";
}

export function formatLevel(difficulty) {
  return LEVEL_LABELS[difficulty] || difficulty || "";
}

export function formatRole(role) {
  return ROLE_LABELS[role] || role || "";
}

export function formatDate(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatTime(seconds) {
  if (seconds == null || seconds < 0) return "—";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

export function formatTimer(seconds) {
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return seconds < 0 ? `-${formatted}` : formatted;
}

export function getInitials(fullName) {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getScoreLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

export function getMotivationMessage(score) {
  if (score >= 90) return "¡Excelente trabajo! Dominas esta lectura.";
  if (score >= 70) return "¡Muy bien! Vas por buen camino.";
  if (score >= 50) return "Buen intento. Repasa las respuestas incorrectas.";
  return "No te desanimes. Revisa la lectura con calma.";
}
