/* Pantalla: Login — Dueño: Omar */

import { isValidEmail } from '../../utils/validators.js';
import { login } from '../../services/authService.js';

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

  if (password.length < 8) {
    return mostrarError('La contraseña debe tener al menos 8 caracteres.');
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';
  }

  try {
    const user = await login({ email, password });

    const destino =
      user.role === 'teacher'
        ? '../teacher/dashboard-teacher.html'
        : user.role === 'admin'
          ? '../teacher/dashboard-teacher.html'
          : '../student/catalog/catalog.html';

    window.location.href = destino;
  } catch (error) {
    console.error('[login] Error:', error);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Acceder';
    }

    if (error.status === 401) {
      mostrarError('Correo o contraseña incorrectos.');
    } else if (error.status === 403) {
      mostrarError('Tu dominio de correo no está autorizado.');
    } else if (error.status === 429) {
      mostrarError('Demasiados intentos. Espera un momento.');
    } else if (error.status === 503) {
      mostrarError('El servicio de autenticación no está disponible.');
    } else {
      mostrarError(error.message || 'No pudimos iniciar sesión.');
    }
  }
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}