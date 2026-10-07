import '../../utils/analytics.js';
import { isInstitutionalEmail, validatePassword, validatePasswordMatch } from '../../utils/validators.js';

const form = document.getElementById('forgot-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('new-password');
const passwordConfirmInput = document.getElementById('new-password-confirm');
const formError = document.getElementById('form-error');
const formSuccess = document.getElementById('form-success');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  formError.hidden = true;
  formSuccess.hidden = true;

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;

  if (!isInstitutionalEmail(email)) {
    return mostrarError('Debes usar tu correo institucional (@kinal.edu.gt).');
  }

  const passCheck = validatePassword(password);
  if (!passCheck.valid) return mostrarError(passCheck.message);

  const matchCheck = validatePasswordMatch(password, passwordConfirm);
  if (!matchCheck.valid) return mostrarError(matchCheck.message);

  // TODO: cuando el backend esté listo, llamar a authService.forgotPassword()
  formSuccess.textContent = 'Contraseña actualizada. Redirigiendo al login...';
  formSuccess.hidden = false;

  setTimeout(() => {
    window.location.href = './login.html';
  }, 2000);
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}