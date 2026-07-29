(function () {
  const genreEl = document.getElementById('genre');
  const errorEl = document.getElementById('error');
  const btn = document.getElementById('new');

  async function loadGenre() {
    btn.disabled = true;
    errorEl.textContent = '';
    genreEl.textContent = 'Chargement…';
    genreEl.classList.add('loading');

    const networkMsg = 'Impossible de charger un genre. Vérifiez votre connexion réseau.';
    const formatMsg = 'Réponse inattendue de l\'API.';

    try {
      const data = await window.Genrenator.fetchGenreJsonp();
      const genre = Array.isArray(data) ? data[0] : data;
      if (typeof genre !== 'string' || !genre.trim()) {
        throw new Error('format');
      }
      genreEl.textContent = genre;
    } catch (err) {
      genreEl.textContent = '';
      errorEl.textContent = err.message === 'format' ? formatMsg : networkMsg;
    } finally {
      btn.disabled = false;
      genreEl.classList.remove('loading');
    }
  }

  btn.addEventListener('click', loadGenre);
  loadGenre();
})();