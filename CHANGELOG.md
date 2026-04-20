# Changelog

## 0.6.0-alpha.1 - PRE-RELEASE (NOT runtime validated)

> **Disclaimer / Avertissement**
>
> This pre-release ships the Phase 1 of the UX/UI refonte (Tailwind, Lucide
> icons, premium typography). The build has **not** been tested at runtime
> by the maintainer at the time of publishing. The installer is provided so
> the GitHub release stays aligned with the `main` branch.
>
> Do not use this build as your daily driver. Stable channel users on
> v0.5.0 are not auto-updated to this pre-release.

### Phase 1 (code shipped, runtime not validated)
- introduced Tailwind CSS pipeline (CLI standalone, no bundler)
- vendored Inter Variable + JetBrains Mono fonts locally (CSP-safe)
- replaced unicode emojis by inline Lucide SVG icons
- rewrote `src/index.html` with Tailwind utilities and proper hierarchy
- added 3 themes (midnight, graphite, aurora) on RGB CSS variables
- preserved `renderer.js` compatibility via legacy class shims in `src/input.css`
- added `font-src 'self'` to Content-Security-Policy
- release workflow: tags with `-` are now flagged as GitHub pre-release

### Coming next
- Phase 2: Markdown rendering with marked + highlight.js + KaTeX in messages
- Phase 3: microinteractions, focus rings, skeletons, empty states
- Phase 4: polish, version bump to 0.6.0 stable, release validation

## 0.5.0
- restored official DeepSeek wrapper mode
- kept API mode with local chats and profiles
- improved layout and mode switching
- hardened wrapper session isolation
