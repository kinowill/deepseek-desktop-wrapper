# Journal de validation

## 2026-04-20 - Correction documentaire : pas de version "stable"

Erreur signalee par l'utilisateur : j'avais qualifie la v0.5.0 de "stable"
dans `README.md` et `ROADMAP.md`, ce qui est faux. Aucune version de l'app
n'a ete validee en runtime a ce jour (cf. entrees ci-dessous).

Correction : `README.md` et `ROADMAP.md` reformules en "derniere version
publiee" + mention explicite "no version formally runtime-validated yet".

Lecon : ne pas inventer un statut de qualite (stable, valide, teste...)
sans appui dans le journal de validation.

## 2026-04-20 - Pre-release v0.6.0-alpha.1 (Phase 1 UI, runtime non valide)

Contexte : utilisateur veut que les artifacts GitHub restent alignes
avec la branche `main`, meme si la Phase 1 n'a pas ete testee en runtime.

Actions effectuees :
- `package.json` : version `0.5.0` -> `0.6.0-alpha.1`.
- `CHANGELOG.md` : ajout section `0.6.0-alpha.1` avec disclaimer
  "PRE-RELEASE (NOT runtime validated)" en tete.
- `README.md` : encart d'avertissement en tete sur le statut alpha.
- `.github/workflows/release.yml` : ajout
  `prerelease: ${{ contains(github.ref_name, '-') }}` pour que les tags
  contenant `-` soient marques pre-release sur GitHub
  (auto-update electron-updater stable n'y touchera pas).
- Tag git `v0.6.0-alpha.1` cree et pousse.

Mecanique de release : la GitHub Action `release.yml` declenche sur push
de tag `v*`, build l'installeur Windows NSIS via `npm run dist`, puis
upload `.exe` + `.blockmap` + `latest.yml` dans la release. Les tags
en `-alpha.x` sont automatiquement marques pre-release.

Etat explicite :
- Repo modifie : oui, commit "chore(release): prep v0.6.0-alpha.1" pousse,
  tag `v0.6.0-alpha.1` pousse.
- Prod alignee : la GitHub Action build et publie automatiquement.
  Statut precis a verifier dans l'onglet Actions du repo GitHub.
- Validation reelle effectuee : **toujours aucune**. Le `.exe` produit
  contient le code de Phase 1 mais aucun lancement runtime n'a ete fait.
  Disclaimer publie dans la release et le README.

Reste a verifier :
- Status final du run GitHub Action (succes / echec build).
- Telechargement et lancement de l'installeur alpha sur une machine de test.
- Comportement runtime de la refonte UI.
- Aucune regression sur les fonctions existantes (wrapper / API / fermeture).


## 2026-04-20 - Refonte UX/UI Phase 1 (Tailwind + Lucide + typo)

Contexte : chantier UX/UI premium decide en debut de session,
phases 1a a 1e executees en code local.

Actions effectuees :
- Installation `tailwindcss@^3.4.19` (devDependency).
- Telechargement des fonts `InterVariable.woff2`, `InterVariable-Italic.woff2`,
  `JetBrainsMono.woff2`, `JetBrainsMono-Bold.woff2` dans `src/assets/fonts/`.
- Creation `tailwind.config.js` avec design tokens
  (couleurs RGB CSS vars, radius, shadows, animations, font families).
- Creation `src/input.css` (source Tailwind + @font-face + 3 themes
  midnight/graphite/aurora + classes legacy compatibles renderer.js).
- Creation `src/icons.js` : 30 icones Lucide inline en SVG, CSP-safe,
  injection automatique sur `[data-icon]`.
- Reecriture complete `src/index.html` en utilitaires Tailwind,
  IDs preserves pour ne pas casser `renderer.js`.
- Mise a jour `package.json` : scripts `build:css`, `watch:css`,
  preprocess avant `start`/`dev`/`pack`/`dist`/`release:tag`.
- Enrichissement CSP : ajout `font-src 'self'`.

Commandes executees :
- `npm install -D tailwindcss@^3.4.0` -> ok (67 packages, 1 high vuln a auditer plus tard).
- `npm run build:css` -> ok (487 ms, CSS minifie genere dans `src/styles.css`).
- `npm run lint:security` -> ok (`node --check` sur main.js / preload.js / renderer.js).

Etat explicite :
- Repo modifie : commits crees et pousses sur `origin/main`.
  - `471c243 chore(docs): add roadmap + validation journals and ignore .claude`
  - `988b8b8 feat(ui): bootstrap premium UX/UI refonte (Phase 1)`
- Prod alignee : non. Aucun build d'installeur n'a ete refait depuis.
- Validation reelle effectuee : aucune. Aucun lancement runtime de l'application.
  Le rendu visuel n'a pas ete observe. Comportement de `renderer.js` avec le
  nouveau markup non verifie. **A faire en priorite a la prochaine session.**

Reste a verifier (avant Phase 2) :
- `npm start` se lance sans erreur console.
- Titlebar, sidebar, mode switch s'affichent et reagissent.
- Toggle sidebar et toggle right-panel fonctionnent (classes legacy).
- Creation d'une conversation API et envoi d'un message.
- Switch vers mode wrapper et chargement de chat.deepseek.com.
- Theme switch midnight / graphite / aurora.

## 2026-04-20 (anterieur) - Statut debut de session

Commandes : `git status --short --branch`, `git log --oneline -20`,
`npm run lint:security` (OK).
Etat : creation initiale de `ROADMAP.md` et `VALIDATION.md`.
Validation reelle : aucune (lint syntaxique uniquement).
