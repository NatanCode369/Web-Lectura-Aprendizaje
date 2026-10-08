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

// --------------------------------------------------
// 1. Extraer el token del query string (?token=abc123)
// --------------------------------------------------
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

if (!token) {
  formError.textContent = "Enlace inválido o expirado. Solicita uno nuevo.";
  formError.hidden = false;
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
}

// --------------------------------------------------
// 2. Manejar el submit
// --------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;
  formSuccess.hidden = true;

  const newPassword = passwordInput.value;
  const confirmPassword = passwordConfirmInput.value;

  // Validación 1: contraseña mínimo 8 caracteres
  const passCheck = validatePassword(newPassword);
  if (!passCheck.valid) return mostrarError(passCheck.message);

  // Validación 2: las contraseñas deben coincidir
  const matchCheck = validatePasswordMatch(newPassword, confirmPassword);
  if (!matchCheck.valid) return mostrarError(matchCheck.message);

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Actualizando...";
  }

  try {
    await resetPassword({ token, newPassword });

    formSuccess.textContent =
      "✅ Contraseña actualizada correctamente. Redirigiendo al login...";
    formSuccess.hidden = false;

    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 2000);
  } catch (error) {
    console.error("[reset-password] Error:", error);

    // Manejo de errores específicos del backend
    let mensaje = "No pudimos actualizar tu contraseña. Intenta de nuevo.";

    if (error.status === 400) {
      mensaje = "El enlace es inválido o ha expirado. Solicita uno nuevo.";
    } else if (error.status === 500) {
      mensaje = "Error del servidor. Intenta más tarde.";
    } else if (error.status === 503) {
      mensaje = "El servicio no está disponible. Intenta más tarde.";
    } else if (error.message) {
      mensaje = error.message;
    }

    mostrarError(mensaje);
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
