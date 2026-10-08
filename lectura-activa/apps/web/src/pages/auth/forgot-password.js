/* Pantalla: Recuperar contraseña — Dueño: Omar */

import { isValidEmail } from "../../utils/validators.js";
import { api } from "../../services/apiClient.js";

const form = document.getElementById("forgot-form");
const emailInput = document.getElementById("email");
const formError = document.getElementById("form-error");
const formSuccess = document.getElementById("form-success");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;
  formSuccess.hidden = true;

  const email = emailInput.value.trim().toLowerCase();

  if (!isValidEmail(email)) {
    return mostrarError("Ingresa un correo válido.");
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";
  }

  try {
    await api.post("/auth/forgot-password", { email });

    formSuccess.textContent =
      "Si el correo está registrado, recibirás un enlace en unos minutos. Revisa tu bandeja de entrada.";
    formSuccess.hidden = false;
    form.reset();
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    mostrarError(
      error?.message || "No pudimos enviar el correo. Intenta de nuevo.",
    );
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