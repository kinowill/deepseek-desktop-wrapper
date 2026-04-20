const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

function subscribe(channel, handler) {
  const listener = (_event, payload) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('desktopAPI', Object.freeze({
  getState: () => invoke('state:get'),
  saveState: (payload) => invoke('state:save', payload),
  sendChat: (payload) => invoke('chat:send', payload),
  listModels: (payload) => invoke('profiles:list-models', payload),
  pickAttachments: () => invoke('attachments:pick'),
  exportChats: (payload) => invoke('chats:export', payload),
  importChats: () => invoke('chats:import'),
  openLogsFolder: () => invoke('logs:open-folder'),
  getAppMeta: () => invoke('app:meta'),
  checkUpdates: () => invoke('app:check-updates'),
  downloadUpdate: () => invoke('app:download-update'),
  installUpdate: () => invoke('app:install-update'),
  windowAction: (action) => invoke('window:action', action),
  onChatStream: (handler) => subscribe('chat:stream', handler),
  onAppEvent: (handler) => subscribe('app:event', handler)
}));
