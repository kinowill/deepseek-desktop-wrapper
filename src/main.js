let isQuitting = false;

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, Notification, shell, safeStorage } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const APP_STATE_PATH = path.join(app.getPath('userData'), 'app-state.json');
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
const LOG_PATH = path.join(LOG_DIR, 'app.log');
const RUNTIME_VERSION = 3;
const MAX_CHATS = 250;
const MAX_MESSAGES_PER_CHAT = 200;
const MAX_ATTACHMENTS_PER_MESSAGE = 8;
const MAX_ATTACHMENT_TEXT = 16000;
const ALLOWED_RESPONSE_FORMATS = new Set(['text', 'json_object']);
const ALLOWED_THINKING = new Set(['auto', 'enabled', 'disabled']);
const ALLOWED_THEMES = new Set(['midnight', 'graphite', 'aurora']);
const ALLOWED_MODES = new Set(['api', 'wrapper']);
const WRAPPER_HOME_URL = 'https://chat.deepseek.com/';
const WRAPPER_PARTITION = 'persist:deepseek-official';
const WRAPPER_ALLOWED_HOST_SUFFIXES = ['deepseek.com'];
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.jsonl', '.csv', '.tsv', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss',
  '.py', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp', '.sh', '.ps1', '.yml', '.yaml', '.xml',
  '.sql', '.log', '.ini', '.toml', '.env'
]);

let mainWindow = null;
let splashWindow = null;
let tray = null;
let internalState = null;
let updateDownloadedInfo = null;

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function sanitizeText(value, maxLength = 12000) {
  return typeof value === 'string' ? value.replace(/\u0000/g, '').slice(0, maxLength) : '';
}

function sanitizeBaseUrl(input) {
  const fallback = 'https://api.deepseek.com';
  try {
    const url = new URL(input || fallback);
    if (url.protocol !== 'https:') return fallback;
    if (url.username || url.password || url.hash) return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

function sanitizeWrapperUrl(input) {
  try {
    const url = new URL(input || WRAPPER_HOME_URL);
    const host = url.hostname.toLowerCase();
    const allowed = url.protocol === 'https:' && WRAPPER_ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
    return allowed ? url.toString() : WRAPPER_HOME_URL;
  } catch {
    return WRAPPER_HOME_URL;
  }
}

function isAllowedWrapperUrl(input) {
  return sanitizeWrapperUrl(input) === (() => {
    try {
      return new URL(input).toString();
    } catch {
      return '';
    }
  })();
}

function encryptString(value) {
  if (!value) return '';
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64');
  }
  return Buffer.from(value, 'utf8').toString('base64');
}

function decryptString(value) {
  if (!value) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(value, 'base64'));
    }
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function createDefaultProfile() {
  return {
    id: uid('profile'),
    name: 'Primary',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    thinkingType: 'auto',
    responseFormat: 'text',
    temperature: 0.7,
    maxTokens: 4096,
    stream: true,
    systemPrompt: '',
    apiKeyEncrypted: '',
    updatedAt: new Date().toISOString()
  };
}

function createDefaultChat(profileId) {
  const now = new Date().toISOString();
  return {
    id: uid('chat'),
    title: 'New conversation',
    profileId,
    model: 'deepseek-chat',
    thinkingType: 'auto',
    responseFormat: 'text',
    temperature: 0.7,
    maxTokens: 4096,
    stream: true,
    systemPrompt: '',
    draft: '',
    messages: [],
    createdAt: now,
    updatedAt: now
  };
}

function defaultState() {
  const profile = createDefaultProfile();
  const chat = createDefaultChat(profile.id);
  return {
    version: RUNTIME_VERSION,
    profiles: [profile],
    activeProfileId: profile.id,
    chats: [chat],
    openChatIds: [chat.id],
    activeChatId: chat.id,
    ui: {
      sidebarCollapsed: false,
      theme: 'midnight',
      notificationsEnabled: true,
      autoLaunch: false,
      autoUpdateEnabled: true,
      loggingEnabled: true,
      rightPanelCollapsed: false,
      currentMode: 'api',
      wrapperUrl: WRAPPER_HOME_URL,
      lastUpdateCheckAt: null
    }
  };
}

