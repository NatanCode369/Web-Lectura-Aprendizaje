/* Pantalla: Recuperar contraseña — Dueño: Omar */
import '../../utils/analytics.js';
import { isInstitutionalEmail } from '../../utils/validators.js';
import { forgotPassword } from '../../services/authService.js';

const form = document.getElementById("forgot-form");
const emailInput = document.getElementById("email");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;
  formSuccess.hidden = true;

  const email = emailInput.value.trim().toLowerCase();

  if (!isInstitutionalEmail(email)) {
    return mostrarError("Debes usar tu correo institucional.");
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";
  }

  try {
    await forgotPassword(email);
    formSuccess.textContent =
      "Si el correo existe, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.";
    formSuccess.hidden = false;
    form.reset();
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    mostrarError(error.message || "No pudimos procesar tu solicitud.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar enlace";
    }
  }
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}