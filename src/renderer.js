const appState = {
  profiles: [],
  activeProfileId: null,
  chats: [],
  openChatIds: [],
  activeChatId: null,
  ui: {
    sidebarCollapsed: false,
    theme: 'midnight',
    notificationsEnabled: true,
    autoLaunch: false,
    autoUpdateEnabled: true,
    loggingEnabled: true,
    rightPanelCollapsed: false,
    currentMode: 'api',
    wrapperUrl: 'https://chat.deepseek.com/',
    lastUpdateCheckAt: null
  }
};

const runtime = {
  modelsByProfile: {},
  selectedProfileEditorId: null,
  pendingAttachments: [],
  chatSearch: '',
  draftSaveTimer: null,
  currentStreaming: new Map(),
  isMaximized: false,
  updateStatus: 'idle',
  toastTimer: null,
  appMeta: null,
  wrapperInitialized: false
};

const el = {
  body: document.body,
  appShell: document.getElementById('appShell'),
  apiWorkspace: document.getElementById('apiWorkspace'),
  wrapperWorkspace: document.getElementById('wrapperWorkspace'),
  sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
  modeApiBtn: document.getElementById('modeApiBtn'),
  modeWrapperBtn: document.getElementById('modeWrapperBtn'),
  conversationList: document.getElementById('conversationList'),
  chatSearch: document.getElementById('chatSearch'),
  newChatBtn: document.getElementById('newChatBtn'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  importChatsBtn: document.getElementById('importChatsBtn'),
  checkUpdatesBtn: document.getElementById('checkUpdatesBtn'),
  openLogsBtn: document.getElementById('openLogsBtn'),
  tabsBar: document.getElementById('tabsBar'),
  offlineBanner: document.getElementById('offlineBanner'),
  toastBanner: document.getElementById('toastBanner'),
  chatTitleInput: document.getElementById('chatTitleInput'),
  activeProfileSelect: document.getElementById('activeProfileSelect'),
  chatModelSelect: document.getElementById('chatModelSelect'),
  refreshModelsBtn: document.getElementById('refreshModelsBtn'),
  exportCurrentBtn: document.getElementById('exportCurrentBtn'),
  messageList: document.getElementById('messageList'),
  attachmentStrip: document.getElementById('attachmentStrip'),
  composer: document.getElementById('composer'),
  attachBtn: document.getElementById('attachBtn'),
  starterBtn: document.getElementById('starterBtn'),
  draftInfo: document.getElementById('draftInfo'),
  saveChatBtn: document.getElementById('saveChatBtn'),
  sendBtn: document.getElementById('sendBtn'),
  rightPanel: document.getElementById('rightPanel'),
  rightPanelToggleBtn: document.getElementById('rightPanelToggleBtn'),
  systemPromptInput: document.getElementById('systemPromptInput'),
  thinkingSelect: document.getElementById('thinkingSelect'),
  responseFormatSelect: document.getElementById('responseFormatSelect'),
  temperatureInput: document.getElementById('temperatureInput'),
  maxTokensInput: document.getElementById('maxTokensInput'),
  streamToggle: document.getElementById('streamToggle'),
  profileSelect: document.getElementById('profileSelect'),
  newProfileBtn: document.getElementById('newProfileBtn'),
  profileNameInput: document.getElementById('profileNameInput'),
  profileBaseUrlInput: document.getElementById('profileBaseUrlInput'),
  profileApiKeyInput: document.getElementById('profileApiKeyInput'),
  profileApiKeyStatus: document.getElementById('profileApiKeyStatus'),
  profileDefaultModelInput: document.getElementById('profileDefaultModelInput'),
  profileThinkingSelect: document.getElementById('profileThinkingSelect'),
  profileFormatSelect: document.getElementById('profileFormatSelect'),
  profileTemperatureInput: document.getElementById('profileTemperatureInput'),
  profileMaxTokensInput: document.getElementById('profileMaxTokensInput'),
  profileStreamToggle: document.getElementById('profileStreamToggle'),
  profileSystemPromptInput: document.getElementById('profileSystemPromptInput'),
  saveProfileBtn: document.getElementById('saveProfileBtn'),
  deleteProfileBtn: document.getElementById('deleteProfileBtn'),
  themeSelect: document.getElementById('themeSelect'),
  notificationsToggle: document.getElementById('notificationsToggle'),
  autoLaunchToggle: document.getElementById('autoLaunchToggle'),
  autoUpdateToggle: document.getElementById('autoUpdateToggle'),
  loggingToggle: document.getElementById('loggingToggle'),
  downloadUpdateBtn: document.getElementById('downloadUpdateBtn'),
  installUpdateBtn: document.getElementById('installUpdateBtn'),
  metaBox: document.getElementById('metaBox'),
  onlinePill: document.getElementById('onlinePill'),
  updatePill: document.getElementById('updatePill'),
  minimizeBtn: document.getElementById('minimizeBtn'),
  maximizeBtn: document.getElementById('maximizeBtn'),
  closeBtn: document.getElementById('closeBtn'),
  wrapperWebview: document.getElementById('officialWrapperView'),
  wrapperStatus: document.getElementById('wrapperStatus'),
  wrapperHint: document.getElementById('wrapperHint'),
  wrapperReloadBtn: document.getElementById('wrapperReloadBtn'),
  wrapperHomeBtn: document.getElementById('wrapperHomeBtn'),
  wrapperOpenExternalBtn: document.getElementById('wrapperOpenExternalBtn')
};

const starterPrompt = 'Structure the task, surface the constraints, and produce a clean execution plan with concise next actions.';

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value || '';
  }
}

