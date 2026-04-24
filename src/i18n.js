// Minimal vanilla i18n layer. CSP-safe, no remote fetch, no bundler.
// Usage:
//   data-i18n="key"             -> replaces textContent
//   data-i18n-placeholder="key" -> sets placeholder attribute
//   data-i18n-title="key"       -> sets title attribute
//   data-i18n-aria-label="key"  -> sets aria-label attribute
//   window.i18n.t('key')        -> returns translated string
(function () {
  const LANGS = ['en', 'fr'];
  const DEFAULT_LANG = 'en';
  const STORAGE_FALLBACK_LANG = 'en';

  const dict = { en: {}, fr: {} };
  const listeners = new Set();
  let currentLang = DEFAULT_LANG;

  function resolveKey(lang, key) {
    const entry = dict[lang] && dict[lang][key];
    if (typeof entry === 'string') return entry;
    return null;
  }

  function t(key, fallback) {
    return (
      resolveKey(currentLang, key)
      || resolveKey(STORAGE_FALLBACK_LANG, key)
      || fallback
      || key
    );
  }

  function registerDictionary(lang, entries) {
    if (!dict[lang]) dict[lang] = {};
    Object.assign(dict[lang], entries);
  }

  function applyTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      el.setAttribute('placeholder', t(key));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (!key) return;
      el.setAttribute('title', t(key));
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      el.setAttribute('aria-label', t(key));
    });
  }

  function setLanguage(lang, options = {}) {
    const next = LANGS.includes(lang) ? lang : DEFAULT_LANG;
    if (next === currentLang && !options.force) return;
    currentLang = next;
    document.documentElement.setAttribute('lang', currentLang);
    applyTranslations();
    listeners.forEach((fn) => {
      try { fn(currentLang); } catch (err) { /* listener errors never break i18n */ }
    });
  }

  function getLanguage() {
    return currentLang;
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  window.i18n = {
    t,
    setLanguage,
    getLanguage,
    applyTranslations,
    registerDictionary,
    onChange,
    LANGS,
    DEFAULT_LANG
  };
})();

