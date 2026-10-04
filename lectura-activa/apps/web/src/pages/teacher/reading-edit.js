/**
 * reading-edit.js
 * Maneja la edición de una lectura existente. Mock por ahora.
 */

document.getElementById('reading-edit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Cambios guardados (mock).');
  window.location.href = './dashboard-teacher.html';
});