function showToast(message, isError = false) {
  clearTimeout(runtime.toastTimer);
  el.toastBanner.textContent = message;
  el.toastBanner.classList.remove('hidden');
  el.toastBanner.style.borderColor = isError ? 'rgba(255,95,125,.34)' : '';
  runtime.toastTimer = setTimeout(() => {
    el.toastBanner.classList.add('hidden');
    el.toastBanner.style.borderColor = '';
  }, 3200);
}

function activeChat() {
  return appState.chats.find((chat) => chat.id === appState.activeChatId) || appState.chats[0] || null;
}

function activeProfile() {
  return appState.profiles.find((profile) => profile.id === appState.activeProfileId) || appState.profiles[0] || null;
}

function editorProfile() {
  return appState.profiles.find((profile) => profile.id === runtime.selectedProfileEditorId) || appState.profiles[0] || null;
}

function ensureOpenChat(chatId) {
  if (!appState.openChatIds.includes(chatId)) {
    appState.openChatIds = [...appState.openChatIds, chatId].slice(-8);
  }
  appState.activeChatId = chatId;
}

function buildProfileDefaults(profile) {
  return {
    model: profile?.defaultModel || 'deepseek-chat',
    thinkingType: profile?.thinkingType || 'auto',
    responseFormat: profile?.responseFormat || 'text',
    temperature: profile?.temperature ?? 0.7,
    maxTokens: profile?.maxTokens ?? 4096,
    stream: profile?.stream !== false,
    systemPrompt: profile?.systemPrompt || ''
  };
}

function createChat(profileId) {
  const profile = appState.profiles.find((item) => item.id === profileId) || activeProfile();
  const defaults = buildProfileDefaults(profile);
  const now = new Date().toISOString();
  return {
    id: uid('chat'),
    title: 'New conversation',
    profileId: profile?.id || appState.activeProfileId,
    model: defaults.model,
    thinkingType: defaults.thinkingType,
    responseFormat: defaults.responseFormat,
    temperature: defaults.temperature,
    maxTokens: defaults.maxTokens,
    stream: defaults.stream,
    systemPrompt: defaults.systemPrompt,
    draft: '',
    messages: [],
    createdAt: now,
    updatedAt: now
  };
}

function markUpdated(chat) {
  chat.updatedAt = new Date().toISOString();
}

function serializeStateForSave() {
  return {
    profiles: appState.profiles,
    activeProfileId: appState.activeProfileId,
    chats: appState.chats,
    openChatIds: appState.openChatIds,
    activeChatId: appState.activeChatId,
    ui: appState.ui
  };
}

async function persistState(showSaved = false) {
  const saved = await window.desktopAPI.saveState(serializeStateForSave());
  hydrate(saved);
  if (showSaved) showToast('State saved.');
}

function schedulePersist() {
  clearTimeout(runtime.draftSaveTimer);
  runtime.draftSaveTimer = setTimeout(() => {
    persistState(false).catch((error) => showToast(error.message || 'Save failed', true));
  }, 260);
}

function hydrate(state) {
  appState.profiles = Array.isArray(state.profiles) ? state.profiles : [];
  appState.activeProfileId = state.activeProfileId;
  appState.chats = Array.isArray(state.chats) ? state.chats : [];
  appState.openChatIds = Array.isArray(state.openChatIds) ? state.openChatIds : [];
  appState.activeChatId = state.activeChatId;
  appState.ui = { ...appState.ui, ...(state.ui || {}) };

  if (!appState.profiles.length) {
    const profile = {
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
      hasApiKey: false
    };
    appState.profiles.push(profile);
    appState.activeProfileId = profile.id;
  }

  if (!appState.chats.length) {
    const chat = createChat(appState.activeProfileId);
    appState.chats.push(chat);
    appState.activeChatId = chat.id;
    appState.openChatIds = [chat.id];
  }

  if (!appState.openChatIds.includes(appState.activeChatId)) {
    appState.openChatIds = [...appState.openChatIds, appState.activeChatId].slice(-8);
  }

  runtime.selectedProfileEditorId = runtime.selectedProfileEditorId && appState.profiles.some((profile) => profile.id === runtime.selectedProfileEditorId)
    ? runtime.selectedProfileEditorId
    : appState.activeProfileId;

  appState.ui.currentMode = ['api', 'wrapper'].includes(appState.ui.currentMode) ? appState.ui.currentMode : 'api';
  appState.ui.wrapperUrl = typeof appState.ui.wrapperUrl === 'string' && appState.ui.wrapperUrl.startsWith('https://')
    ? appState.ui.wrapperUrl
    : 'https://chat.deepseek.com/';

  renderAll();
}

