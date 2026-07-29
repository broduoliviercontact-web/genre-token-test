# Genrenator

Petite application web qui affiche un **genre musical aléatoire** à chaque chargement et à chaque clic sur le bouton « Nouveau genre ». Les genres proviennent de l'API publique [Genrenator](https://binaryjazz.us/) de Binary Jazz.

- Aucun framework, aucune dépendance, aucun build.
- Ouverture directe du fichier `index.html` via `file://` (pas de serveur requis).
- Récupération des données en **JSONP** (contournement des limites CORS depuis une origine `file://`).

---

## But de l'application

Afficher un genre musical inventé aléatoirement (ex. *« vapor death jazz »*, *« skinhead singaporean R&B »*). L'application :

1. charge un genre automatiquement à l'ouverture de la page ;
2. permet d'en obtenir un nouveau via le bouton **« Nouveau genre »** ;
3. signale clairement les erreurs (réseau ou réponse inattendue de l'API).

---

## Comment l'ouvrir localement

```bash
open index.html        # macOS
# ou, depuis un autre OS : double-cliquer sur index.html dans l'explorateur de fichiers.
```

Aucun serveur HTTP n'est nécessaire : l'app fonctionne en `file://`. **Une connexion Internet est requise** pour interroger l'API Binary Jazz. Hors connexion, un message d'erreur réseau s'affiche.

---

## Le bouton « Nouveau genre »

Au clic, la fonction `loadGenre()` (définie dans `src/app.js`) :

1. désactive le bouton et affiche « Chargement… » avec une animation de pulsation ;
2. appelle `window.Genrenator.fetchGenreJsonp()` pour récupérer un nouveau genre ;
3. affiche le genre reçu, ou un message d'erreur en cas d'échec ;
4. réactive le bouton et stoppe l'animation (dans un bloc `finally`, donc sur tous les chemins : succès comme erreur).

---

## Fonctionnement JSONP

### Pourquoi JSONP et pas `fetch` ?

L'API Binary Jazz est une API REST WordPress : `https://binaryjazz.us/wp-json/genrenator/v1/genre/`. Ouverte depuis une page en `file://`, un `fetch` direct est bloqué par **CORS** (l'origine `file://` est opaque et l'API ne sert pas d'en-têtes CORS exploitables côté client dans ce contexte).

JSONP contourne la limitation en injectant une balise `<script>` dont l'URL contient le paramètre `?_jsonp=<callback>`. La réponse de l'API est alors une **chaîne JavaScript exécutable** de la forme :

```js
/**/__genreCb_1("rap emo")
```

Les balises `<script>` ne sont pas soumises au contrôle CORS : la réponse est exécutée comme du code, et appelle notre callback global avec la donnée.

### Implémentation (`src/jsonp.js`)

La fonction `window.Genrenator.fetchGenreJsonp()` :

- génère un **nom de callback unique** par appel (`__genreCb_<n>`) et l'expose sur `window` ;
- crée une `<script>` avec `src = https://binaryjazz.us/wp-json/genrenator/v1/genre/?_jsonp=<callback>` (callback encodé via `encodeURIComponent`) ;
- au retour, le callback reçoit la donnée, résout la promesse, puis appelle `cleanup()` ;
- gère un **timeout de 10 s** et l'événement `script.onerror` : en cas d'échec, rejette avec `new Error('network')` ;
- `cleanup()` supprime la balise `<script>` du DOM, efface le callback de `window` et annule le timer (sur les 3 chemins : succès, `onerror`, timeout) ;
- une garde `settled` empêche toute double résolution (ex. timeout après succès).

Le parsing côté `src/app.js` accepte indifféremment une chaîne ou un tableau (`Array.isArray(data) ? data[0] : data`) et valide que le résultat est une chaîne non vide (`typeof genre === 'string' && genre.trim()`), sinon lève `new Error('format')`.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure HTML, éléments accessibles (`aria-live`), chargement des scripts (classiques, pas de modules ES — voir limites ci-dessous). |
| `styles.css` | Thème sombre, styles de `#genre`, du bouton et de `#error`, animation de chargement `#genre.loading`. |
| `src/jsonp.js` | Expose `window.Genrenator.fetchGenreJsonp()` : mécanisme JSONP (callback unique, timeout, nettoyage). |
| `src/app.js` | Logique UI : `loadGenre()`, branchement du bouton, messages d'erreur, bascule de l'animation `.loading` (mises à jour notifiées via `aria-live`). |

