# Roadmap

## Etat courant

Version courante : v0.5.0 (hybride wrapper officiel + mode API).
Chantier en cours : **refonte UX/UI premium** (Tailwind + Lucide + typo premium).

## Chantier UX/UI premium

Decision (2026-04-20) : refonte progressive en 8 phases pour atteindre une qualite
"app SaaS payante", sans changer l'architecture Electron + JS vanille.

Choix techniques :
- Tailwind CSS (CLI standalone, pas de bundler).
- Lucide icons inline en SVG (CSP-safe, ~30kb).
- Inter Variable + JetBrains Mono vendorees localement.
- Marked + highlight.js + KaTeX pour le rendu Markdown (Phase 2).

| Phase | Sujet | Statut |
|---|---|---|
| 1a | Setup Tailwind + design tokens + fonts | Fait (code local) |
| 1b | Migration titlebar + sidebar | Fait (code local) |
| 1c | Migration workspace API | Fait (code local) |
| 1d | Migration panneau reglages | Fait (code local) |
| 1e | Migration mode wrapper | Fait (code local) |
| 2  | Markdown + code highlight + KaTeX | A faire |
| 3  | Microinteractions + empty states + skeletons | A faire |
| 4  | Polish + docs + version + validation reelle | A faire |

## Prochaines priorites

1. **Bloquant** : validation visuelle de la Phase 1 par l'utilisateur (npm start).
2. Phase 2 : rendu Markdown des messages (actuellement texte brut).
3. Phase 3 : microinteractions, focus states, skeletons.
4. Phase 4 : doc, bump version, release.
5. Apres UX/UI : valider la release installee (point reste de la roadmap initiale).

## Points bloques ou non verifies

- Validation visuelle de la refonte UI Phase 1 non effectuee.
- Validation de l'installeur GitHub v0.5.0 toujours non effectuee.
- Test manuel du mode wrapper non effectue.
- Test manuel du mode API non effectue.
- Verification de fermeture complete de l'application non effectuee.