function sanitizeStoredProfile(profile = {}, existing = null) {
  return {
    id: sanitizeText(profile.id || existing?.id || uid('profile'), 64),
    name: sanitizeText(profile.name || existing?.name || 'Profile', 60) || 'Profile',
    baseUrl: sanitizeBaseUrl(profile.baseUrl || existing?.baseUrl),
    defaultModel: sanitizeText(profile.defaultModel || existing?.defaultModel || 'deepseek-chat', 120) || 'deepseek-chat',
    thinkingType: ALLOWED_THINKING.has(profile.thinkingType) ? profile.thinkingType : (existing?.thinkingType || 'auto'),
    responseFormat: ALLOWED_RESPONSE_FORMATS.has(profile.responseFormat) ? profile.responseFormat : (existing?.responseFormat || 'text'),
    temperature: clampNumber(profile.temperature, 0, 2, existing?.temperature ?? 0.7),
    maxTokens: Math.floor(clampNumber(profile.maxTokens, 256, 64000, existing?.maxTokens ?? 4096)),
    stream: typeof profile.stream === 'boolean' ? profile.stream : (existing?.stream ?? true),
    systemPrompt: sanitizeText(profile.systemPrompt ?? existing?.systemPrompt, 16000),
    apiKeyEncrypted: typeof profile.apiKeyEncrypted === 'string' ? profile.apiKeyEncrypted : (existing?.apiKeyEncrypted || ''),
    updatedAt: profile.updatedAt || existing?.updatedAt || new Date().toISOString()
  };
}

function sanitizeAttachment(attachment = {}) {
  return {
    id: sanitizeText(attachment.id || uid('att'), 64),
    name: sanitizeText(attachment.name, 180) || 'attachment',
    mime: sanitizeText(attachment.mime, 160),
    size: Math.max(0, Math.floor(Number(attachment.size) || 0)),
    kind: attachment.kind === 'binary' ? 'binary' : 'text',
    textExcerpt: sanitizeText(attachment.textExcerpt, MAX_ATTACHMENT_TEXT),
    note: sanitizeText(attachment.note, 500),
    importedAt: attachment.importedAt || new Date().toISOString()
  };
}

function sanitizeMessage(message = {}) {
  return {
    id: sanitizeText(message.id || uid('msg'), 64),
    role: ['system', 'user', 'assistant', 'tool'].includes(message.role) ? message.role : 'user',
    content: sanitizeText(message.content, 40000),
    reasoningContent: sanitizeText(message.reasoningContent, 40000),
    status: ['sent', 'pending', 'error', 'streaming'].includes(message.status) ? message.status : 'sent',
    error: sanitizeText(message.error, 400),
    createdAt: message.createdAt || new Date().toISOString(),
    attachments: Array.isArray(message.attachments) ? message.attachments.slice(0, MAX_ATTACHMENTS_PER_MESSAGE).map(sanitizeAttachment) : []
  };
}

function sanitizeStoredChat(chat = {}, existing = null, profiles = []) {
  const fallbackProfileId = profiles[0]?.id || existing?.profileId || createDefaultProfile().id;
  const profileId = profiles.some((profile) => profile.id === chat.profileId) ? chat.profileId : (profiles.some((profile) => profile.id === existing?.profileId) ? existing.profileId : fallbackProfileId);
  const sanitized = {
    id: sanitizeText(chat.id || existing?.id || uid('chat'), 64),
    title: sanitizeText(chat.title || existing?.title || 'New conversation', 140) || 'New conversation',
    profileId,
    model: sanitizeText(chat.model || existing?.model || 'deepseek-chat', 120) || 'deepseek-chat',
    thinkingType: ALLOWED_THINKING.has(chat.thinkingType) ? chat.thinkingType : (existing?.thinkingType || 'auto'),
    responseFormat: ALLOWED_RESPONSE_FORMATS.has(chat.responseFormat) ? chat.responseFormat : (existing?.responseFormat || 'text'),
    temperature: clampNumber(chat.temperature, 0, 2, existing?.temperature ?? 0.7),
    maxTokens: Math.floor(clampNumber(chat.maxTokens, 256, 64000, existing?.maxTokens ?? 4096)),
    stream: typeof chat.stream === 'boolean' ? chat.stream : (existing?.stream ?? true),
    systemPrompt: sanitizeText(chat.systemPrompt ?? existing?.systemPrompt, 16000),
    draft: sanitizeText(chat.draft ?? existing?.draft, 12000),
    messages: Array.isArray(chat.messages) ? chat.messages.slice(0, MAX_MESSAGES_PER_CHAT).map(sanitizeMessage) : (Array.isArray(existing?.messages) ? existing.messages.map(sanitizeMessage) : []),
    createdAt: chat.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: chat.updatedAt || existing?.updatedAt || new Date().toISOString()
  };

  if (!sanitized.messages.length && existing?.messages?.length) {
    sanitized.messages = existing.messages.map(sanitizeMessage);
  }

  return sanitized;
}

