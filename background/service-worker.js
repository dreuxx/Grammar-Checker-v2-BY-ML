import { ModelManager } from './model-manager.js';
import { AnalyticsManager } from './analytics.js';

class GrammarCheckerBackground {
    constructor() {
        this.modelManager = new ModelManager();
        this.analytics = new AnalyticsManager();
        this.activeTabId = null;
        this.settings = this.loadDefaultSettings();
        
        this.initializeExtension();
        this.loadStoredSettings();
    }

    async loadStoredSettings() {
        try {
            const stored = await chrome.storage.sync.get(['settings']);
            if (stored.settings) {
                this.settings = { ...this.settings, ...stored.settings };
            }
        } catch (error) {
            console.log('Failed to load stored settings, using defaults:', error);
        }
    }
    
    loadDefaultSettings() {
        return {
            enabled: true,
            language: 'es',
            autoCorrect: false,
            checkStyle: true,
            checkGrammar: true,
            checkSpelling: true,
            checkPunctuation: true,
            personalDictionary: [],
            goals: {
                tone: 'neutral', // formal, informal, neutral
                audience: 'general', // general, academic, business
                intent: 'inform' // inform, convince, describe
            },
            sites: {
                disabled: [],
                autoCheck: ['docs.google.com', 'mail.google.com', 'outlook.com']
            }
        };
    }
    
    async initializeExtension() {
        // Cargar modelo al instalar
        chrome.runtime.onInstalled.addListener(async (details) => {
            if (details.reason === 'install') {
                await this.showOnboarding();
                await this.modelManager.initialize();
            }
            
            // Crear menú contextual
            this.createContextMenus();
            
            // Configurar alarmas para estadísticas
            chrome.alarms.create('daily-stats', { periodInMinutes: 1440 });
        });
        
        // Manejar mensajes
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        
        // Manejar comandos de teclado
        chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
        
        // Monitorear cambios de tab
        chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
    }
    
