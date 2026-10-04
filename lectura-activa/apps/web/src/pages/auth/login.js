import { isValidEmail } from '../../utils/validators.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const formError = document.getElementById('form-error');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  formError.hidden = true;

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!isValidEmail(email)) {
    return mostrarError('Ingresa un correo válido.');
  }

  if (!email.endsWith('@kinal.edu.gt')) {
    return mostrarError('Debes usar tu correo institucional (@kinal.edu.gt).');
  }

  if (password.length < 8) {
    return mostrarError('La contraseña debe tener al menos 8 caracteres.');
  }

  // TODO: cuando el backend esté listo, llamar a authService.login()
  // Por ahora redirige según el correo (mock temporal)
  const esDocente = email.includes('docente') || email.startsWith('t');
  const destino = esDocente
    ? '../teacher/dashboard-teacher.html'
    : '../student/catalog/catalog.html';

  window.location.href = destino;
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}