function normalizePrivateState(raw = {}) {
  const defaults = defaultState();
  const rawProfiles = Array.isArray(raw.profiles) && raw.profiles.length ? raw.profiles : defaults.profiles;
  const profiles = rawProfiles.slice(0, 12).map((profile, index) => sanitizeStoredProfile(profile, defaults.profiles[index % defaults.profiles.length]));
  const activeProfileId = profiles.some((profile) => profile.id === raw.activeProfileId) ? raw.activeProfileId : profiles[0].id;

  const rawChats = Array.isArray(raw.chats) && raw.chats.length ? raw.chats : [createDefaultChat(activeProfileId)];
  const chats = rawChats.slice(0, MAX_CHATS).map((chat) => sanitizeStoredChat(chat, null, profiles));
  if (!chats.length) {
    chats.push(createDefaultChat(activeProfileId));
  }

  const chatIds = new Set(chats.map((chat) => chat.id));
  const activeChatId = chatIds.has(raw.activeChatId) ? raw.activeChatId : chats[0].id;
  const openChatIds = Array.isArray(raw.openChatIds)
    ? raw.openChatIds.filter((chatId) => chatIds.has(chatId)).slice(0, 8)
    : [activeChatId];

  const ui = {
    sidebarCollapsed: Boolean(raw.ui?.sidebarCollapsed),
    theme: ALLOWED_THEMES.has(raw.ui?.theme) ? raw.ui.theme : 'midnight',
    notificationsEnabled: raw.ui?.notificationsEnabled !== false,
    autoLaunch: Boolean(raw.ui?.autoLaunch),
    autoUpdateEnabled: raw.ui?.autoUpdateEnabled !== false,
    loggingEnabled: raw.ui?.loggingEnabled !== false,
    rightPanelCollapsed: Boolean(raw.ui?.rightPanelCollapsed),
    currentMode: ALLOWED_MODES.has(raw.ui?.currentMode) ? raw.ui.currentMode : 'api',
    wrapperUrl: sanitizeWrapperUrl(raw.ui?.wrapperUrl),
    lastUpdateCheckAt: raw.ui?.lastUpdateCheckAt || null
  };

  return {
    version: RUNTIME_VERSION,
    profiles,
    activeProfileId,
    chats,
    openChatIds: openChatIds.length ? openChatIds : [activeChatId],
    activeChatId,
    ui
  };
}

function serializePublicState(state) {
  return {
    ...state,
    profiles: state.profiles.map((profile) => ({
      ...profile,
      apiKeyEncrypted: undefined,
      hasApiKey: Boolean(profile.apiKeyEncrypted)
    }))
  };
}

function readState() {
  if (internalState) return internalState;
  try {
    if (!fs.existsSync(APP_STATE_PATH)) {
      internalState = defaultState();
      return internalState;
    }
    const parsed = JSON.parse(fs.readFileSync(APP_STATE_PATH, 'utf8'));
    internalState = normalizePrivateState(parsed);
    return internalState;
  } catch (error) {
    internalState = defaultState();
    appendLog('error', 'Failed to read app state', { message: error.message });
    return internalState;
  }
}

