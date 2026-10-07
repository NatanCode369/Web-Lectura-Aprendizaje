import '../../utils/analytics.js';
import { isInstitutionalEmail, validatePassword, validateFullName, validatePasswordMatch } from '../../utils/validators.js';

const form = document.getElementById('register-form');
const nombreInput = document.getElementById('nombre');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const formError = document.getElementById('form-error');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  formError.hidden = true;

  const nombre = nombreInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;

  const nombreCheck = validateFullName(nombre);
  if (!nombreCheck.valid) return mostrarError(nombreCheck.message);

  if (!isInstitutionalEmail(email)) {
    return mostrarError('Debes usar tu correo institucional (@kinal.edu.gt).');
  }

  const passCheck = validatePassword(password);
  if (!passCheck.valid) return mostrarError(passCheck.message);

  const matchCheck = validatePasswordMatch(password, passwordConfirm);
  if (!matchCheck.valid) return mostrarError(matchCheck.message);

  // TODO: cuando el backend esté listo, llamar a authService.register()
  alert('Registro exitoso. Ahora puedes iniciar sesión.');
  window.location.href = './login.html';
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}