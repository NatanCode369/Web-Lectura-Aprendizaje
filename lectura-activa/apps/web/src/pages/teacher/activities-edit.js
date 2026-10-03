(function () {
  'use strict';

  // Lecturas de ejemplo (cuando exista el API vendrán de allá)
  const LECTURAS = [
    { id: '1', titulo: 'La liebre y la tortuga' },
    { id: '2', titulo: 'El león y el ratón' },
    { id: '3', titulo: 'La zorra y las uvas' }
  ];

  const $ = (id) => document.getElementById(id);
  const selLectura = $('lectura');
  const listaTrivia = $('lista-trivia');
  const listaVf = $('lista-vf');
  const mensaje = $('mensaje');
  const clave = (id) => 'la_activities_' + id;

  function escapeHtml(t) {
    return String(t).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  function nuevaTrivia() { return { text: '', options: ['', '', ''], correct: 0 }; }
  function nuevaVf() { return { text: '', answer: true }; }

  // ---------- Estado ----------
  let estado = { trivia: [], vf: [] };

  function cargar(id) {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave(id)));
      if (guardado && Array.isArray(guardado.trivia) && Array.isArray(guardado.vf)) return guardado;
    } catch (e) { /* sin datos guardados */ }
    return { trivia: [nuevaTrivia()], vf: [nuevaVf()] };
  }

  // Lee lo escrito en pantalla y lo pasa al estado
  function leerPantalla() {
    estado.trivia = [...listaTrivia.querySelectorAll('.q-card')].map((card, i) => ({
      text: card.querySelector('.q-text').value.trim(),
      options: [...card.querySelectorAll('.q-opt-text')].map((o) => o.value.trim()),
      correct: Number(card.querySelector('input[type="radio"]:checked')?.value ?? 0)
    }));
    estado.vf = [...listaVf.querySelectorAll('.q-card')].map((card) => ({
      text: card.querySelector('.q-text').value.trim(),
      answer: card.querySelector('input[type="radio"]:checked')?.value !== 'false'
    }));
  }

  // ---------- Dibujar ----------
  function renderTrivia() {
    listaTrivia.innerHTML = estado.trivia.map((q, i) => `
      <div class="q-card" data-i="${i}">
        <div class="q-card__head">
          <span class="q-card__num">Pregunta ${i + 1}</span>
          <button type="button" class="btn btn--ghost btn--sm" data-del="trivia" data-i="${i}">Quitar</button>
        </div>
        <input type="text" class="q-text" placeholder="Escribe la pregunta" value="${escapeHtml(q.text)}" aria-label="Pregunta ${i + 1}">
        ${q.options.map((o, j) => `
          <label class="q-opt">
            <input type="radio" name="t-${i}" value="${j}" ${q.correct === j ? 'checked' : ''} aria-label="Marcar opción ${j + 1} como correcta">
            <input type="text" class="q-opt-text" placeholder="Opción ${j + 1}" value="${escapeHtml(o)}">
          </label>`).join('')}
      </div>`).join('') || '<p class="q-empty">Aún no hay preguntas.</p>';
  }

  function renderVf() {
    listaVf.innerHTML = estado.vf.map((q, i) => `
      <div class="q-card" data-i="${i}">
        <div class="q-card__head">
          <span class="q-card__num">Afirmación ${i + 1}</span>
          <button type="button" class="btn btn--ghost btn--sm" data-del="vf" data-i="${i}">Quitar</button>
        </div>
        <textarea class="q-text" placeholder="Escribe una afirmación sobre la lectura" aria-label="Afirmación ${i + 1}">${escapeHtml(q.text)}</textarea>
        <div class="choice-group">
          <label class="choice"><input type="radio" name="v-${i}" value="true" ${q.answer ? 'checked' : ''}> Verdadero</label>
          <label class="choice"><input type="radio" name="v-${i}" value="false" ${q.answer ? '' : 'checked'}> Falso</label>
        </div>
      </div>`).join('') || '<p class="q-empty">Aún no hay afirmaciones.</p>';
  }

  function render() { renderTrivia(); renderVf(); }

  function avisar(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = 'alert alert--' + tipo;
    mensaje.hidden = false;
    mensaje.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- Validar y guardar ----------
  function validar() {
    let ok = true;
    document.querySelectorAll('.q-card').forEach((c) => c.classList.remove('q-card--error'));

    estado.trivia.forEach((q, i) => {
      const llenas = q.options.filter(Boolean).length;
      const correctaVacia = !q.options[q.correct];
      if (!q.text || llenas < 2 || correctaVacia) {
        listaTrivia.children[i].classList.add('q-card--error');
        ok = false;
      }
    });
    estado.vf.forEach((q, i) => {
      if (!q.text) { listaVf.children[i].classList.add('q-card--error'); ok = false; }
    });
    return ok;
  }

  $('activities-form').addEventListener('submit', (e) => {
    e.preventDefault();
    leerPantalla();

    if (estado.trivia.length + estado.vf.length === 0) {
      avisar('Agrega al menos una pregunta antes de guardar.', 'error');
      return;
    }
    if (!validar()) {
      avisar('Revisa las tarjetas marcadas en rojo: cada pregunta necesita texto, al menos 2 opciones y la correcta con texto.', 'error');
      return;
    }
    // Quita las opciones vacías conservando cuál era la correcta
    estado.trivia = estado.trivia.map((q) => {
      const textoCorrecto = q.options[q.correct];
      const opciones = q.options.filter(Boolean);
      return { text: q.text, options: opciones, correct: opciones.indexOf(textoCorrecto) };
    });

    try {
      localStorage.setItem(clave(selLectura.value), JSON.stringify(estado));
      render();
      avisar('Actividades guardadas.', 'ok');
    } catch (err) {
      avisar('No se pudo guardar en este navegador.', 'error');
    }
  });

  // ---------- Eventos ----------
  $('add-trivia').addEventListener('click', () => { leerPantalla(); estado.trivia.push(nuevaTrivia()); render(); });
  $('add-vf').addEventListener('click', () => { leerPantalla(); estado.vf.push(nuevaVf()); render(); });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    leerPantalla();
    estado[btn.dataset.del].splice(Number(btn.dataset.i), 1);
    render();
  });

  selLectura.addEventListener('change', () => {
    mensaje.hidden = true;
    estado = cargar(selLectura.value);
    render();
  });

  // ---------- Arranque ----------
  selLectura.innerHTML = LECTURAS.map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`).join('');
  const idUrl = new URLSearchParams(location.search).get('id');
  if (LECTURAS.some((l) => l.id === idUrl)) selLectura.value = idUrl;
  estado = cargar(selLectura.value);
  render();
})();