function saveState(nextState) {
  internalState = normalizePrivateState(nextState);
  fs.mkdirSync(path.dirname(APP_STATE_PATH), { recursive: true });
  fs.writeFileSync(APP_STATE_PATH, JSON.stringify(internalState, null, 2), 'utf8');
  applyDesktopPreferences(internalState);
  return internalState;
}

function sanitizeIncomingState(payload = {}, current = readState()) {
  const currentProfilesById = new Map(current.profiles.map((profile) => [profile.id, profile]));
  const incomingProfiles = Array.isArray(payload.profiles) && payload.profiles.length ? payload.profiles.slice(0, 12) : current.profiles;
  const profiles = incomingProfiles.map((profile) => {
    const existing = currentProfilesById.get(profile.id);
    const encrypted = profile.clearApiKey
      ? ''
      : (typeof profile.apiKeyInput === 'string' && profile.apiKeyInput.trim()
        ? encryptString(profile.apiKeyInput.trim())
        : (existing?.apiKeyEncrypted || ''));

    return sanitizeStoredProfile({
      ...profile,
      apiKeyEncrypted: encrypted,
      updatedAt: new Date().toISOString()
    }, existing);
  });

  if (!profiles.length) {
    profiles.push(createDefaultProfile());
  }

  const activeProfileId = profiles.some((profile) => profile.id === payload.activeProfileId)
    ? payload.activeProfileId
    : (profiles.some((profile) => profile.id === current.activeProfileId) ? current.activeProfileId : profiles[0].id);

  const currentChatsById = new Map(current.chats.map((chat) => [chat.id, chat]));
  const incomingChats = Array.isArray(payload.chats) && payload.chats.length ? payload.chats.slice(0, MAX_CHATS) : current.chats;
  const chats = incomingChats.map((chat) => sanitizeStoredChat({ ...chat, updatedAt: new Date().toISOString() }, currentChatsById.get(chat.id), profiles));

  if (!chats.length) {
    chats.push(createDefaultChat(activeProfileId));
  }

  const chatIds = new Set(chats.map((chat) => chat.id));
  const activeChatId = chatIds.has(payload.activeChatId) ? payload.activeChatId : (chatIds.has(current.activeChatId) ? current.activeChatId : chats[0].id);
  const openChatIds = Array.isArray(payload.openChatIds)
    ? payload.openChatIds.filter((chatId) => chatIds.has(chatId)).slice(0, 8)
    : current.openChatIds.filter((chatId) => chatIds.has(chatId)).slice(0, 8);

  return {
    version: RUNTIME_VERSION,
    profiles,
    activeProfileId,
    chats,
    openChatIds: openChatIds.length ? openChatIds : [activeChatId],
    activeChatId,
    ui: {
      sidebarCollapsed: Boolean(payload.ui?.sidebarCollapsed),
      theme: ALLOWED_THEMES.has(payload.ui?.theme) ? payload.ui.theme : current.ui.theme,
      notificationsEnabled: payload.ui?.notificationsEnabled !== false,
      autoLaunch: Boolean(payload.ui?.autoLaunch),
      autoUpdateEnabled: payload.ui?.autoUpdateEnabled !== false,
      loggingEnabled: payload.ui?.loggingEnabled !== false,
      rightPanelCollapsed: Boolean(payload.ui?.rightPanelCollapsed),
      currentMode: ALLOWED_MODES.has(payload.ui?.currentMode) ? payload.ui.currentMode : current.ui.currentMode,
      wrapperUrl: sanitizeWrapperUrl(payload.ui?.wrapperUrl || current.ui.wrapperUrl),
      lastUpdateCheckAt: payload.ui?.lastUpdateCheckAt || current.ui.lastUpdateCheckAt || null
    }
  };
}

