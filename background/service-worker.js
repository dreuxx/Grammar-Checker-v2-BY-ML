import { ModelManager } from './model-manager.js';
import { AnalyticsManager } from './analytics.js';
import { MessageHandler } from './message-handler.js';
import { StorageManager } from '../utils/storage-manager.js';
import { ModelStateManager } from './model-state-manager.js';
import { BasicGrammarChecker } from './basic-grammar-checker.js';

// Singleton instance
let grammarCheckerInstance = null;

class GrammarCheckerBackground {
    static getInstance() {
        if (!grammarCheckerInstance) {
            grammarCheckerInstance = new GrammarCheckerBackground();
        }
        return grammarCheckerInstance;
    }
    
    constructor() {
        // Enforce singleton
        if (grammarCheckerInstance) {
            return grammarCheckerInstance;
        }
        
        // Initialize managers
        this.modelManager = new ModelManager();
        this.analytics = new AnalyticsManager();
        this.storage = new StorageManager();
        this.messageHandler = new MessageHandler(this);
        this.stateManager = new ModelStateManager();
        this.basicChecker = new BasicGrammarChecker();
        
        // State
        this.activeTabId = null;
        this.settings = null;
        this.initializationPromise = null;
        
        // Start initialization
        this.initialize();
    }
    
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._initialize();
        return this.initializationPromise;
    }
    
    async _initialize() {
        try {
            // Load settings first
            await this.loadSettings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Create context menus
            await this.createContextMenus();
            
            // Set up alarms for analytics
            chrome.alarms.create('daily-stats', { 
                periodInMinutes: 1440 // 24 hours
            });
            
            // Initialize model in background (non-blocking)
            this.initializeModelAsync();
            
            console.log('✅ Grammar Checker initialized successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.stateManager.setState('error', error.message);
        }
    }
    
    async loadSettings() {
        try {
            this.settings = await this.storage.getWithDefault('settings', this.getDefaultSettings());
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = this.getDefaultSettings();
        }
    }
    
    getDefaultSettings() {
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
                tone: 'neutral',
                audience: 'general',
                intent: 'inform'
            },
            sites: {
                disabled: [],
                autoCheck: ['docs.google.com', 'mail.google.com', 'outlook.com']
            },
            appearance: {
                highlightStyle: 'underline',
                showFloatingButton: true,
                soundEnabled: false
            },
            advanced: {
                cacheSize: 100,
                checkDelay: 1000,
                minWordLength: 3,
                useWebWorker: true,
                fallbackToBasic: true
            }
        };
    }
    
    setupEventListeners() {
        // Installation handler
        chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
        
        // Message handler
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        
        // Command handler
        chrome.commands.onCommand.addListener(this.handleCommand.bind(this));
        
        // Tab handlers
        chrome.tabs.onActivated.addListener(this.handleTabChange.bind(this));
        chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
        
        // Context menu handler
        chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
        
        // Alarm handler
        chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
        
        // Storage change handler
        this.storage.onChange('settings', this.handleSettingsChange.bind(this));
    }
    
    async handleInstall(details) {
        if (details.reason === 'install') {
            // Show onboarding
            await chrome.tabs.create({
                url: chrome.runtime.getURL('onboarding/welcome.html')
            });
            
            // Initialize storage with defaults
            await this.storage.set({ settings: this.settings });
            
            // Don't initialize model here - do it on first use
        } else if (details.reason === 'update') {
            // Handle updates
            console.log(`Updated from ${details.previousVersion} to ${chrome.runtime.getManifest().version}`);
        }
    }
    
    async initializeModelAsync() {
        // Don't block - initialize in background
        this.stateManager.setState('loading');
        
        try {
            if (this.settings.advanced.useWebWorker) {
                await this.modelManager.initializeWithWorker();
            } else {
                await this.modelManager.initialize();
            }
            
            this.stateManager.setState('ready');
            console.log('✅ AI Model loaded successfully');
        } catch (error) {
            console.error('❌ Model loading failed:', error);
            this.stateManager.setState('error', 'Model loading failed');
            
            // Don't throw - we have fallback
            if (!this.settings.advanced.fallbackToBasic) {
                this.showNotification(
                    'Model Loading Failed',
                    'Grammar checking will use basic rules',
                    'warning'
                );
            }
        }
    }
    
    handleMessage(request, sender, sendResponse) {
        // Use promise-based approach for better async handling
        this.messageHandler.handle(request, sender)
            .then(response => {
                sendResponse({ success: true, data: response });
            })
            .catch(error => {
                console.error('Message handling error:', error);
                sendResponse({ success: false, error: error.message });
            });
        
        // Keep message channel open for async response
        return true;
    }
    
    async handleCommand(command) {
        switch (command) {
            case 'toggle-checker':
                await this.toggleChecker();
                break;
            case 'open-editor':
                await this.openEditor();
                break;
        }
    }
    
    async handleTabChange(activeInfo) {
        this.activeTabId = activeInfo.tabId;
        await this.updateBadgeForTab(activeInfo.tabId);
    }
    
    async handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete') {
            await this.updateBadgeForTab(tabId);
        }
    }
    
    async handleContextMenu(info, tab) {
        switch (info.menuItemId) {
            case 'check-selection':
                await this.checkSelection(tab, info.selectionText);
                break;
            case 'add-to-dictionary':
                await this.addToDictionary(info.selectionText);
                break;
            case 'open-editor':
                await this.openEditor(info.selectionText);
                break;
        }
    }
    
    async handleAlarm(alarm) {
        if (alarm.name === 'daily-stats') {
            await this.analytics.processDailyStats();
        }
    }
    
    async handleSettingsChange(changes) {
        // Reload settings
        await this.loadSettings();
        
        // Notify all tabs about settings change
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'settings-updated',
                    settings: this.settings
                });
            } catch (error) {
                // Tab might not have content script
            }
        }
    }
    
    async createContextMenus() {
        // Remove existing menus
        await chrome.contextMenus.removeAll();
        
        // Create new menus
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
            id: 'separator-1',
            type: 'separator',
            contexts: ['selection']
        });
        
        chrome.contextMenus.create({
            id: 'open-editor',
            title: 'Open in Grammar Editor',
            contexts: ['selection', 'page']
        });
    }
    
    async checkText(text, language) {
        if (!text || text.trim().length === 0) {
            return [];
        }
        
        let results = [];
        
        try {
            // Try to use AI model first
            if (this.modelManager.isReady()) {
                results = await this.modelManager.checkText(text, language || this.settings.language);
            } else if (this.settings.advanced.fallbackToBasic) {
                // Use basic grammar checker as fallback
                results = await this.basicChecker.check(text, language || this.settings.language);
            } else {
                throw new Error('Grammar checking not available');
            }
            
            // Track analytics
            this.analytics.trackCorrection(results);
            
            return results;
        } catch (error) {
            console.error('Error checking text:', error);
            
            // Try fallback if not already using it
            if (this.settings.advanced.fallbackToBasic && this.modelManager.isReady()) {
                try {
                    results = await this.basicChecker.check(text, language || this.settings.language);
                    return results;
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                }
            }
            
            throw error;
        }
    }
    
    async checkSelection(tab, text) {
        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'check-selection',
                text: text
            });
        } catch (error) {
            console.error('Error checking selection:', error);
            this.showNotification('Error', 'Could not check selected text');
        }
    }
    
    async addToDictionary(word) {
        if (!word) return;
        
        const cleanWord = word.trim().toLowerCase();
        if (!this.settings.personalDictionary.includes(cleanWord)) {
            this.settings.personalDictionary.push(cleanWord);
            await this.storage.update('settings', (current) => ({
                ...current,
                personalDictionary: this.settings.personalDictionary
            }));
            
            this.showNotification(
                'Added to Dictionary',
                `"${word}" will no longer be marked as an error`
            );
        }
    }
    
    async openEditor(initialText = '') {
        const editor = await chrome.windows.create({
            url: chrome.runtime.getURL('editor/editor.html'),
            type: 'popup',
            width: Math.min(1200, screen.width * 0.9),
            height: Math.min(800, screen.height * 0.9)
        });
        
        // Wait for editor to load and send initial text
        if (initialText) {
            setTimeout(() => {
                chrome.tabs.sendMessage(editor.tabs[0].id, {
                    action: 'load-text',
                    text: initialText
                });
            }, 500);
        }
    }
    
    async toggleChecker() {
        this.settings.enabled = !this.settings.enabled;
        await this.storage.update('settings', (current) => ({
            ...current,
            enabled: this.settings.enabled
        }));
        
        // Update all tabs
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggle-checker',
                    enabled: this.settings.enabled
                });
            } catch (error) {
                // Tab might not have content script
            }
        }
    }
    
    async updateBadgeForTab(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            const url = new URL(tab.url);
            const hostname = url.hostname;
            
            const isDisabled = this.settings.sites.disabled.includes(hostname);
            
            if (isDisabled) {
                chrome.action.setBadgeText({ text: 'OFF', tabId });
                chrome.action.setBadgeBackgroundColor({ color: '#F44336', tabId });
            } else {
                const modelState = this.stateManager.state;
                if (modelState === 'error') {
                    chrome.action.setBadgeText({ text: '!', tabId });
                    chrome.action.setBadgeBackgroundColor({ color: '#FF9800', tabId });
                } else {
                    chrome.action.setBadgeText({ text: '', tabId });
                }
            }
        } catch (error) {
            // Tab might not exist anymore
        }
    }
    
    showNotification(title, message, type = 'basic') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('assets/icons/icon-128.png'),
            title: title,
            message: message
        });
    }
    
    // Public API for message handler
    async getSettings() {
        return this.settings;
    }
    
    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await this.storage.set({ settings: this.settings });
    }
    
    async getModelStatus() {
        return {
            ready: this.modelManager.isReady(),
            loading: this.modelManager.isLoading(),
            state: this.stateManager.state,
            fallbackAvailable: this.settings.advanced.fallbackToBasic
        };
    }
    
    async getStats(period) {
        return this.analytics.getStats(period);
    }
}

// Create singleton instance
const grammarChecker = GrammarCheckerBackground.getInstance();

// Export for testing
export { GrammarCheckerBackground };