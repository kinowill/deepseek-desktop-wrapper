# DeepSeek Desktop

API-only DeepSeek desktop workspace built with Electron.

This version removes the web wrapper entirely and focuses on a cleaner desktop product:
- collapsible sidebar
- tabbed conversations
- local chat history
- search across conversations
- per-chat settings
- multi-profile API keys
- attachment import as contextual snippets
- custom title bar
- tray icon
- splash screen
- launch at startup
- notifications
- controlled logging
- Windows NSIS installer
- GitHub Releases workflow
- auto-update wiring through GitHub Releases

## Tech

- Electron
- electron-builder
- electron-updater
- HTML / CSS / JavaScript

## DeepSeek API notes

The app uses the DeepSeek Chat Completions endpoint and can also query `/models` to refresh the available models. DeepSeek documents `deepseek-chat` and `deepseek-reasoner`, the `/chat/completions` endpoint, optional SSE streaming with `stream: true`, the `thinking` switch, and JSON output via `response_format`.

## Install for development

```bash
npm install
npm start
```

## Build the Windows installer

```bash
npm run dist
```

Output:
- `dist/DeepSeek Desktop Setup 0.4.0.exe`
- `dist/latest.yml`
- `dist/*.blockmap`

## Security model

- API-only architecture
- no `webview`
- `contextIsolation: true`
- `sandbox: true`
- `nodeIntegration: false`
- strict preload bridge
- API keys stored encrypted with Electron `safeStorage` when available
- logs exclude obvious API key patterns
- renderer cannot access Node directly

## Main desktop features

### UX/UI
- collapsible sidebar
- tabs for open conversations
- local drafts
- search in chat history
- keyboard shortcuts
- premium dark themes
- frameless custom window controls

### Functional
- multi-profile API keys
- dynamic model refresh
- thinking toggle
- JSON output toggle
- stream toggle
- export/import chats
- per-chat system prompt
- file attachments imported as contextual text or binary metadata

### Desktop
- tray icon
- splash screen
- open at login toggle
- desktop notifications
- offline-friendly local access to existing chats and drafts
- auto-update wiring

## Keyboard shortcuts

- `Ctrl+N` new chat
- `Ctrl+K` focus search
- `Ctrl+,` open settings panel
- `Ctrl+Shift+E` export current chat
- `Ctrl+Enter` send

## Auto-update and Releases

`electron-updater` expects release metadata and binaries to be published with your builds. `electron-builder` supports publishing metadata for auto-updates, and the included workflow uploads the Windows installer and update files to GitHub Releases on tag pushes.

### Release flow

1. Update version in `package.json` and `CHANGELOG.md`
2. Commit and push
3. Create a git tag, for example:
   ```bash
   git tag v0.4.0
   git push origin v0.4.0
   ```
4. GitHub Actions builds the installer and uploads it to the Release

## GitHub Actions

The included workflow is in:
- `.github/workflows/release.yml`

It builds the Windows NSIS installer and uploads:
- `.exe`
- `.blockmap`
- `latest.yml`

These files are the basis for GitHub Releases distribution and the updater flow.

## Notes

- The auto-update path is wired for the public repo `kinowill/deepseek-desktop-wrapper`
- If you change owner or repo name, update the `build.publish` block in `package.json`
- Binary file attachments are intentionally not auto-embedded in full text
- Unsent messages stay local when offline and can be retried
