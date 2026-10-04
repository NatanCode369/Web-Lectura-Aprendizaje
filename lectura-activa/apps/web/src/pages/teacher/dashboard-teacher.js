function renderProgreso() {
  const grupos = cargarGrupos();
  const lecturas = cargarLecturas();
  const $lista = document.querySelector('.progress-list');

  if (grupos.length === 0) {
    $lista.innerHTML = '<p class="panel__hint">Aún no tienes grupos. <a href="./groups.html">Crea uno aquí</a>.</p>';
    return;
  }

  if (lecturas.length === 0) {
    $lista.innerHTML = '<p class="panel__hint">Aún no has creado lecturas. El progreso aparecerá cuando asignes lecturas.</p>';
    return;
  }

  // Calcular el progreso real de cada grupo
  $lista.innerHTML = grupos.map((g) => {
    const totalEstudiantes = g.estudiantes.length;

    if (totalEstudiantes === 0) {
      return `
        <div>
          <div class="progress__row"><span>${escapeHtml(g.nombre)}</span><span>0%</span></div>
          <div class="progress"><div class="progress__bar" style="width: 0%"></div></div>
        </div>
      `;
    }

    // Contar cuántas tareas asignadas se completaron
    let totalAsignaciones = 0;
    let completadas = 0;

    g.estudiantes.forEach((email) => {
      const asignaciones = JSON.parse(localStorage.getItem(`asignaciones_${email}`) || '[]');
      asignaciones.forEach((a) => {
        if (lecturas.some((l) => l.id === a.lecturaId)) {
          totalAsignaciones++;
          const resultado = localStorage.getItem(`resultado_${a.lecturaId}`);
          if (resultado) completadas++;
        }
      });
    });

    const pct = totalAsignaciones > 0 ? Math.round((completadas / totalAsignaciones) * 100) : 0;

    return `
      <div>
        <div class="progress__row"><span>${escapeHtml(g.nombre)}</span><span>${pct}%</span></div>
        <div class="progress"><div class="progress__bar" style="width: ${pct}%"></div></div>
      </div>
    `;
  }).join('');
}