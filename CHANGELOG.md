# Changelog

## Unreleased - UX/UI premium (en cours)

### Phase 1 (code local, non valide runtime)
- introduced Tailwind CSS pipeline (CLI standalone, no bundler)
- vendored Inter Variable + JetBrains Mono fonts locally (CSP-safe)
- replaced unicode emojis by inline Lucide SVG icons
- rewrote `src/index.html` with Tailwind utilities and proper hierarchy
- added 3 themes (midnight, graphite, aurora) on RGB CSS variables
- preserved `renderer.js` compatibility via legacy class shims in `src/input.css`
- added `font-src 'self'` to Content-Security-Policy

### A venir
- Phase 2: Markdown rendering with marked + highlight.js + KaTeX in messages
- Phase 3: microinteractions, focus rings, skeletons, empty states
- Phase 4: polish, version bump, release validation

## 0.5.0
- restored official DeepSeek wrapper mode
- kept API mode with local chats and profiles
- improved layout and mode switching
- hardened wrapper session isolation
