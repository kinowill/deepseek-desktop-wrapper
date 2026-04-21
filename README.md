# DeepSeek Desktop

> Current release: **v1.0.0**
> Hybrid Windows desktop app for DeepSeek: official wrapper + personal API workspace.
> This release line includes the refreshed UI, streaming chat fix, and the new custom app icon.

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

## Local Data And API Keys

This app stores its local state in Electron's `userData` directory.

- On Windows, Electron uses `%APPDATA%` by default for `userData`, not `%LOCALAPPDATA%`.
- For this app, the expected packaged-app folder is `%APPDATA%\\DeepSeek Desktop\\`.
- Profiles, API key state, chat history, and UI preferences are stored in `%APPDATA%\\DeepSeek Desktop\\app-state.json`.
- Logs are stored in `%APPDATA%\\DeepSeek Desktop\\logs\\`.
- The API key is stored inside `app-state.json` as encrypted local app data (`apiKeyEncrypted`).
- Wrapper session data can also persist under the same `userData` tree in Electron / Chromium storage folders.

Important:

- uninstalling the app does not guarantee deletion of this local data folder
- deleting only `AppData\\Local` is not enough for this app's saved profiles / API keys
- to fully wipe local state, uninstall the app and then delete the app's `userData` folder manually
- this project does not commit your local profiles or API keys into the Git repository

Source of truth in code:

- `src/main.js` writes app state to `app.getPath('userData')/app-state.json`
- `src/main.js` writes logs to `app.getPath('userData')/logs`
- Electron documents `userData` as `appData + app name`, and `appData` maps to `%APPDATA%` on Windows

## Run

```bash
npm install
npm start
```

## Build

```bash
npm run dist
```
