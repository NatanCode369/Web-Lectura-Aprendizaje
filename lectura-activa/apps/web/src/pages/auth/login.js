import { isValidEmail } from '../../utils/validators.js';
import { login } from '../../services/authService.js';
import { redirectToDashboard } from '../../state/session.js';

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const formError = document.getElementById('form-error');

form.addEventListener('submit', async (e) => {
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

  try {
    await login({ email, password });
    redirectToDashboard();
  } catch (error) {
    mostrarError(error.message || 'No se pudo iniciar sesión.');
  }
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}