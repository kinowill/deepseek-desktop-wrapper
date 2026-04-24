# Changelog

## 1.2.0 - i18n english primary + french switch

### Internationalization
- app UI now defaults to English and exposes a live French switch in Preferences
- static interface copy is centralized through `src/i18n.js` and `data-i18n` bindings
- dynamic renderer strings now follow the active UI language for toasts, confirmations, generated chat titles, metadata, wrapper states, and update states
- main-process UI now follows the active language for the tray menu, update notifications, file dialogs, attachment notes, and key IPC error messages

### Release hygiene
- packaging metadata bumped to `1.2.0` to separate the i18n release line from the prior `1.1.0` DeepSeek V4 awareness build

## 1.1.0 - DeepSeek V4 awareness

### DeepSeek V4 awareness
- model picker now surfaces `deepseek-v4-pro` and `deepseek-v4-flash` (released 2026-04-24)
- contextual dismissible banner shown in API mode whenever the active chat uses a legacy alias (`deepseek-chat` or `deepseek-reasoner`), warning about the 2026-07-24 deprecation and pointing to the new V4 IDs
- "Ne plus afficher" action persists the dismiss state per user (stored in `ui.legacyModelBannerDismissed` in `app-state.json`)
- default model input placeholder updated to `deepseek-v4-flash` (stored defaults in existing profiles are untouched)

## 1.0.0 - First public V1 release

Hybrid wrapper + API desktop release line aligned for a proper GitHub setup.
This version packages the refreshed UI, the streaming chat fix, and the
new custom app, tray, and build icons into one clean Windows release target.

### UI polish
- sidebar collapsed mode centers icon-only actions and reduces conversation cards to avatar badges
- tab bar adds a "+" action for browser-like new conversation creation
- conversations support inline rename and delete actions
- titlebar settings now open a dedicated Preferences dialog
- API key banner guides the user to missing profile configuration
- select options now render on a readable surface background
- app window, Windows installer, and tray now use the new custom whale icon

### Fixes
- deleting a profile now removes the actual selected profile
- API streaming chat no longer rerenders the full message list on every token
- manual scrolling remains usable while a streamed reply is being generated

### Docs
- README now explains where local profiles, API keys, logs, and wrapper session data are stored on Windows
- README now warns that uninstall alone does not guarantee deletion of the app's local data folder

## 0.6.0-alpha.1 - Pre-release (not runtime validated)

### Phase 1
- introduced Tailwind CSS pipeline (CLI standalone, no bundler)
- vendored Inter Variable + JetBrains Mono fonts locally (CSP-safe)
- replaced unicode emojis by inline Lucide SVG icons
- rewrote `src/index.html` with Tailwind utilities and proper hierarchy
- added 3 themes (midnight, graphite, aurora) on RGB CSS variables
- preserved `renderer.js` compatibility via legacy class shims in `src/input.css`
- added `font-src 'self'` to Content-Security-Policy
- release workflow marks tags containing `-` as GitHub pre-releases