// Dictionary registration. Keys are grouped by UI area.
// Adding a key: add it to BOTH `en` and `fr`. English is the source of truth.
(function () {
  const en = {
    // Titlebar
    'titlebar.toggleSidebar': 'Toggle sidebar',
    'titlebar.appName': 'DeepSeek Desktop',
    'titlebar.appTagline': 'Official wrapper + API workspace',
    'titlebar.modeApi': 'API',
    'titlebar.modeWrapper': 'Official',
    'titlebar.modeAriaLabel': 'Mode',
    'titlebar.online': 'Online',
    'titlebar.offline': 'Offline',
    'titlebar.updateIdle': 'Idle',
    'titlebar.updateChecking': 'Checking',
    'titlebar.updateAvailable': 'Available',
    'titlebar.updateDownloaded': 'Downloaded',
    'titlebar.updateError': 'Error',
    'titlebar.language': 'Language',
    'titlebar.languageEnglish': 'English',
    'titlebar.languageFrench': 'Français',
    'titlebar.preferences': 'Preferences',
    'titlebar.minimize': 'Minimize',
    'titlebar.maximize': 'Maximize',
    'titlebar.close': 'Close',

    // Sidebar
    'sidebar.newChat': 'New conversation',
    'sidebar.searchPlaceholder': 'Search',
    'sidebar.modesTitle': 'Modes',
    'sidebar.modesOfficialLabel': 'Official',
    'sidebar.modesOfficialBody': ' keeps the DeepSeek web session isolated.',
    'sidebar.modesApiLabel': 'API',
    'sidebar.modesApiBody': ' uses your profiles, keys and local conversations.',
    'sidebar.conversationsTitle': 'Conversations',
    'sidebar.deleteAll': 'Delete all',
    'sidebar.quickActions': 'Quick actions',
    'sidebar.exportAll': 'Export all',
    'sidebar.importChats': 'Import chats',
    'sidebar.checkUpdates': 'Check for updates',
    'sidebar.openLogs': 'Logs folder',

    // Banners
    'banners.apiKeyMissing': 'No DeepSeek API key configured. Add one to send messages.',
    'banners.apiKeyConfigure': 'Configure',
    'banners.offline': 'Offline mode. Conversations are available locally. Failed sends stay pending.',
    'banners.legacyModelLead': 'This model is a legacy alias that will be ',
    'banners.legacyModelDate': 'deprecated on July 24, 2026',
    'banners.legacyModelMid': '. It already routes to ',
    'banners.legacyModelSuffix': '. Consider switching to ',
    'banners.legacyModelOr': ' or ',
    'banners.legacyModelDismiss': "Don't show again",

    // Chat workspace
    'chat.eyebrow': 'API conversation',
    'chat.titlePlaceholder': 'Conversation title',
    'chat.refreshModels': 'Reload models',
    'chat.export': 'Export',
    'chat.composerPlaceholder': 'Write a message. Ctrl+Enter to send.',
    'chat.attachments': 'Attachments',
    'chat.starter': 'Starter prompt',
    'chat.draftSaved': 'Draft saved',
    'chat.save': 'Save',
    'chat.send': 'Send',

    // Right panel settings
    'settings.eyebrow': 'Control center',
    'settings.title': 'Settings',
    'settings.collapse': 'Collapse',
    'settings.chatTitle': 'Chat',
    'settings.systemPrompt': 'System prompt',
    'settings.systemPromptPlaceholder': 'Per-chat system prompt',
    'settings.thinking': 'Thinking',
    'settings.thinkingAuto': 'Auto',
    'settings.thinkingEnabled': 'Enabled',
    'settings.thinkingDisabled': 'Disabled',
    'settings.responseFormat': 'Response format',
    'settings.formatText': 'Text',
    'settings.formatJson': 'JSON',
    'settings.temperature': 'Temperature',
    'settings.maxTokens': 'Max tokens',
    'settings.streaming': 'Stream responses',
    'settings.profilesTitle': 'Profiles',
    'settings.newProfile': 'New',
    'settings.profile': 'Profile',
    'settings.profileName': 'Name',
    'settings.profileNamePlaceholder': 'Profile name',
    'settings.baseUrl': 'Base URL',
    'settings.apiKey': 'API key',
    'settings.apiKeyPlaceholder': 'Leave empty to keep the existing key',
    'settings.apiKeyNone': 'No key saved.',
    'settings.defaultModel': 'Default model',
    'settings.defaultThinking': 'Default thinking',
    'settings.defaultFormat': 'Default format',
    'settings.defaultTemperature': 'Default temperature',
    'settings.defaultMaxTokens': 'Default max tokens',
    'settings.defaultStream': 'Stream by default',
    'settings.defaultSystemPrompt': 'Default system prompt',
    'settings.save': 'Save',
    'settings.delete': 'Delete',

    // Wrapper workspace
    'wrapper.eyebrow': 'Official DeepSeek',
    'wrapper.title': 'Wrapper mode',
    'wrapper.statusIdle': 'Idle',
    'wrapper.hint': 'Use the official DeepSeek web product in an isolated session. Your API profiles stay separate.',
    'wrapper.home': 'Home',
    'wrapper.reload': 'Reload',
    'wrapper.openExternal': 'Open in browser'
  };

  const fr = {
    // Titlebar
    'titlebar.toggleSidebar': 'Basculer la barre latérale',
    'titlebar.appName': 'DeepSeek Desktop',
    'titlebar.appTagline': 'Wrapper officiel + workspace API',
    'titlebar.modeApi': 'API',
    'titlebar.modeWrapper': 'Officiel',
    'titlebar.modeAriaLabel': 'Mode',
    'titlebar.online': 'En ligne',
    'titlebar.offline': 'Hors ligne',
    'titlebar.updateIdle': 'Inactif',
    'titlebar.updateChecking': 'Vérification',
    'titlebar.updateAvailable': 'Disponible',
    'titlebar.updateDownloaded': 'Téléchargée',
    'titlebar.updateError': 'Erreur',
    'titlebar.language': 'Langue',
    'titlebar.languageEnglish': 'English',
    'titlebar.languageFrench': 'Français',
    'titlebar.preferences': 'Préférences',
    'titlebar.minimize': 'Réduire',
    'titlebar.maximize': 'Agrandir',
    'titlebar.close': 'Fermer',

    // Sidebar
    'sidebar.newChat': 'Nouvelle conversation',
    'sidebar.searchPlaceholder': 'Rechercher',
    'sidebar.modesTitle': 'Modes',
    'sidebar.modesOfficialLabel': 'Officiel',
    'sidebar.modesOfficialBody': ' garde la session web DeepSeek isolée.',
    'sidebar.modesApiLabel': 'API',
    'sidebar.modesApiBody': ' utilise vos profils, clés et conversations locales.',
    'sidebar.conversationsTitle': 'Conversations',
    'sidebar.deleteAll': 'Tout supprimer',
    'sidebar.quickActions': 'Actions rapides',
    'sidebar.exportAll': 'Exporter tout',
    'sidebar.importChats': 'Importer des chats',
    'sidebar.checkUpdates': 'Mises à jour',
    'sidebar.openLogs': 'Dossier logs',

    // Banners
    'banners.apiKeyMissing': 'Aucune clé API DeepSeek configurée. Ajoutez-la pour envoyer des messages.',
    'banners.apiKeyConfigure': 'Configurer',
    'banners.offline': 'Mode hors-ligne. Conversations disponibles localement. Les envois échoués restent en attente.',
    'banners.legacyModelLead': 'Ce modèle est un alias legacy qui sera ',
    'banners.legacyModelDate': 'déprécié le 24 juillet 2026',
    'banners.legacyModelMid': '. Il route déjà vers ',
    'banners.legacyModelSuffix': '. Pensez à passer à ',
    'banners.legacyModelOr': ' ou ',
    'banners.legacyModelDismiss': 'Ne plus afficher',

    // Chat workspace
    'chat.eyebrow': 'Conversation API',
    'chat.titlePlaceholder': 'Titre de la conversation',
    'chat.refreshModels': 'Recharger les modèles',
    'chat.export': 'Exporter',
    'chat.composerPlaceholder': 'Écrivez un message. Ctrl+Enter pour envoyer.',
    'chat.attachments': 'Pièces jointes',
    'chat.starter': 'Prompt de départ',
    'chat.draftSaved': 'Brouillon enregistré',
    'chat.save': 'Enregistrer',
    'chat.send': 'Envoyer',

    // Right panel settings
    'settings.eyebrow': 'Centre de contrôle',
    'settings.title': 'Réglages',
    'settings.collapse': 'Réduire',
    'settings.chatTitle': 'Chat',
    'settings.systemPrompt': 'System prompt',
    'settings.systemPromptPlaceholder': 'System prompt par chat',
    'settings.thinking': 'Thinking',
    'settings.thinkingAuto': 'Auto',
    'settings.thinkingEnabled': 'Activé',
    'settings.thinkingDisabled': 'Désactivé',
    'settings.responseFormat': 'Format réponse',
    'settings.formatText': 'Texte',
    'settings.formatJson': 'JSON',
    'settings.temperature': 'Température',
    'settings.maxTokens': 'Max tokens',
    'settings.streaming': 'Réponses en streaming',
    'settings.profilesTitle': 'Profils',
    'settings.newProfile': 'Nouveau',
    'settings.profile': 'Profil',
    'settings.profileName': 'Nom',
    'settings.profileNamePlaceholder': 'Nom du profil',
    'settings.baseUrl': 'Base URL',
    'settings.apiKey': 'Clé API',
    'settings.apiKeyPlaceholder': 'Vide pour conserver la clé existante',
    'settings.apiKeyNone': 'Aucune clé enregistrée.',
    'settings.defaultModel': 'Modèle par défaut',
    'settings.defaultThinking': 'Thinking défaut',
    'settings.defaultFormat': 'Format défaut',
    'settings.defaultTemperature': 'Température défaut',
    'settings.defaultMaxTokens': 'Max tokens défaut',
    'settings.defaultStream': 'Stream par défaut',
    'settings.defaultSystemPrompt': 'System prompt par défaut',
    'settings.save': 'Enregistrer',
    'settings.delete': 'Supprimer',

    // Wrapper workspace
    'wrapper.eyebrow': 'Officiel DeepSeek',
    'wrapper.title': 'Mode wrapper',
    'wrapper.statusIdle': 'Inactif',
    'wrapper.hint': 'Utilisez le produit web officiel DeepSeek dans une session isolée. Vos profils API restent séparés.',
    'wrapper.home': 'Accueil',
    'wrapper.reload': 'Recharger',
    'wrapper.openExternal': 'Ouvrir dans le navigateur'
  };

  Object.assign(en, {
    'titlebar.updateDisabled': 'Disabled',
    'titlebar.updateDownloading': 'Downloading {percent}%',
    'titlebar.languageFrench': 'Fran\u00e7ais',
    'chat.defaultTitle': 'New conversation',
    'chat.untitledTitle': 'Untitled conversation',
    'chat.genericTitle': 'Conversation',
    'chat.emptyState': 'No messages yet. Local history, imports, and attachments are ready.',
    'chat.emptyPreview': 'Empty',
    'chat.localStateUpdated': 'Local state updated {date}',
    'chat.draftSavedLocal': 'Draft saved locally',
    'chat.starterPromptText': 'Structure the task, surface the constraints, and produce a clean execution plan with concise next actions.',
    'chat.retrySend': 'Retry send',
    'settings.apiKeySaved': 'API key saved. Leave the field empty to keep it.',
    'settings.apiKeyMissingProfile': 'No API key configured for this profile.',
    'wrapper.loadingStatus': 'Loading',
    'wrapper.loadingDetail': 'Official DeepSeek is loading in an isolated session.',
    'wrapper.readyStatus': 'Ready',
    'wrapper.readyDetail': 'Official DeepSeek is loaded. The wrapper session stays separate from your API profiles.',
    'wrapper.loadErrorStatus': 'Load error',
    'wrapper.loadErrorDetail': 'The official wrapper failed to load.',
    'preferences.title': 'Preferences',
    'preferences.close': 'Close',
    'preferences.about': 'About',
    'preferences.application': 'Application',
    'preferences.theme': 'Theme',
    'preferences.notifications': 'Notifications',
    'preferences.openAtStartup': 'Open at startup',
    'preferences.autoUpdate': 'Auto update',
    'preferences.logging': 'Logging',
    'preferences.downloadUpdate': 'Download update',
    'preferences.installUpdate': 'Install update',
    'conversations.rename': 'Rename conversation',
    'conversations.delete': 'Delete conversation',
    'conversations.newTab': 'New conversation',
    'conversations.searchEmpty': 'No conversation matches your search.',
    'message.role.user': 'User',
    'message.role.assistant': 'Assistant',
    'message.role.system': 'System',
    'message.role.tool': 'Tool',
    'message.status.pending': 'Pending',
    'message.status.error': 'Error',
    'message.status.streaming': 'Streaming',
    'meta.version': 'Version',
    'meta.packaged': 'Packaged',
    'meta.platform': 'Platform',
    'meta.lastUpdateCheck': 'Last update check',
    'meta.profiles': 'Profiles',
    'meta.conversations': 'Conversations',
    'meta.yes': 'Yes',
    'meta.no': 'No',
    'prompts.renameConversation': 'New conversation title:',
    'confirm.deleteConversation': 'Delete the conversation "{title}"?',
    'confirm.deleteAllConversations': 'Delete all conversations ({count})? This action cannot be undone.',
    'confirm.deleteProfile': 'Delete the profile "{name}"? This action cannot be undone.',
    'profile.minimumOneRequired': 'At least one profile is required.',
    'profile.noneSelected': 'No profile selected.',
    'profile.generatedName': 'Profile {index}',
    'toast.stateSaved': 'State saved.',
    'toast.saveFailed': 'Save failed.',
    'toast.apiKeyRequired': 'Store an API key in the selected profile first.',
    'toast.offlinePending': 'Offline. Message stored locally as pending.',
    'toast.replyReceived': 'Reply received.',
    'toast.replyReceivedWithTokens': 'Reply received - total tokens {count}',
    'toast.sendFailed': 'Send failed.',
    'toast.modelRefreshFailed': 'Model refresh failed',
    'toast.modelListRefreshed': 'Model list refreshed.',
    'toast.conversationExported': 'Conversation exported.',
    'toast.allConversationsExported': 'All conversations exported.',
    'toast.updateCheckUnavailable': 'Update check unavailable.',
    'toast.updateDownloadUnavailable': 'Update download unavailable.',
    'toast.noDownloadedUpdate': 'No downloaded update.',
    'toast.updateAvailable': 'Update {version} available.',
    'toast.updateDownloaded': 'Update downloaded. Install when ready.',
    'toast.updateError': 'Update error.',
    'toast.bootstrapFailed': 'Bootstrap failed.'
  });

  Object.assign(fr, {
    'titlebar.updateDisabled': 'D\u00e9sactiv\u00e9',
    'titlebar.updateDownloading': 'T\u00e9l\u00e9chargement {percent}%',
    'titlebar.languageFrench': 'Fran\u00e7ais',
    'chat.defaultTitle': 'Nouvelle conversation',
    'chat.untitledTitle': 'Conversation sans titre',
    'chat.genericTitle': 'Conversation',
    'chat.emptyState': 'Aucun message pour le moment. L\'historique local, les imports et les pi\u00e8ces jointes sont pr\u00eats.',
    'chat.emptyPreview': 'Vide',
    'chat.localStateUpdated': '\u00c9tat local mis \u00e0 jour {date}',
    'chat.draftSavedLocal': 'Brouillon enregistr\u00e9 localement',
    'chat.starterPromptText': 'Structure la t\u00e2che, fais ressortir les contraintes et produis un plan d\'ex\u00e9cution propre avec des prochaines actions concises.',
    'chat.retrySend': 'R\u00e9essayer',
    'settings.apiKeySaved': 'Cl\u00e9 API enregistr\u00e9e. Laissez le champ vide pour la conserver.',
    'settings.apiKeyMissingProfile': 'Aucune cl\u00e9 API configur\u00e9e pour ce profil.',
    'wrapper.loadingStatus': 'Chargement',
    'wrapper.loadingDetail': 'DeepSeek officiel se charge dans une session isol\u00e9e.',
    'wrapper.readyStatus': 'Pr\u00eat',
    'wrapper.readyDetail': 'DeepSeek officiel est charg\u00e9. La session wrapper reste s\u00e9par\u00e9e de vos profils API.',
    'wrapper.loadErrorStatus': 'Erreur de chargement',
    'wrapper.loadErrorDetail': 'Le wrapper officiel n\'a pas pu se charger.',
    'preferences.title': 'Pr\u00e9f\u00e9rences',
    'preferences.close': 'Fermer',
    'preferences.about': '\u00c0 propos',
    'preferences.application': 'Application',
    'preferences.theme': 'Th\u00e8me',
    'preferences.notifications': 'Notifications',
    'preferences.openAtStartup': 'Ouvrir au d\u00e9marrage',
    'preferences.autoUpdate': 'Mise \u00e0 jour auto',
    'preferences.logging': 'Journalisation',
    'preferences.downloadUpdate': 'T\u00e9l\u00e9charger la mise \u00e0 jour',
    'preferences.installUpdate': 'Installer la mise \u00e0 jour',
    'conversations.rename': 'Renommer la conversation',
    'conversations.delete': 'Supprimer la conversation',
    'conversations.newTab': 'Nouvelle conversation',
    'conversations.searchEmpty': 'Aucune conversation ne correspond \u00e0 votre recherche.',
    'message.role.user': 'Utilisateur',
    'message.role.assistant': 'Assistant',
    'message.role.system': 'Syst\u00e8me',
    'message.role.tool': 'Outil',
    'message.status.pending': 'En attente',
    'message.status.error': 'Erreur',
    'message.status.streaming': 'Streaming',
    'meta.version': 'Version',
    'meta.packaged': 'Packag\u00e9e',
    'meta.platform': 'Plateforme',
    'meta.lastUpdateCheck': 'Derni\u00e8re v\u00e9rification',
    'meta.profiles': 'Profils',
    'meta.conversations': 'Conversations',
    'meta.yes': 'Oui',
    'meta.no': 'Non',
    'prompts.renameConversation': 'Nouveau titre de la conversation :',
    'confirm.deleteConversation': 'Supprimer la conversation "{title}" ?',
    'confirm.deleteAllConversations': 'Supprimer toutes les conversations ({count}) ? Cette action est irr\u00e9versible.',
    'confirm.deleteProfile': 'Supprimer le profil "{name}" ? Cette action est irr\u00e9versible.',
    'profile.minimumOneRequired': 'Au moins un profil est requis.',
    'profile.noneSelected': 'Aucun profil s\u00e9lectionn\u00e9.',
    'profile.generatedName': 'Profil {index}',
    'toast.stateSaved': '\u00c9tat enregistr\u00e9.',
    'toast.saveFailed': '\u00c9chec de l\'enregistrement.',
    'toast.apiKeyRequired': 'Ajoutez d\'abord une cl\u00e9 API au profil s\u00e9lectionn\u00e9.',
    'toast.offlinePending': 'Hors ligne. Le message a \u00e9t\u00e9 stock\u00e9 localement en attente.',
    'toast.replyReceived': 'R\u00e9ponse re\u00e7ue.',
    'toast.replyReceivedWithTokens': 'R\u00e9ponse re\u00e7ue - total de tokens {count}',
    'toast.sendFailed': '\u00c9chec de l\'envoi.',
    'toast.modelRefreshFailed': '\u00c9chec du rechargement des mod\u00e8les.',
    'toast.modelListRefreshed': 'Liste des mod\u00e8les recharg\u00e9e.',
    'toast.conversationExported': 'Conversation export\u00e9e.',
    'toast.allConversationsExported': 'Toutes les conversations ont \u00e9t\u00e9 export\u00e9es.',
    'toast.updateCheckUnavailable': 'V\u00e9rification des mises \u00e0 jour indisponible.',
    'toast.updateDownloadUnavailable': 'T\u00e9l\u00e9chargement de la mise \u00e0 jour indisponible.',
    'toast.noDownloadedUpdate': 'Aucune mise \u00e0 jour t\u00e9l\u00e9charg\u00e9e.',
    'toast.updateAvailable': 'Mise \u00e0 jour {version} disponible.',
    'toast.updateDownloaded': 'Mise \u00e0 jour t\u00e9l\u00e9charg\u00e9e. Installez-la quand vous voulez.',
    'toast.updateError': 'Erreur de mise \u00e0 jour.',
    'toast.bootstrapFailed': '\u00c9chec de l\'initialisation.'
  });

  window.i18n.registerDictionary('en', en);
  window.i18n.registerDictionary('fr', fr);
})();
