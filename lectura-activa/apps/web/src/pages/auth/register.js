/* Pantalla: Registro — Dueño: Omar */
import '../../utils/analytics.js';
import { isInstitutionalEmail, validatePassword, validateFullName, validatePasswordMatch } from '../../utils/validators.js';

import {
  isInstitutionalEmail,
  validatePassword,
  validateFullName,
  validatePasswordMatch,
} from "../../utils/validators.js";
import { register } from "../../services/authService.js";

const form = document.getElementById("register-form");
const nombreInput = document.getElementById("nombre");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordConfirmInput = document.getElementById("password-confirm");
const formError = document.getElementById("form-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const nombre = nombreInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const passwordConfirm = passwordConfirmInput.value;

  const nombreCheck = validateFullName(nombre);
  if (!nombreCheck.valid) return mostrarError(nombreCheck.message);

  if (!isInstitutionalEmail(email)) {
    return mostrarError("Debes usar tu correo institucional (@kinal.edu.gt).");
  }

  const passCheck = validatePassword(password);
  if (!passCheck.valid) return mostrarError(passCheck.message);

  const matchCheck = validatePasswordMatch(password, passwordConfirm);
  if (!matchCheck.valid) return mostrarError(matchCheck.message);

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Registrando...";
  }

  try {
    await register({ email, password, fullName: nombre });
    alert("Registro exitoso. Ahora puedes iniciar sesión.");
    window.location.href = "./login.html";
  } catch (error) {
    console.error("[register] Error:", error);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Registrarme";
    }

    if (error.status === 409) {
      mostrarError("Ya existe una cuenta con ese correo.");
    } else if (error.status === 403) {
      mostrarError("Tu dominio de correo no está autorizado.");
    } else {
      mostrarError(error.message || "No pudimos completar el registro.");
    }
  }
});

function mostrarError(mensaje) {
  formError.textContent = mensaje;
  formError.hidden = false;
}
