(function () {
  'use strict';

  // ---------- Datos de ejemplo (cuando exista el API vendrán de allá) ----------
  const LECTURAS = [
    { id: '1', titulo: 'La liebre y la tortuga' },
    { id: '2', titulo: 'El león y el ratón' },
    { id: '3', titulo: 'La zorra y las uvas' }
  ];

  const ESTUDIANTES = [
    { nombre: 'Ana López', grupo: '4to A' },
    { nombre: 'Luis Pérez', grupo: '4to A' },
    { nombre: 'María Gómez', grupo: '4to A' },
    { nombre: 'Carlos Ruiz', grupo: '4to B' },
    { nombre: 'Sofía Díaz', grupo: '4to B' },
    { nombre: 'Diego Flores', grupo: '4to B' },
    { nombre: 'Valeria Soto', grupo: '4to C' },
    { nombre: 'Jorge Mena', grupo: '4to C' },
    { nombre: 'Camila Ortiz', grupo: '4to C' }
  ];

  // Resultado de cada estudiante, en el mismo orden que ESTUDIANTES: [estado, puntaje, minutos]
  const RESULTADOS = {
    '1': [
      ['al-dia', 92, 3], ['al-dia', 85, 4], ['atrasado', 60, 7],
      ['al-dia', 78, 3], ['sin-empezar', null, null], ['atrasado', 55, 8],
      ['al-dia', 95, 2], ['al-dia', 88, 3], ['sin-empezar', null, null]
    ],
    '2': [
      ['al-dia', 88, 2], ['al-dia', 94, 2], ['al-dia', 70, 4],
      ['atrasado', 58, 6], ['al-dia', 81, 3], ['sin-empezar', null, null],
      ['atrasado', 62, 5], ['al-dia', 90, 2], ['al-dia', 76, 3]
    ],
    '3': [
      ['atrasado', 50, 9], ['sin-empezar', null, null], ['al-dia', 72, 4],
      ['sin-empezar', null, null], ['atrasado', 48, 8], ['al-dia', 83, 3],
      ['al-dia', 67, 5], ['sin-empezar', null, null], ['atrasado', 59, 7]
    ]
  };

  // Porcentaje de estudiantes que falló cada pregunta
  const PREGUNTAS = {
    '1': [
      { texto: '¿Por qué perdió la liebre la carrera?', fallos: 18 },
      { texto: '¿Qué hizo la tortuga durante la carrera?', fallos: 35 },
      { texto: '¿Cuál es la enseñanza del cuento?', fallos: 52 }
    ],
    '2': [
      { texto: '¿Cómo ayudó el ratón al león?', fallos: 22 },
      { texto: '¿Por qué el león dejó ir al ratón al principio?', fallos: 40 },
      { texto: '¿Qué enseña esta fábula?', fallos: 61 }
    ],
    '3': [
      { texto: '¿Por qué la zorra no alcanzó las uvas?', fallos: 25 },
      { texto: '¿Qué quiso decir la zorra al irse?', fallos: 48 },
      { texto: '¿Qué actitud muestra la zorra?', fallos: 70 }
    ]
  };

  const NOMBRE_ESTADO = { 'al-dia': 'Al día', 'atrasado': 'Atrasado', 'sin-empezar': 'Sin empezar' };
  const CLASE_ESTADO = { 'al-dia': 'badge--ok', 'atrasado': 'badge--late', 'sin-empezar': 'badge--soon' };

  // ---------- Utilidades ----------
  const $ = (id) => document.getElementById(id);
  const selLectura = $('filtro-lectura');
  const selGrupo = $('filtro-grupo');

  function escapeHtml(texto) {
    return String(texto)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function promedio(valores) {
    const v = valores.filter((x) => x !== null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  }

  // Junta estudiantes + resultados de la lectura elegida y aplica el filtro de grupo
  function filasFiltradas() {
    const resultados = RESULTADOS[selLectura.value] || [];
    return ESTUDIANTES
      .map((e, i) => ({
        nombre: e.nombre,
        grupo: e.grupo,
        estado: resultados[i][0],
        puntaje: resultados[i][1],
        minutos: resultados[i][2]
      }))
      .filter((f) => selGrupo.value === 'todos' || f.grupo === selGrupo.value);
  }

  // ---------- Dibujar cada parte ----------
  function renderResumen(filas) {
    const prom = promedio(filas.map((f) => f.puntaje));
    const tiempo = promedio(filas.map((f) => f.minutos));
    const alDia = filas.filter((f) => f.estado === 'al-dia').length;
    const atrasados = filas.filter((f) => f.estado === 'atrasado').length;

    $('stat-promedio').textContent = prom === null ? '—' : prom + '/100';
    $('stat-tiempo').textContent = tiempo === null ? '—' : tiempo + ' min';
    $('stat-aldia').textContent = filas.length ? Math.round((alDia / filas.length) * 100) + '%' : '—';
    $('stat-atrasados').textContent = atrasados;
  }

  function renderGrupos(filas) {
    const grupos = [...new Set(filas.map((f) => f.grupo))];

    $('progreso-grupos').innerHTML = grupos.map((g) => {
      const delGrupo = filas.filter((f) => f.grupo === g);
      const alDia = delGrupo.filter((f) => f.estado === 'al-dia').length;
      const pct = Math.round((alDia / delGrupo.length) * 100);
      return `
        <div>
          <div class="progress__row"><span>${escapeHtml(g)}</span><span>${pct}%</span></div>
          <div class="progress"><div class="progress__bar" style="width: ${pct}%"></div></div>
        </div>`;
    }).join('') || '<p class="panel__hint">Sin datos para mostrar.</p>';
  }

  function renderEstudiantes(filas) {
    const cuerpo = $('estudiantes-body');

    if (filas.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="5">No hay estudiantes en este grupo.</td></tr>';
      return;
    }

    cuerpo.innerHTML = filas.map((f) => `
      <tr>
        <td>${escapeHtml(f.nombre)}</td>
        <td>${escapeHtml(f.grupo)}</td>
        <td><span class="badge ${CLASE_ESTADO[f.estado]}">${NOMBRE_ESTADO[f.estado]}</span></td>
        <td>${f.puntaje === null ? '—' : f.puntaje + '/100'}</td>
        <td>${f.minutos === null ? '—' : f.minutos + ' min'}</td>
      </tr>
    `).join('');
  }

  function renderPreguntas() {
    const preguntas = [...(PREGUNTAS[selLectura.value] || [])].sort((a, b) => b.fallos - a.fallos);

    $('preguntas-list').innerHTML = preguntas.map((p) => `
      <div>
        <div class="bar-list__text"><span>${escapeHtml(p.texto)}</span><span>${p.fallos}%</span></div>
        <div class="progress"><div class="progress__bar progress__bar--danger" style="width: ${p.fallos}%"></div></div>
      </div>
    `).join('') || '<p class="panel__hint">Sin preguntas registradas.</p>';
  }

  function render() {
    const filas = filasFiltradas();
    renderResumen(filas);
    renderGrupos(filas);
    renderEstudiantes(filas);
    renderPreguntas();
  }

  // ---------- Arranque ----------
  selLectura.innerHTML = LECTURAS
    .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
    .join('');

  selLectura.addEventListener('change', render);
  selGrupo.addEventListener('change', render);
  render();
})();