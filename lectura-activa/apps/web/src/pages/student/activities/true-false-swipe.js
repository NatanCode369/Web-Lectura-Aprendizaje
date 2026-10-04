    const params = new URLSearchParams(window.location.search);
    const lecturaId = params.get('lectura') || 'liebre-tortuga';
    const tipo = 'vf';
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
      document.getElementById('progress').textContent = `${r.puntaje} / ${r.total}`;
      throw new Error('stop');
    }

    const guardadas = localStorage.getItem(`actividades_${lecturaId}`);
    const actividades = guardadas ? JSON.parse(guardadas) : {
      verdaderoFalso: [
        { afirmacion: "La liebre se durmió durante la carrera.", respuesta: true },
        { afirmacion: "La tortuga hizo trampa para ganar.", respuesta: false },
        { afirmacion: "La liebre se burlaba de la tortuga.", respuesta: true },
        { afirmacion: "La carrera fue en el mar.", respuesta: false }
      ]
    };

    const statements = actividades.verdaderoFalso.map(v => ({ text: v.afirmacion, answer: v.respuesta }));

    let current = 0, score = 0;
    const $body = document.getElementById('body');
    const $progress = document.getElementById('progress');

    function render() {
      $progress.textContent = `${current + 1} / ${statements.length}`;
      $body.innerHTML = `
        <div class="swipe-card" id="card">
          <p class="swipe-card__text">${statements[current].text}</p>
          <span class="swipe-card__hint">← Falso | Verdadero →</span>
        </div>
        <div class="swipe-actions">
          <button class="btn btn--danger" id="false-btn">← Falso</button>
          <button class="btn btn--primary" id="true-btn">Verdadero →</button>
        </div>
        <div class="feedback" id="feedback" hidden></div>
      `;
      document.getElementById('true-btn').addEventListener('click', () => answer(true));
      document.getElementById('false-btn').addEventListener('click', () => answer(false));
    }

    function answer(value) {
      const isCorrect = value === statements[current].answer;
      if (isCorrect) score++;
      const $feedback = document.getElementById('feedback');
      $feedback.textContent = isCorrect ? '¡Correcto!' : 'Incorrecto.';
      $feedback.className = `feedback ${isCorrect ? 'feedback--ok' : 'feedback--error'}`;
      $feedback.hidden = false;
      const $card = document.getElementById('card');
      $card.classList.add(value ? 'swipe-card--right' : 'swipe-card--left');

      setTimeout(() => {
        current++;
        if (current < statements.length) render();
        else mostrarFinal(score, statements.length);
      }, 600);
    }

    function mostrarFinal(puntaje, total) {
      localStorage.setItem(claveCompletada, JSON.stringify({
        puntaje, total, fecha: new Date().toISOString()
      }));

      $body.innerHTML = `
        <div class="activity__finish">
          <h2>¡Actividad completada!</h2>
          <p class="activity__score">${puntaje} / ${total}</p>
          <p class="activity__msg">${puntaje === total ? '¡Perfecto!' : '¡Buen intento!'}</p>
          <p class="activity__msg">Ya no puedes repetir esta actividad.</p>
          <div class="activity__actions">
            <a href="../catalog/catalog.html" class="btn btn--primary">Volver al inicio</a>
          </div>
        </div>
      `;
    }

    render();
