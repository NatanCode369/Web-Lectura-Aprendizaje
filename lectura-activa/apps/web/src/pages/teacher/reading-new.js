/**
 * reading-new.js
 * Maneja el formulario de nueva lectura y el toggle entre texto/PDF.
 */

const radios = document.querySelectorAll('input[name="formato"]');
const cajaTexto = document.getElementById('formato-texto');
const cajaPdf = document.getElementById('formato-pdf');

radios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const esPdf = document.querySelector('input[name="formato"]:checked').value === 'pdf';
    cajaTexto.hidden = esPdf;
    cajaPdf.hidden = !esPdf;
  });
});

document.getElementById('reading-form').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Lectura publicada (mock). Cuando el backend esté listo, se guardará de verdad.');
  window.location.href = './dashboard-teacher.html';
});