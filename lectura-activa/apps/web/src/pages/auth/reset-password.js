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

// 1. Extraer el token de la URL
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const token =
  urlParams.get("token") ||
  urlParams.get("code") ||
  hashParams.get("access_token");

// Si no hay token, bloqueamos el formulario
if (!token) {
  formError.textContent = "Enlace inválido o expirado. Solicita uno nuevo.";
  formError.hidden = false;
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
}

// 2. Manejar el submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;
  formSuccess.hidden = true;

  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;

  // --- Validación 1: contraseña no vacía y mínimo 8 caracteres ---
  if (!password || password.length < 8) {
    return mostrarError("La contraseña debe tener al menos 8 caracteres.");
  }

  // --- Validación 2: las contraseñas deben coincidir ---
  if (password !== passwordConfirm) {
    return mostrarError("Las contraseñas no coinciden.");
  }

  // --- Validación 3 (opcional): usar validators.js si los tienes ---
  const passCheck = validatePassword(password);
  if (!passCheck.valid) return mostrarError(passCheck.message);

  const matchCheck = validatePasswordMatch(password, passwordConfirm);
  if (!matchCheck.valid) return mostrarError(matchCheck.message);

  // 3. Enviar al backend
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Actualizando...";
  }

  try {
    await resetPassword({ token, newPassword: password });

    // Éxito
    formSuccess.textContent =
      " Contraseña actualizada correctamente. Redirigiendo al login...";
    formSuccess.hidden = false;

    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 2000);
  } catch (error) {
    console.error("[reset-password] Error:", error);

    // Manejo de errores según el status del backend
    let mensaje = "No pudimos actualizar tu contraseña. Intenta de nuevo.";

    if (error.status === 400) {
      mensaje = "El enlace es inválido o ha expirado. Solicita uno nuevo.";
    } else if (error.status === 422) {
      mensaje = "La contraseña no cumple con los requisitos de seguridad.";
    } else if (error.status === 500) {
      mensaje = "Error del servidor. Intenta más tarde.";
    } else if (error.message) {
      mensaje = error.message;
    }

    mostrarError(mensaje);

    // Reactivar el botón
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Actualizar contraseña";
    }
  }
});
// 4. Función auxiliar para mostrar errores
function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}
