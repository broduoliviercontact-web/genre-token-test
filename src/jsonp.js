// ponytail: namespace global car file:// bloque les modules ES (type="module").
window.Genrenator = window.Genrenator || {};

(function (G) {
  let genreCbCounter = 0;

  // JSONP car l'API Binary Jazz (WP REST) ne sert pas de CORS utilisable côté client.
  G.fetchGenreJsonp = function () {
    return new Promise(function (resolve, reject) {
      const cbName = '__genreCb_' + (++genreCbCounter);
      const script = document.createElement('script');
      let settled = false;
      let timer;

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('network'));
      };

      timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('network'));
      }, 10000);

      script.src = 'https://binaryjazz.us/wp-json/genrenator/v1/genre/?_jsonp=' + encodeURIComponent(cbName);
      document.head.appendChild(script);
    });
  };
})(window.Genrenator);