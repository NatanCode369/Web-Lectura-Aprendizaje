import './styles/base.css';

const app = document.querySelector('#app');

if (app) {
  app.innerHTML = '<h1>Frontend de Lectura Activa</h1>';
} else {
  console.warn('[main] No se encontró #app en el DOM. Ignorando render.');
}