function appendLog(level, message, meta = {}) {
  const state = readState();
  if (!state.ui.loggingEnabled) return;
  fs.mkdirSync(LOG_DIR, { recursive: true });
  try {
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > 1024 * 1024) {
      fs.renameSync(LOG_PATH, path.join(LOG_DIR, `app-${Date.now()}.log`));
    }
  } catch {
    // ignore rotate issues
  }
  const safeMeta = JSON.stringify(meta).replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]');
  fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${level.toUpperCase()} ${message} ${safeMeta}\n`, 'utf8');
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function showNotification(title, body) {
  const state = readState();
  if (!state.ui.notificationsEnabled) return;
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body, silent: false });
  notification.show();
}

function clearIpcHandlers() {
  const channels = [
    'state:get',
    'state:save',
    'profiles:list-models',
    'chat:send',
    'attachments:pick',
    'chats:export',
    'chats:import',
    'logs:open-folder',
    'app:meta',
    'app:check-updates',
    'app:download-update',
    'app:install-update',
    'window:action'
  ];

  for (const channel of channels) {
    try {
      ipcMain.removeHandler(channel);
    } catch {
      // ignore missing handlers
    }
  }
}

function cleanupAndQuit() {
  if (isQuitting) return;
  isQuitting = true;

  try {
    if (tray) {
      tray.destroy();
      tray = null;
    }
  } catch {
    // ignore tray teardown failures
  }

  try {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
    }
  } catch {
    // ignore splash teardown failures
  }
  splashWindow = null;

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
  } catch {
    // ignore window teardown failures
  }
  mainWindow = null;

  app.quit();
}

function getRuntimeIcon() {
  return path.join(__dirname, 'assets', 'tray-icon.png');
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 260,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: true,
    skipTaskbar: true,
    movable: false,
    backgroundColor: '#00000000'
  });

  const splashHtml = `
    <html>
      <body style="margin:0;background:transparent;display:grid;place-items:center;font-family:Segoe UI,Arial,sans-serif;">
        <div style="width:380px;height:200px;border-radius:26px;background:linear-gradient(180deg, rgba(11,20,35,.96), rgba(8,13,23,.96));border:1px solid rgba(120,180,255,.22);box-shadow:0 30px 80px rgba(0,0,0,.45);display:grid;place-items:center;color:#edf4ff;">
          <div style="text-align:center;">
            <div style="font-size:58px;font-weight:800;letter-spacing:.08em;">DS</div>
            <div style="margin-top:10px;font-size:18px;font-weight:600;">DeepSeek Desktop</div>
            <div style="margin-top:8px;color:#8db8ff;font-size:13px;">Hybrid workspace is loading</div>
          </div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#07111d',
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('close', () => {
    isQuitting = true;
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
  });

  mainWindow.on('focus', () => sendToRenderer('app:event', { type: 'window-focus' }));
  mainWindow.on('maximize', () => sendToRenderer('app:event', { type: 'window-maximized', value: true }));
  mainWindow.on('unmaximize', () => sendToRenderer('app:event', { type: 'window-maximized', value: false }));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch {
      // ignore invalid urls
    }
    return { action: 'deny' };
  });
}

function setupWebviewSecurity() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      if (!isAllowedWrapperUrl(params.src)) {
        event.preventDefault();
        appendLog('warning', 'Blocked wrapper attachment', { src: params.src });
        return;
      }

      delete webPreferences.preload;
      delete webPreferences.preloadURL;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      webPreferences.webSecurity = true;
      webPreferences.allowRunningInsecureContent = false;
      webPreferences.partition = WRAPPER_PARTITION;
      webPreferences.devTools = !app.isPackaged;

      params.partition = WRAPPER_PARTITION;
      params.allowpopups = 'false';
    });

    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'https:') shell.openExternal(url);
        } catch {
          // ignore invalid urls
        }
        return { action: 'deny' };
      });

      contents.on('will-navigate', (event, url) => {
        if (!isAllowedWrapperUrl(url)) {
          event.preventDefault();
          try { shell.openExternal(url); } catch {}
        }
      });
    }
  });
}