function renderAll() {
  el.body.dataset.theme = appState.ui.theme;
  el.appShell.classList.toggle('sidebar-collapsed', appState.ui.sidebarCollapsed);
  el.apiWorkspace.classList.toggle('collapsed-right', appState.ui.rightPanelCollapsed);
  renderMode();
  renderConversations();
  renderTabs();
  renderProfiles();
  renderActiveChat();
  renderDesktopSettings();
  renderMeta();
  renderOnlineState();
}

function renderMode() {
  const wrapperMode = appState.ui.currentMode === 'wrapper';
  el.modeApiBtn.classList.toggle('active', !wrapperMode);
  el.modeWrapperBtn.classList.toggle('active', wrapperMode);
  el.apiWorkspace.classList.toggle('hidden', wrapperMode);
  el.wrapperWorkspace.classList.toggle('hidden', !wrapperMode);
  if (wrapperMode) {
    initializeWrapper();
  }
}

function updateWrapperStatus(label, detail = '') {
  el.wrapperStatus.textContent = label;
  if (detail) {
    el.wrapperHint.textContent = detail;
  }
}

function initializeWrapper() {
  if (runtime.wrapperInitialized || !el.wrapperWebview) return;
  runtime.wrapperInitialized = true;

  if (!el.wrapperWebview.src) {
    el.wrapperWebview.src = appState.ui.wrapperUrl || 'https://chat.deepseek.com/';
  }

  el.wrapperWebview.addEventListener('did-start-loading', () => {
    updateWrapperStatus('Loading', 'DeepSeek official is loading in an isolated session.');
  });

  el.wrapperWebview.addEventListener('did-stop-loading', () => {
    updateWrapperStatus('Ready', 'Official DeepSeek is loaded. The wrapper session stays separate from your API profiles.');
  });

  el.wrapperWebview.addEventListener('did-fail-load', (event) => {
    updateWrapperStatus('Load error', event.errorDescription || 'The official wrapper failed to load.');
  });

  el.wrapperWebview.addEventListener('page-title-updated', (event) => {
    if (event.title) {
      updateWrapperStatus('Ready', event.title);
    }
  });

  const syncUrl = (url) => {
    if (url && url.startsWith('https://')) {
      appState.ui.wrapperUrl = url;
      schedulePersist();
    }
  };

  el.wrapperWebview.addEventListener('did-navigate', (event) => syncUrl(event.url));
  el.wrapperWebview.addEventListener('did-navigate-in-page', (event) => syncUrl(event.url));
}