**Ordre de chargement** : `src/jsonp.js` puis `src/app.js`, en fin de `<body>`. Les scripts étant classiques et bloquants, `jsonp.js` définit `window.Genrenator` **avant** l'exécution de l'IIFE dans `app.js`.

### Carte de dépendances (issue de Graphify)

```
index.html (Genrenator)
   ├──USES--> src/app.js :: loadGenre
   │              └──USES--> src/jsonp.js :: fetchGenreJsonp
   │                              ├──IMPLEMENTS--> Pattern JSONP
   │                              └──CALLS--> Binary Jazz API
   └──USES--> styles.css :: Thème sombre
```

---

## Limites CORS / JSONP

- **`file://` bloque les modules ES** : `<script type="module">` échouerait à importer via `file://` (CORS/opacité de l'origine). C'est pourquoi l'app utilise des **scripts classiques** + un **namespace global** (`window.Genrenator`) plutôt que des imports ES.
- **JSONP est GET uniquement** : impossible de faire des requêtes POST/PUT ni de personnaliser les en-têtes.
- **Pas de code d'erreur HTTP exploitable** : une `<script>` ne distingue pas une réponse 4xx/5xx d'une 2xx tant que le corps est du JS valide. Le timeout (10 s) et `script.onerror` couvrent donc surtout les échecs réseau et les réponses mal formées ; une réponse HTTP en erreur mais syntaxiquement valide ne serait pas détectée comme telle.
- **Sécurité** : le nom du callback est contrôlé (`encodeURIComponent`, préfixe `__genreCb_`) ; le callback et la balise sont systématiquement nettoyés ; `textContent` uniquement (jamais `innerHTML`) pour éviter toute injection XSS depuis le contenu de l'API.
- **Connexion requise** : hors ligne, l'app affiche le message réseau. Le timeout couvre aussi une API qui ne répond pas.

---

## Développement

### Commandes utiles (Git)

```bash
git status                 # état de l'arbre de travail
git log --oneline -10      # historique récent
git diff                   # modifications non commitées
git diff --stat            # résumé des fichiers modifiés
git add <fichiers>         # staging ciblé (éviter d'ajouter .ccb/, .claude/, etc.)
git commit -m "..."        # commit (déclenche le hook Graphify -> reconstruction du graphe)
```

Historique du projet :

```bash
5d5c052 feat: add animated loading indicator on genre fetch
009d567 refactor: split genre app into index.html, styles.css and src/ modules
0994453 feat: add JSONP genre generator
eac1af7 chore: initialize project
```

### Graphify (knowledge graph)

Le graphe est reconstruit automatiquement par un hook Git post-commit. Manuellement :

```bash
graphify update .          # reconstruire le graphe (AST-only, sans coût API)
graphify query "<question>" # sous-graphe orienté pour une question
graphify path "<A>" "<B>"   # plus court chemin entre deux nœuds
graphify explain "<concept>"#聚焦 sur un concept
```

Le graphe se trouve dans `graphify-out/` (`GRAPH_REPORT.md`, `graph.json`, `graph.html`).

### Vérifier l'app sans serveur

```bash
open index.html            # doit afficher un genre au chargement
# Couper le réseau puis recharger → message d'erreur réseau attendu.
# Cliquer « Nouveau genre » → nouveau genre (l'animation « Chargement… » pulse puis s'arrête).
```

---

## Accessibilité

- **`aria-live="polite"`** sur `#genre` (zone du genre) et `#error` (zone d'erreur) : les lecteurs d'écran sont notifiés des mises à jour dynamiques sans interrompre l'utilisateur.
- **`prefers-reduced-motion`** : l'animation de chargement (`#genre.loading`, pulsation d'opacité) est désactivée via `@media (prefers-reduced-motion: reduce) { animation: none }`.
- **Sémantique HTML** : `<main>`, `<h1>`, `<button type="button">`, attribut `lang="fr"`.
- **Désactivation du bouton pendant la requête** (`btn.disabled`) avec un style `cursor: wait`, évitant les doubles déclenchements.
- **Aucune image / texte injecté via `innerHTML`** : tout le contenu dynamique passe par `textContent`, ce qui sécurise aussi contre le XSS.

---

## Licence

Projet de test / démonstration. L'API Genrenator appartient à Binary Jazz (voir https://binaryjazz.us/).