function createTray() {
  const icon = getRuntimeIcon();

  try {
    if (tray) {
      tray.destroy();
      tray = null;
    }
  } catch {
    // ignore previous tray cleanup issues
  }

  tray = new Tray(icon);
  tray.setToolTip('DeepSeek Desktop');
  const menu = Menu.buildFromTemplate([
    { label: 'Show app', click: () => showMainWindow() },
    { label: 'New chat', click: () => sendToRenderer('app:event', { type: 'tray-new-chat' }) },
    { label: 'Check updates', click: () => checkForUpdatesManually() },
    { type: 'separator' },
    { label: 'Quit', click: () => cleanupAndQuit() }
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => showMainWindow());
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function applyDesktopPreferences(state) {
  try {
    app.setLoginItemSettings({ openAtLogin: Boolean(state.ui.autoLaunch) });
  } catch {
    // ignore unsupported environments
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    appendLog('info', 'Checking for updates');
    sendToRenderer('app:event', { type: 'update-status', status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    appendLog('info', 'Update available', { version: info?.version });
    sendToRenderer('app:event', { type: 'update-status', status: 'available', info });
    showNotification('Update available', `Version ${info?.version || 'new'} is ready to download.`);
  });

  autoUpdater.on('update-not-available', (info) => {
    appendLog('info', 'No update available', { version: info?.version });
    sendToRenderer('app:event', { type: 'update-status', status: 'idle', info });
  });

  autoUpdater.on('error', (error) => {
    appendLog('error', 'Auto update error', { message: error?.message });
    sendToRenderer('app:event', { type: 'update-status', status: 'error', message: error?.message || 'Update error' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('app:event', { type: 'update-progress', progress });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloadedInfo = info;
    appendLog('info', 'Update downloaded', { version: info?.version });
    sendToRenderer('app:event', { type: 'update-status', status: 'downloaded', info });
    showNotification('Update downloaded', 'Restart the app to install the new version.');
  });
}

async function checkForUpdatesManually() {
  const state = readState();
  if (!app.isPackaged || !state.ui.autoUpdateEnabled) {
    sendToRenderer('app:event', { type: 'update-status', status: 'disabled' });
    return { ok: false, reason: 'Auto update disabled or app not packaged.' };
  }
  const result = await autoUpdater.checkForUpdates();
  const nextState = {
    ...state,
    ui: {
      ...state.ui,
      lastUpdateCheckAt: new Date().toISOString()
    }
  };
  saveState(nextState);
  return { ok: true, result: Boolean(result) };
}

function getProfileById(profileId) {
  const state = readState();
  return state.profiles.find((profile) => profile.id === profileId) || state.profiles[0];
}

function getApiKeyForProfile(profileId) {
  const profile = getProfileById(profileId);
  return decryptString(profile.apiKeyEncrypted);
}

function buildAttachmentContext(attachments = []) {
  if (!attachments.length) return '';
  const lines = attachments.map((attachment) => {
    const meta = `${attachment.name} | ${attachment.kind} | ${attachment.size} bytes`;
    const excerpt = attachment.kind === 'text' && attachment.textExcerpt
      ? `\n${attachment.textExcerpt}`
      : `\n${attachment.note || 'Binary file attached. Only metadata is available locally.'}`;
    return `[Attachment]\n${meta}${excerpt}\n[/Attachment]`;
  });
  return `\n\n${lines.join('\n\n')}`;
}

function buildMessagesForApi(messages = []) {
  return messages
    .filter((message) => ['system', 'user', 'assistant', 'tool'].includes(message.role))
    .filter((message) => message.status !== 'pending' && message.status !== 'error')
    .map((message) => ({
      role: message.role,
      content: `${message.content || ''}${message.role === 'user' ? buildAttachmentContext(message.attachments) : ''}`.slice(0, 40000)
    }))
    .slice(-80);
}

async function fetchModelsForProfile(profileId) {
  const profile = getProfileById(profileId);
  const apiKey = getApiKeyForProfile(profile.id);
  if (!apiKey) throw new Error('Missing API key for this profile.');
  const response = await fetch(`${sanitizeBaseUrl(profile.baseUrl)}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error(`Model list failed (${response.status})`);
  }
  const data = await response.json();
  return Array.isArray(data?.data) ? data.data.map((item) => ({ id: item.id, ownedBy: item.owned_by })) : [];
}

async function executeChatRequest(event, payload = {}) {
  const profile = getProfileById(payload.profileId);
  const apiKey = getApiKeyForProfile(profile.id);
  if (!apiKey) throw new Error('Missing API key for this profile.');

  const model = sanitizeText(payload.model || profile.defaultModel || 'deepseek-chat', 120) || 'deepseek-chat';
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const requestId = sanitizeText(payload.requestId || uid('req'), 64);
  const stream = payload.stream !== false;
  const body = {
    model,
    messages: buildMessagesForApi(messages),
    stream,
    max_tokens: Math.floor(clampNumber(payload.maxTokens, 256, 64000, profile.maxTokens || 4096)),
    response_format: { type: ALLOWED_RESPONSE_FORMATS.has(payload.responseFormat) ? payload.responseFormat : (profile.responseFormat || 'text') }
  };

  const thinkingType = ALLOWED_THINKING.has(payload.thinkingType) ? payload.thinkingType : (profile.thinkingType || 'auto');
  if (thinkingType === 'enabled' || thinkingType === 'disabled') {
    body.thinking = { type: thinkingType };
  }

  if (payload.temperature != null) {
    body.temperature = clampNumber(payload.temperature, 0, 2, profile.temperature || 0.7);
  }

  appendLog('info', 'Sending API request', {
    profileId: profile.id,
    requestId,
    model,
    messageCount: body.messages.length,
    stream
  });

  const response = await fetch(`${sanitizeBaseUrl(profile.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`DeepSeek error ${response.status}: ${sanitizeText(message, 600)}`);
  }

  if (!stream) {
    const data = await response.json();
    const choice = data?.choices?.[0]?.message || {};
    return {
      requestId,
      message: {
        role: choice.role || 'assistant',
        content: choice.content || '',
        reasoningContent: choice.reasoning_content || ''
      },
      usage: data?.usage || null,
      model: data?.model || model
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let message = { role: 'assistant', content: '', reasoningContent: '' };
  let usage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const lines = part.split('\n').filter((line) => line.startsWith('data:'));
      for (const line of lines) {
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') continue;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        if (parsed.usage) {
          usage = parsed.usage;
        }

        const delta = parsed?.choices?.[0]?.delta || {};
        const contentDelta = typeof delta.content === 'string' ? delta.content : '';
        const reasoningDelta = typeof delta.reasoning_content === 'string' ? delta.reasoning_content : '';
        if (contentDelta) {
          message.content += contentDelta;
        }
        if (reasoningDelta) {
          message.reasoningContent += reasoningDelta;
        }
        if (contentDelta || reasoningDelta) {
          event.sender.send('chat:stream', {
            requestId,
            contentDelta,
            reasoningDelta
          });
        }
      }
    }
  }

  return { requestId, message, usage, model };
}

async function pickAttachments() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All files', extensions: ['*'] },
      { name: 'Text and code', extensions: ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'yml', 'yaml', 'csv', 'sql', 'log'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) return [];

  return result.filePaths.slice(0, MAX_ATTACHMENTS_PER_MESSAGE).map((filePath) => {
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isText = TEXT_EXTENSIONS.has(ext);
    const attachment = {
      id: uid('att'),
      name: path.basename(filePath),
      mime: isText ? 'text/plain' : 'application/octet-stream',
      size: stat.size,
      kind: isText ? 'text' : 'binary',
      importedAt: new Date().toISOString(),
      note: ''
    };

    if (isText) {
      try {
        attachment.textExcerpt = fs.readFileSync(filePath, 'utf8').slice(0, MAX_ATTACHMENT_TEXT);
      } catch {
        attachment.textExcerpt = '';
        attachment.note = 'Text file could not be decoded with UTF-8.';
      }
    } else {
      attachment.textExcerpt = '';
      attachment.note = 'Binary file metadata imported. Content is not embedded automatically.';
    }

    return sanitizeAttachment(attachment);
  });
}

async function exportChats(payload = {}) {
  const chats = Array.isArray(payload.chats) ? payload.chats.map((chat) => sanitizeStoredChat(chat, null, readState().profiles)) : [];
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'deepseek-chats-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  const data = {
    exportedAt: new Date().toISOString(),
    app: 'DeepSeek Desktop',
    version: RUNTIME_VERSION,
    chats
  };
  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
  return { canceled: false, filePath: result.filePath };
}

async function importChats() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true, chats: [] };

  const raw = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
  const sourceChats = Array.isArray(raw?.chats) ? raw.chats : [];
  const profiles = readState().profiles;
  const chats = sourceChats.slice(0, MAX_CHATS).map((chat) => sanitizeStoredChat({
    ...chat,
    id: uid('chat'),
    title: `${sanitizeText(chat.title, 120) || 'Imported conversation'} (imported)`
  }, null, profiles));

  return { canceled: false, chats };
}

function openLogsFolder() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, '', 'utf8');
  }
  shell.showItemInFolder(LOG_PATH);
}