function renderConversations() {
  const query = runtime.chatSearch.trim().toLowerCase();
  const filtered = appState.chats
    .filter((chat) => {
      if (!query) return true;
      const haystack = `${chat.title} ${chat.messages.map((msg) => msg.content).join(' ')}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  el.conversationList.innerHTML = filtered.map((chat) => {
    const last = chat.messages[chat.messages.length - 1];
    const preview = last?.content?.slice(0, 80) || 'Empty';
    return `
      <button class="conversation-card ${chat.id === appState.activeChatId ? 'active' : ''}" data-chat-id="${chat.id}">
        <strong>${escapeHtml(chat.title)}</strong>
        <small>${escapeHtml(preview)}</small>
        <div class="meta">
          <span>${escapeHtml(chat.model)}</span>
          <span>${escapeHtml(formatDate(chat.updatedAt))}</span>
        </div>
      </button>
    `;
  }).join('') || '<div class="empty-state">No conversation matches your search.</div>';
}

function renderTabs() {
  const tabs = appState.openChatIds
    .map((id) => appState.chats.find((chat) => chat.id === id))
    .filter(Boolean);

  el.tabsBar.innerHTML = tabs.map((chat) => `
    <div class="tab ${chat.id === appState.activeChatId ? 'active' : ''}" data-tab-id="${chat.id}" role="button" tabindex="0">
      <span>${escapeHtml(chat.title)}</span>
      <button class="tab-close" data-close-tab="${chat.id}">×</button>
    </div>
  `).join('');
}

function modelsForChat(chat) {
  const profileModels = runtime.modelsByProfile[chat.profileId] || [];
  const merged = [...new Set(['deepseek-chat', 'deepseek-reasoner', chat.model, ...profileModels.map((item) => item.id || item)])].filter(Boolean);
  return merged;
}

function renderMessage(message, chat) {
  const canRetry = (message.status === 'pending' || message.status === 'error') && message.role === 'user' && chat.messages[chat.messages.length - 1]?.id === message.id;
  return `
    <article class="message ${message.role} ${message.status === 'error' ? 'error' : ''} ${message.status === 'pending' ? 'pending' : ''}">
      <div class="topline">
        <span>${escapeHtml(message.role)}${message.status !== 'sent' ? ` • ${escapeHtml(message.status)}` : ''}</span>
        <span>${escapeHtml(formatDate(message.createdAt))}</span>
      </div>
      <div class="content">${escapeHtml(message.content || '')}</div>
      ${message.reasoningContent ? `<div class="reasoning">${escapeHtml(message.reasoningContent)}</div>` : ''}
      ${message.attachments?.length ? `<div class="attachment-list">${message.attachments.map((att) => `<span class="attachment-chip">${escapeHtml(att.name)}</span>`).join('')}</div>` : ''}
      ${message.error ? `<small>${escapeHtml(message.error)}</small>` : ''}
      ${canRetry ? `<div><button class="ghost small" data-retry-id="${message.id}">Retry send</button></div>` : ''}
    </article>
  `;
}

function renderActiveChat() {
  const chat = activeChat();
  if (!chat) return;

  el.chatTitleInput.value = chat.title;
  el.composer.value = chat.draft || '';
  el.systemPromptInput.value = chat.systemPrompt || '';
  el.thinkingSelect.value = chat.thinkingType || 'auto';
  el.responseFormatSelect.value = chat.responseFormat || 'text';
  el.temperatureInput.value = String(chat.temperature ?? 0.7);
  el.maxTokensInput.value = String(chat.maxTokens ?? 4096);
  el.streamToggle.checked = chat.stream !== false;

  el.activeProfileSelect.innerHTML = appState.profiles.map((profile) => `
    <option value="${profile.id}" ${profile.id === chat.profileId ? 'selected' : ''}>${escapeHtml(profile.name)}</option>
  `).join('');

  const modelOptions = modelsForChat(chat);
  el.chatModelSelect.innerHTML = modelOptions.map((model) => `
    <option value="${escapeHtml(model)}" ${model === chat.model ? 'selected' : ''}>${escapeHtml(model)}</option>
  `).join('');

  el.messageList.innerHTML = chat.messages.length
    ? chat.messages.map((message) => renderMessage(message, chat)).join('')
    : '<div class="empty-state">No messages yet. Local history, imports, and attachments are ready.</div>';
  el.messageList.scrollTop = el.messageList.scrollHeight;

  renderPendingAttachments();
  el.draftInfo.textContent = chat.updatedAt ? `Local state updated ${formatDate(chat.updatedAt)}` : 'Draft saved locally';
}

function renderPendingAttachments() {
  el.attachmentStrip.innerHTML = runtime.pendingAttachments.map((attachment) => `
    <span class="attachment-chip">${escapeHtml(attachment.name)} <button class="tab-close" data-remove-attachment="${attachment.id}">×</button></span>
  `).join('');
}

function renderProfiles() {
  const selectedProfile = editorProfile();
  el.profileSelect.innerHTML = appState.profiles.map((profile) => `
    <option value="${profile.id}" ${profile.id === selectedProfile?.id ? 'selected' : ''}>${escapeHtml(profile.name)}</option>
  `).join('');

  if (!selectedProfile) return;
  el.profileNameInput.value = selectedProfile.name || '';
  el.profileBaseUrlInput.value = selectedProfile.baseUrl || 'https://api.deepseek.com';
  el.profileApiKeyInput.value = '';
  el.profileApiKeyStatus.textContent = selectedProfile.hasApiKey ? 'Stored key present. Leave blank to keep it.' : 'No key stored.';
  el.profileDefaultModelInput.value = selectedProfile.defaultModel || 'deepseek-chat';
  el.profileThinkingSelect.value = selectedProfile.thinkingType || 'auto';
  el.profileFormatSelect.value = selectedProfile.responseFormat || 'text';
  el.profileTemperatureInput.value = String(selectedProfile.temperature ?? 0.7);
  el.profileMaxTokensInput.value = String(selectedProfile.maxTokens ?? 4096);
  el.profileStreamToggle.checked = selectedProfile.stream !== false;
  el.profileSystemPromptInput.value = selectedProfile.systemPrompt || '';
}

function renderDesktopSettings() {
  el.themeSelect.value = appState.ui.theme;
  el.notificationsToggle.checked = appState.ui.notificationsEnabled;
  el.autoLaunchToggle.checked = appState.ui.autoLaunch;
  el.autoUpdateToggle.checked = appState.ui.autoUpdateEnabled;
  el.loggingToggle.checked = appState.ui.loggingEnabled;
}

function renderMeta() {
  const lines = [];
  if (runtime.appMeta) {
    lines.push(`Version: ${runtime.appMeta.version}`);
    lines.push(`Packaged: ${runtime.appMeta.isPackaged ? 'yes' : 'no'}`);
    lines.push(`Platform: ${runtime.appMeta.platform}`);
  }
  if (appState.ui.lastUpdateCheckAt) {
    lines.push(`Last update check: ${formatDate(appState.ui.lastUpdateCheckAt)}`);
  }
  lines.push(`Profiles: ${appState.profiles.length}`);
  lines.push(`Chats: ${appState.chats.length}`);
  el.metaBox.textContent = lines.join('\n');
}

function renderOnlineState() {
  const online = navigator.onLine;
  el.onlinePill.textContent = online ? 'Online' : 'Offline';
  el.onlinePill.className = `pill ${online ? 'online' : 'warning'}`;
  el.offlineBanner.classList.toggle('hidden', online);
  el.updatePill.textContent = runtime.updateStatus;
  el.updatePill.className = `pill ${runtime.updateStatus === 'error' ? 'error' : runtime.updateStatus === 'available' || runtime.updateStatus === 'downloaded' ? 'online' : ''}`;
  el.maximizeBtn.textContent = runtime.isMaximized ? '❐' : '▢';
}

function saveChatEditorState() {
  const chat = activeChat();
  if (!chat) return;
  chat.title = el.chatTitleInput.value.trim() || 'Untitled conversation';
  chat.draft = el.composer.value.slice(0, 12000);
  chat.systemPrompt = el.systemPromptInput.value.slice(0, 16000);
  chat.thinkingType = el.thinkingSelect.value;
  chat.responseFormat = el.responseFormatSelect.value;
  chat.temperature = clamp(el.temperatureInput.value, 0, 2, 0.7);
  chat.maxTokens = Math.floor(clamp(el.maxTokensInput.value, 256, 64000, 4096));
  chat.stream = el.streamToggle.checked;
  chat.model = el.chatModelSelect.value || chat.model;
  chat.profileId = el.activeProfileSelect.value || chat.profileId;
  markUpdated(chat);
  schedulePersist();
  renderConversations();
  renderTabs();
}

function applyProfileDefaultsToChat(chat, profile) {
  if (!profile || !chat) return;
  chat.model = profile.defaultModel || chat.model;
  chat.thinkingType = profile.thinkingType || chat.thinkingType;
  chat.responseFormat = profile.responseFormat || chat.responseFormat;
  chat.temperature = profile.temperature ?? chat.temperature;
  chat.maxTokens = profile.maxTokens ?? chat.maxTokens;
  chat.stream = profile.stream !== false;
  if (!chat.systemPrompt) {
    chat.systemPrompt = profile.systemPrompt || '';
  }
  markUpdated(chat);
}

async function createNewChat() {
  const chat = createChat(appState.activeProfileId);
  appState.chats.unshift(chat);
  ensureOpenChat(chat.id);
  runtime.pendingAttachments = [];
  await persistState(true);
}

async function saveProfileFromForm() {
  const current = editorProfile();
  if (!current) return;
  current.name = el.profileNameInput.value.trim() || 'Profile';
  current.baseUrl = el.profileBaseUrlInput.value.trim() || 'https://api.deepseek.com';
  current.defaultModel = el.profileDefaultModelInput.value.trim() || 'deepseek-chat';
  current.thinkingType = el.profileThinkingSelect.value;
  current.responseFormat = el.profileFormatSelect.value;
  current.temperature = clamp(el.profileTemperatureInput.value, 0, 2, 0.7);
  current.maxTokens = Math.floor(clamp(el.profileMaxTokensInput.value, 256, 64000, 4096));
  current.stream = el.profileStreamToggle.checked;
  current.systemPrompt = el.profileSystemPromptInput.value.slice(0, 16000);
  current.apiKeyInput = el.profileApiKeyInput.value.trim();
  current.clearApiKey = false;
  appState.activeProfileId = current.id;

  const chat = activeChat();
  if (chat && chat.profileId === current.id) {
    applyProfileDefaultsToChat(chat, current);
  }

  await persistState(true);
  delete current.apiKeyInput;
  delete current.clearApiKey;
}

async function deleteEditorProfile() {
  if (appState.profiles.length === 1) {
    showToast('At least one profile is required.', true);
    return;
  }
  const id = runtime.selectedProfileEditorId;
  appState.profiles = appState.profiles.filter((profile) => profile.id !== id);
  const fallback = appState.profiles[0];
  appState.activeProfileId = fallback.id;
  appState.chats.forEach((chat) => {
    if (chat.profileId === id) {
      chat.profileId = fallback.id;
      applyProfileDefaultsToChat(chat, fallback);
    }
  });
  runtime.selectedProfileEditorId = fallback.id;
  await persistState(true);
}

function buildRequestMessages(chat, targetUserMessageId = null) {
  const messages = [];
  if (chat.systemPrompt) {
    messages.push({ role: 'system', content: chat.systemPrompt, status: 'sent' });
  }
  for (const message of chat.messages) {
    if (message.role === 'assistant') {
      messages.push({ role: 'assistant', content: message.content, status: 'sent' });
    } else if (message.role === 'user') {
      const status = message.id === targetUserMessageId ? 'sent' : message.status;
      if (status === 'error' || status === 'pending') continue;
      messages.push({ role: 'user', content: message.content, attachments: message.attachments || [], status: 'sent' });
    }
    if (targetUserMessageId && message.id === targetUserMessageId) break;
  }
  return messages;
}

async function sendMessage(retryMessageId = null) {
  const chat = activeChat();
  const profile = appState.profiles.find((item) => item.id === chat.profileId) || activeProfile();
  if (!profile?.hasApiKey) {
    showToast('Store an API key in the selected profile first.', true);
    return;
  }

  let userMessage;
  if (retryMessageId) {
    userMessage = chat.messages.find((message) => message.id === retryMessageId);
    if (!userMessage) return;
    userMessage.status = 'sent';
    userMessage.error = '';
  } else {
    const content = el.composer.value.trim();
    if (!content) return;
    userMessage = {
      id: uid('msg'),
      role: 'user',
      content: content.slice(0, 40000),
      reasoningContent: '',
      status: 'sent',
      error: '',
      createdAt: new Date().toISOString(),
      attachments: runtime.pendingAttachments
    };
    chat.messages.push(userMessage);
    chat.draft = '';
    runtime.pendingAttachments = [];
    el.composer.value = '';
  }

  updateChatTitleFromMessages(chat);
  markUpdated(chat);
  renderActiveChat();
  renderConversations();
  schedulePersist();

  if (!navigator.onLine) {
    userMessage.status = 'pending';
    userMessage.error = 'Offline';
    markUpdated(chat);
    renderActiveChat();
    schedulePersist();
    showToast('Offline. Message stored locally as pending.', true);
    return;
  }

  const requestId = uid('req');
  const assistantMessage = {
    id: uid('msg'),
    role: 'assistant',
    content: '',
    reasoningContent: '',
    status: chat.stream ? 'streaming' : 'sent',
    error: '',
    createdAt: new Date().toISOString(),
    attachments: []
  };

  if (chat.stream) {
    chat.messages.push(assistantMessage);
    runtime.currentStreaming.set(requestId, { chatId: chat.id, messageId: assistantMessage.id });
    renderActiveChat();
  }

  try {
    el.sendBtn.disabled = true;
    const result = await window.desktopAPI.sendChat({
      requestId,
      profileId: chat.profileId,
      model: chat.model,
      thinkingType: chat.thinkingType,
      responseFormat: chat.responseFormat,
      maxTokens: chat.maxTokens,
      temperature: chat.temperature,
      stream: chat.stream,
      messages: buildRequestMessages(chat, userMessage.id)
    });

    if (chat.stream) {
      const target = chat.messages.find((message) => message.id === assistantMessage.id);
      if (target) {
        target.content = result.message?.content || target.content;
        target.reasoningContent = result.message?.reasoningContent || target.reasoningContent;
        target.status = 'sent';
      }
    } else {
      chat.messages.push({
        id: uid('msg'),
        role: result.message?.role || 'assistant',
        content: result.message?.content || '',
        reasoningContent: result.message?.reasoningContent || '',
        status: 'sent',
        error: '',
        createdAt: new Date().toISOString(),
        attachments: []
      });
    }

    markUpdated(chat);
    renderActiveChat();
    renderConversations();
    schedulePersist();
    showToast(result.usage ? `Reply received • total tokens ${result.usage.total_tokens ?? '-'}` : 'Reply received.');
  } catch (error) {
    if (chat.stream) {
      chat.messages = chat.messages.filter((message) => message.id !== assistantMessage.id);
    }
    userMessage.status = 'error';
    userMessage.error = error.message || 'Request failed';
    markUpdated(chat);
    renderActiveChat();
    schedulePersist();
    showToast(error.message || 'Send failed.', true);
  } finally {
    runtime.currentStreaming.delete(requestId);
    el.sendBtn.disabled = false;
  }
}

async function refreshModels() {
  const chat = activeChat();
  if (!chat) return;
  const result = await window.desktopAPI.listModels({ profileId: chat.profileId });
  if (!result.ok) {
    showToast(result.message || 'Model refresh failed', true);
    return;
  }
  runtime.modelsByProfile[chat.profileId] = result.models;
  renderActiveChat();
  showToast('Model list refreshed.');
}

async function exportCurrentChat() {
  const chat = activeChat();
  if (!chat) return;
  const result = await window.desktopAPI.exportChats({ chats: [chat] });
  if (!result.canceled) showToast('Conversation exported.');
}

async function exportAllChats() {
  const result = await window.desktopAPI.exportChats({ chats: appState.chats });
  if (!result.canceled) showToast('All conversations exported.');
}

async function importChats() {
  const result = await window.desktopAPI.importChats();
  if (result.canceled) return;
  appState.chats = [...result.chats, ...appState.chats];
  if (result.chats[0]) ensureOpenChat(result.chats[0].id);
  await persistState(true);
}

function wireMessageActions(event) {
  const retryButton = event.target.closest('[data-retry-id]');
  if (retryButton) {
    sendMessage(retryButton.dataset.retryId);
    return;
  }
  const removeAttachment = event.target.closest('[data-remove-attachment]');
  if (removeAttachment) {
    runtime.pendingAttachments = runtime.pendingAttachments.filter((att) => att.id !== removeAttachment.dataset.removeAttachment);
    renderPendingAttachments();
  }
}

function updateChatTitleFromMessages(chat) {
  if (chat.title && chat.title !== 'New conversation' && chat.title !== 'Untitled conversation') return;
  const firstUser = chat.messages.find((message) => message.role === 'user');
  if (firstUser) {
    chat.title = firstUser.content.slice(0, 48) || 'Conversation';
  }
}

function bindEvents() {
  el.sidebarToggleBtn.addEventListener('click', async () => {
    appState.ui.sidebarCollapsed = !appState.ui.sidebarCollapsed;
    await persistState();
  });

  el.modeApiBtn.addEventListener('click', async () => {
    appState.ui.currentMode = 'api';
    renderAll();
    await persistState();
  });

  el.modeWrapperBtn.addEventListener('click', async () => {
    appState.ui.currentMode = 'wrapper';
    initializeWrapper();
    renderAll();
    await persistState();
  });

  el.rightPanelToggleBtn.addEventListener('click', async () => {
    appState.ui.rightPanelCollapsed = !appState.ui.rightPanelCollapsed;
    await persistState();
  });

  el.chatSearch.addEventListener('input', (event) => {
    runtime.chatSearch = event.target.value;
    renderConversations();
  });

  el.newChatBtn.addEventListener('click', createNewChat);
  el.exportAllBtn.addEventListener('click', exportAllChats);
  el.importChatsBtn.addEventListener('click', importChats);
  el.checkUpdatesBtn.addEventListener('click', async () => {
    const result = await window.desktopAPI.checkUpdates();
    if (!result.ok) showToast(result.reason || 'Update check unavailable.', true);
  });
  el.openLogsBtn.addEventListener('click', () => window.desktopAPI.openLogsFolder());

  el.conversationList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-chat-id]');
    if (!button) return;
    ensureOpenChat(button.dataset.chatId);
    renderAll();
    schedulePersist();
  });

  el.tabsBar.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-close-tab]');
    if (closeButton) {
      event.stopPropagation();
      const chatId = closeButton.dataset.closeTab;
      appState.openChatIds = appState.openChatIds.filter((id) => id !== chatId);
      if (!appState.openChatIds.length) appState.openChatIds = [chatId];
      if (appState.activeChatId === chatId) {
        appState.activeChatId = appState.openChatIds[0] || appState.chats[0]?.id;
      }
      renderTabs();
      renderActiveChat();
      schedulePersist();
      return;
    }

    const tab = event.target.closest('[data-tab-id]');
    if (!tab) return;
    appState.activeChatId = tab.dataset.tabId;
    renderAll();
    schedulePersist();
  });

  el.chatTitleInput.addEventListener('input', saveChatEditorState);
  el.activeProfileSelect.addEventListener('change', () => {
    const chat = activeChat();
    const profile = appState.profiles.find((item) => item.id === el.activeProfileSelect.value);
    if (!chat || !profile) return;
    chat.profileId = profile.id;
    appState.activeProfileId = profile.id;
    applyProfileDefaultsToChat(chat, profile);
    renderAll();
    schedulePersist();
  });
  el.chatModelSelect.addEventListener('change', saveChatEditorState);
  el.refreshModelsBtn.addEventListener('click', refreshModels);
  el.exportCurrentBtn.addEventListener('click', exportCurrentChat);
  el.messageList.addEventListener('click', wireMessageActions);
  el.attachmentStrip.addEventListener('click', wireMessageActions);

  el.composer.addEventListener('input', () => {
    const chat = activeChat();
    if (!chat) return;
    chat.draft = el.composer.value.slice(0, 12000);
    markUpdated(chat);
    schedulePersist();
  });

  el.attachBtn.addEventListener('click', async () => {
    const attachments = await window.desktopAPI.pickAttachments();
    runtime.pendingAttachments = [...runtime.pendingAttachments, ...attachments].slice(0, 8);
    renderPendingAttachments();
  });

  el.starterBtn.addEventListener('click', () => {
    el.composer.value = starterPrompt;
    const chat = activeChat();
    if (chat) {
      chat.draft = starterPrompt;
      markUpdated(chat);
      schedulePersist();
    }
  });

  el.saveChatBtn.addEventListener('click', async () => {
    const chat = activeChat();
    if (!chat) return;
    updateChatTitleFromMessages(chat);
    await persistState(true);
  });
  el.sendBtn.addEventListener('click', () => sendMessage());

  el.systemPromptInput.addEventListener('input', saveChatEditorState);
  el.thinkingSelect.addEventListener('change', saveChatEditorState);
  el.responseFormatSelect.addEventListener('change', saveChatEditorState);
  el.temperatureInput.addEventListener('input', saveChatEditorState);
  el.maxTokensInput.addEventListener('input', saveChatEditorState);
  el.streamToggle.addEventListener('change', saveChatEditorState);

  el.profileSelect.addEventListener('change', () => {
    runtime.selectedProfileEditorId = el.profileSelect.value;
    renderProfiles();
  });
  el.newProfileBtn.addEventListener('click', () => {
    const profile = {
      id: uid('profile'),
      name: `Profile ${appState.profiles.length + 1}`,
      baseUrl: 'https://api.deepseek.com',
      defaultModel: 'deepseek-chat',
      thinkingType: 'auto',
      responseFormat: 'text',
      temperature: 0.7,
      maxTokens: 4096,
      stream: true,
      systemPrompt: '',
      hasApiKey: false
    };
    appState.profiles.push(profile);
    runtime.selectedProfileEditorId = profile.id;
    renderProfiles();
  });
  el.saveProfileBtn.addEventListener('click', saveProfileFromForm);
  el.deleteProfileBtn.addEventListener('click', deleteEditorProfile);

  el.themeSelect.addEventListener('change', async () => {
    appState.ui.theme = el.themeSelect.value;
    await persistState();
  });
  el.notificationsToggle.addEventListener('change', async () => {
    appState.ui.notificationsEnabled = el.notificationsToggle.checked;
    await persistState();
  });
  el.autoLaunchToggle.addEventListener('change', async () => {
    appState.ui.autoLaunch = el.autoLaunchToggle.checked;
    await persistState();
  });
  el.autoUpdateToggle.addEventListener('change', async () => {
    appState.ui.autoUpdateEnabled = el.autoUpdateToggle.checked;
    await persistState();
  });
  el.loggingToggle.addEventListener('change', async () => {
    appState.ui.loggingEnabled = el.loggingToggle.checked;
    await persistState();
  });
  el.wrapperHomeBtn.addEventListener('click', () => {
    appState.ui.wrapperUrl = 'https://chat.deepseek.com/';
    if (el.wrapperWebview) {
      el.wrapperWebview.loadURL(appState.ui.wrapperUrl);
    }
    schedulePersist();
  });
  el.wrapperReloadBtn.addEventListener('click', () => {
    if (el.wrapperWebview) el.wrapperWebview.reload();
  });
  el.wrapperOpenExternalBtn.addEventListener('click', () => {
    const targetUrl = appState.ui.wrapperUrl || 'https://chat.deepseek.com/';
    window.open(targetUrl, '_blank');
  });

  el.downloadUpdateBtn.addEventListener('click', async () => {
    const result = await window.desktopAPI.downloadUpdate();
    if (!result.ok) showToast(result.reason || 'Update download unavailable.', true);
  });
  el.installUpdateBtn.addEventListener('click', async () => {
    const result = await window.desktopAPI.installUpdate();
    if (!result.ok) showToast(result.reason || 'No downloaded update.', true);
  });

  el.minimizeBtn.addEventListener('click', () => window.desktopAPI.windowAction('minimize'));
  el.maximizeBtn.addEventListener('click', () => window.desktopAPI.windowAction('toggle-maximize'));
  el.closeBtn.addEventListener('click', () => window.desktopAPI.windowAction('close'));

  window.addEventListener('online', renderOnlineState);
  window.addEventListener('offline', renderOnlineState);
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      createNewChat();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      el.chatSearch.focus();
      el.chatSearch.select();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '1') {
      event.preventDefault();
      appState.ui.currentMode = 'api';
      renderAll();
      schedulePersist();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '2') {
      event.preventDefault();
      appState.ui.currentMode = 'wrapper';
      initializeWrapper();
      renderAll();
      schedulePersist();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === ',') {
      event.preventDefault();
      appState.ui.rightPanelCollapsed = false;
      renderAll();
      el.profileSelect.focus();
      schedulePersist();
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      exportCurrentChat();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
  });
}

function subscribeRuntimeEvents() {
  window.desktopAPI.onChatStream((payload) => {
    const target = runtime.currentStreaming.get(payload.requestId);
    if (!target) return;
    const chat = appState.chats.find((item) => item.id === target.chatId);
    const message = chat?.messages.find((item) => item.id === target.messageId);
    if (!chat || !message) return;
    message.content += payload.contentDelta || '';
    message.reasoningContent += payload.reasoningDelta || '';
    renderActiveChat();
  });

  window.desktopAPI.onAppEvent((payload) => {
    if (payload.type === 'window-maximized') {
      runtime.isMaximized = Boolean(payload.value);
      renderOnlineState();
    }
    if (payload.type === 'tray-new-chat') {
      createNewChat();
    }
    if (payload.type === 'update-status') {
      runtime.updateStatus = payload.status;
      renderOnlineState();
      if (payload.status === 'available') showToast(`Update ${payload.info?.version || ''} available.`);
      if (payload.status === 'downloaded') showToast('Update downloaded. Install when ready.');
      if (payload.status === 'error') showToast(payload.message || 'Update error.', true);
    }
    if (payload.type === 'update-progress') {
      runtime.updateStatus = `downloading ${Math.round(payload.progress?.percent || 0)}%`;
      renderOnlineState();
    }
  });
}

async function bootstrap() {
  bindEvents();
  subscribeRuntimeEvents();
  runtime.appMeta = await window.desktopAPI.getAppMeta();
  const state = await window.desktopAPI.getState();
  hydrate(state);
  if (appState.ui.currentMode === 'wrapper') {
    initializeWrapper();
  }
}

bootstrap().catch((error) => {
  showToast(error.message || 'Bootstrap failed', true);
});