    async showOnboarding() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('onboarding/welcome.html')
        });
    }
    
    createContextMenus() {
        chrome.contextMenus.create({
            id: 'check-selection',
            title: 'Check grammar',
            contexts: ['selection']
        });
        
        chrome.contextMenus.create({
            id: 'add-to-dictionary',
            title: 'Add to personal dictionary',
            contexts: ['selection']
        });
        
        chrome.contextMenus.create({
            id: 'open-editor',
            title: 'Open in Grammar Editor',
            contexts: ['selection', 'page']
        });
        
        chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
    }
    
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'check-text':
                    const result = await this.checkText(request.text, request.language);
                    sendResponse(result);
                    break;
                    
                case 'get-suggestions':
                    const suggestions = await this.getSuggestions(request.error);
                    sendResponse(suggestions);
                    break;
                    
                case 'update-stats':
                    await this.analytics.updateStats(request.stats);
                    break;
                    
                case 'get-settings':
                    sendResponse(this.settings);
                    break;
                    
                case 'update-settings':
                    this.settings = { ...this.settings, ...request.settings };
                    await chrome.storage.sync.set({ settings: this.settings });
                    this.notifyAllTabs('settings-updated', this.settings);
                    break;
                    
                case 'open-editor':
                    await this.openEditor(request.text);
                    break;
                    
                case 'get-model-status':
                    sendResponse({ 
                        ready: this.modelManager.isReady(),
                        loading: this.modelManager.isLoading()
                    });
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: error.message });
        }
        
        return true; // Indica respuesta asíncrona
    }
    
    async checkText(text, language) {
        if (!this.modelManager.isReady()) {
            await this.modelManager.initialize();
        }
        
        // Dividir texto en oraciones para mejor procesamiento
        const sentences = this.splitIntoSentences(text);
        const results = [];
        
        for (const sentence of sentences) {
            if (sentence.text.trim().length > 0) {
                const correction = await this.modelManager.correct(
                    sentence.text, 
                    language || this.settings.language
                );
                
                // Analizar diferencias
                const errors = this.analyzeErrors(sentence.text, correction);
                
                results.push({
                    original: sentence.text,
                    corrected: correction,
                    errors: errors,
                    offset: sentence.offset
                });
            }
        }
        
        // Actualizar estadísticas
        this.analytics.trackCorrection(results);
        
        return results;
    }
    
    splitIntoSentences(text) {
        const sentences = [];
        const regex = /[^.!?]+[.!?]+/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            sentences.push({
                text: match[0],
                offset: match.index
            });
        }
        
        // Agregar texto restante si no termina en puntuación
        const lastIndex = sentences.length > 0 
            ? sentences[sentences.length - 1].offset + sentences[sentences.length - 1].text.length
            : 0;
            
        if (lastIndex < text.length) {
            sentences.push({
                text: text.substring(lastIndex),
                offset: lastIndex
            });
        }
        
        return sentences;
    }
    
    analyzeErrors(original, corrected) {
        const errors = [];
        const dmp = new diff_match_patch();
        const diffs = dmp.diff_main(original, corrected);
        dmp.diff_cleanupSemantic(diffs);
        
        let position = 0;
        
        for (let i = 0; i < diffs.length; i++) {
            const [operation, text] = diffs[i];
            
            if (operation === -1) { // Deletion
                const nextDiff = diffs[i + 1];
                const isReplacement = nextDiff && nextDiff[0] === 1;
                
                errors.push({
                    type: this.detectErrorType(text, isReplacement ? nextDiff[1] : ''),
                    position: position,
                    length: text.length,
                    original: text,
                    suggestion: isReplacement ? nextDiff[1] : '',
                    message: this.getErrorMessage(text, isReplacement ? nextDiff[1] : ''),
                    severity: this.getErrorSeverity(text, isReplacement ? nextDiff[1] : '')
                });
                
                if (isReplacement) {
                    i++; // Skip the next diff as we've processed it
                }
            } else if (operation === 0) { // Equal
                position += text.length;
            }
        }
        
        return errors;
    }
    
    detectErrorType(original, suggestion) {
        // Lógica simplificada - en producción sería más compleja
        if (original.toLowerCase() === suggestion.toLowerCase()) {
            return 'capitalization';
        } else if (this.isPunctuation(original) || this.isPunctuation(suggestion)) {
            return 'punctuation';
        } else if (original.split(' ').length !== suggestion.split(' ').length) {
            return 'grammar';
        } else {
            return 'spelling';
        }
    }
    
    isPunctuation(text) {
        return /^[.,;:!?'"()-]$/.test(text.trim());
    }
    
    getErrorMessage(original, suggestion) {
        const type = this.detectErrorType(original, suggestion);
        const messages = {
            'spelling': `Spelling: "${original}" → "${suggestion}"`,
            'grammar': `Grammar: "${original}" → "${suggestion}"`,
            'punctuation': `Punctuation: "${original}" → "${suggestion}"`,
            'capitalization': `Capitalization: "${original}" → "${suggestion}"`
        };
        return messages[type] || 'Suggestion available';
    }
    
    getErrorSeverity(original, suggestion) {
        const type = this.detectErrorType(original, suggestion);
        const severities = {
            'spelling': 'high',
            'grammar': 'high',
            'punctuation': 'medium',
            'capitalization': 'low'
        };
        return severities[type] || 'medium';
    }

    async getSuggestions(error) {
        // Return additional suggestions for an error
        // This could be enhanced to provide context-aware suggestions
        return {
            suggestions: [error.suggestion],
            explanation: this.getErrorMessage(error.original, error.suggestion),
            type: error.type,
            confidence: 0.85
        };
    }
    
    async handleContextMenu(info, tab) {
        switch (info.menuItemId) {
            case 'check-selection':
                chrome.tabs.sendMessage(tab.id, {
                    action: 'check-selection',
                    text: info.selectionText
                });
                break;
                
            case 'add-to-dictionary':
                this.settings.personalDictionary.push(info.selectionText.toLowerCase());
                await chrome.storage.sync.set({ settings: this.settings });
                this.showNotification('Word added to dictionary', info.selectionText);
                break;
                
            case 'open-editor':
                await this.openEditor(info.selectionText || '');
                break;
        }
    }
    
    async openEditor(text = '') {
        const editor = await chrome.windows.create({
            url: chrome.runtime.getURL('editor/editor.html'),
            type: 'popup',
            width: 1200,
            height: 800
        });
        
        // Esperar a que el editor cargue y enviar el texto
        setTimeout(() => {
            chrome.tabs.sendMessage(editor.tabs[0].id, {
                action: 'load-text',
                text: text
            });
        }, 500);
    }
    
    handleCommand(command) {
        switch (command) {
            case 'toggle-checker':
                this.settings.enabled = !this.settings.enabled;
                chrome.storage.sync.set({ settings: this.settings });
                this.notifyAllTabs('toggle-checker', this.settings.enabled);
                break;
                
            case 'open-editor':
                this.openEditor();
                break;
        }
    }
    
    handleTabChange(activeInfo) {
        this.activeTabId = activeInfo.tabId;
        // Actualizar badge según el estado
        this.updateBadge(activeInfo.tabId);
    }
    
    async updateBadge(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            const isDisabled = this.settings.sites.disabled.some(site => 
                tab.url.includes(site)
            );
            
            chrome.action.setBadgeText({
                text: isDisabled ? 'OFF' : '',
                tabId: tabId
            });
            
            chrome.action.setBadgeBackgroundColor({
                color: '#FF0000',
                tabId: tabId
            });
        } catch (error) {
            // Tab might not exist anymore
        }
    }
    
    notifyAllTabs(action, data) {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action, data }).catch(() => {
                    // Tab might not have content script
                });
            });
        });
    }
    
    showNotification(title, message) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'assets/icons/icon-128.png',
            title: title,
            message: message
        });
    }
}

// Inicializar
const grammarChecker = new GrammarCheckerBackground();