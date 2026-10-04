    const params = new URLSearchParams(window.location.search);
    const lecturaId = params.get('lectura') || 'liebre-tortuga';
    const tipo = 'detective';
    const claveCompletada = `completada_${lecturaId}_${tipo}`;

    const yaCompletada = localStorage.getItem(claveCompletada);
    if (yaCompletada) {
      const r = JSON.parse(yaCompletada);
      document.getElementById('body').innerHTML = `
        <div class="activity__finish">
          <h2>Ya completaste esta actividad</h2>
          <p class="activity__score">${r.puntaje} / ${r.total}</p>
          <p class="activity__msg">No puedes repetirla.</p>
          <div class="activity__actions">
            <a href="../catalog/catalog.html" class="btn btn--primary">Volver al inicio</a>
          </div>
        </div>
      `;
      document.getElementById('timer').textContent = '✔';
      throw new Error('stop');
    }

    const synonyms = ['rapidez', 'celeridad', 'prisa', 'agilidad', 'ligereza'];
    let found = 0, timeLeft = 60, terminado = false;
    const $timer = document.getElementById('timer');
    const $body = document.getElementById('body');

    $body.innerHTML = `
      <p class="activity__hint">Encuentra sinónimos de: <strong>velocidad</strong></p>
      <div class="word-grid" id="grid">
        <span class="word">rapidez</span>
        <span class="word">lentitud</span>
        <span class="word">celeridad</span>
        <span class="word">calma</span>
        <span class="word">prisa</span>
        <span class="word">pausa</span>
        <span class="word">agilidad</span>
        <span class="word">tranquilidad</span>
        <span class="word">ligereza</span>
      </div>
    `;

    const interval = setInterval(() => {
      timeLeft--;
      $timer.textContent = `⏱ ${timeLeft}s`;
      if (timeLeft <= 0) { clearInterval(interval); endGame(); }
    }, 1000);

    document.querySelectorAll('.word').forEach(word => {
      word.addEventListener('click', () => {
        if (terminado) return;
        if (word.classList.contains('is-found') || word.classList.contains('is-wrong')) return;
        if (synonyms.includes(word.textContent)) {
          word.classList.add('is-found');
          found++;
          if (found === synonyms.length) { clearInterval(interval); endGame(); }
        } else word.classList.add('is-wrong');
      });
    });

    function endGame() {
      if (terminado) return;
      terminado = true;
      const puntaje = found, total = synonyms.length;

      localStorage.setItem(claveCompletada, JSON.stringify({
        puntaje, total, fecha: new Date().toISOString()
      }));

      $body.innerHTML = `
        <div class="activity__finish">
          <h2>¡Tiempo terminado!</h2>
          <p class="activity__score">${puntaje} / ${total}</p>
          <p class="activity__msg">Encontraste ${puntaje} sinónimos.</p>
          <p class="activity__msg">Ya no puedes repetir esta actividad.</p>
          <div class="activity__actions">
            <a href="../catalog/catalog.html" class="btn btn--primary">Volver al inicio</a>
          </div>
        </div>
      `;
    }
  