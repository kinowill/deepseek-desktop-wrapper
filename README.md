# DeepSeek Desktop

> Stable release: **v0.5.0**. A pre-release **v0.6.0-alpha.1** ships the Phase 1
> UX/UI refonte but is **not runtime-validated**. Install the alpha only if
> you accept it may crash. Stable v0.5.0 users keep auto-update on v0.5.x.

Hybrid desktop app for DeepSeek with two modes:
- Official wrapper for `https://chat.deepseek.com/`
- API workspace for personal DeepSeek API profiles

## Highlights
- isolated official wrapper session
- local chat tabs and history for API mode
- profiles and encrypted API key storage
- export/import chats
- Windows NSIS build
- tray, splash screen, auto-update wiring

## Run

```bash
npm install
npm start
```

## Build

```bash
npm run dist
```
