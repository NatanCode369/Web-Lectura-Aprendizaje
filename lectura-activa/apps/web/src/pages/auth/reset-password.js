/* Pantalla: Nueva contraseña — Dueño: Omar */

import {
  validatePassword,
  validatePasswordMatch,
} from "../../utils/validators.js";
import { resetPassword } from "../../services/authService.js";

const form = document.getElementById("reset-form");
const passwordInput = document.getElementById("new-password");
const passwordConfirmInput = document.getElementById("new-password-confirm");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

// Extraer el token de la URL (ej: reset-password.html?token=abc123)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (!token) {
  mostrarError("Enlace inválido o expirado. Solicita uno nuevo.");
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;
  formSuccess.hidden = true;

  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;

  const passCheck = validatePassword(password);
  if (!passCheck.valid) return mostrarError(passCheck.message);

  const matchCheck = validatePasswordMatch(password, passwordConfirm);
  if (!matchCheck.valid) return mostrarError(matchCheck.message);

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Actualizando...";
  }

  try {
    await resetPassword({ token, newPassword: password });

    formSuccess.textContent =
      "Contraseña actualizada. Redirigiendo al login...";
    formSuccess.hidden = false;

    setTimeout(() => {
      window.location.href = "./login.html";
    }, 2000);
  } catch (error) {
    console.error("[reset-password] Error:", error);
    mostrarError(error.message || "No pudimos actualizar tu contraseña.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Actualizar contraseña";
    }
  }
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}