function registerIpc() {
  ipcMain.handle('state:get', () => serializePublicState(readState()));

  ipcMain.handle('state:save', (_event, payload) => {
    const nextState = sanitizeIncomingState(payload || {}, readState());
    const saved = saveState(nextState);
    return serializePublicState(saved);
  });

  ipcMain.handle('profiles:list-models', async (_event, payload) => {
    try {
      const models = await fetchModelsForProfile(payload?.profileId);
      return { ok: true, models };
    } catch (error) {
      appendLog('error', 'Model fetch failed', { message: error.message });
      return { ok: false, message: error.message, models: [] };
    }
  });

  ipcMain.handle('chat:send', async (event, payload) => {
    try {
      return await executeChatRequest(event, payload || {});
    } catch (error) {
      appendLog('error', 'Chat request failed', { message: error.message });
      throw error;
    }
  });

  ipcMain.handle('attachments:pick', () => pickAttachments());
  ipcMain.handle('chats:export', (_event, payload) => exportChats(payload));
  ipcMain.handle('chats:import', () => importChats());
  ipcMain.handle('logs:open-folder', () => openLogsFolder());
  ipcMain.handle('app:meta', () => ({
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    platform: process.platform,
    updateDownloaded: Boolean(updateDownloadedInfo)
  }));
  ipcMain.handle('app:check-updates', () => checkForUpdatesManually());
  ipcMain.handle('app:download-update', async () => {
    if (!app.isPackaged) return { ok: false, reason: 'App is not packaged.' };
    await autoUpdater.downloadUpdate();
    return { ok: true };
  });
  ipcMain.handle('app:install-update', () => {
    if (!updateDownloadedInfo) return { ok: false, reason: 'No downloaded update.' };
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  });
  ipcMain.handle('window:action', (event, action) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;
    if (action === 'minimize') window.minimize();
    if (action === 'toggle-maximize') window.isMaximized() ? window.unmaximize() : window.maximize();
    if (action === 'close') {
      if (process.platform === 'darwin') {
        window.close();
      } else {
        cleanupAndQuit();
      }
    }
    return true;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.whenReady().then(() => {
  readState();
  applyDesktopPreferences(readState());
  createSplashWindow();
  setupWebviewSecurity();
  createMainWindow();
  createTray();
  registerIpc();
  setupAutoUpdater();
  appendLog('info', 'App started', { version: app.getVersion(), packaged: app.isPackaged });

  if (app.isPackaged && readState().ui.autoUpdateEnabled) {
    setTimeout(() => {
      checkForUpdatesManually().catch((error) => {
        appendLog('error', 'Initial update check failed', { message: error.message });
      });
    }, 3500);
  }

  app.on('activate', () => {
    if (!mainWindow) createMainWindow();
    showMainWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;

  try {
    if (tray) {
      tray.destroy();
      tray = null;
    }
  } catch {
    // ignore tray cleanup issues
  }

  try {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.destroy();
    }
  } catch {
    // ignore splash cleanup issues
  }
  splashWindow = null;
});

app.on('will-quit', () => {
  clearIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupAndQuit();
  }
});

app.on('second-instance', () => {
  showMainWindow();
});
