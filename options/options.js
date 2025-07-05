class GrammarOptions {
    constructor() {
        this.settings = {};
        this.initialize();
    }
    
    async initialize() {
        // Cargar configuración actual
        await this.loadSettings();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Cargar diccionario personal
        await this.loadPersonalDictionary();
    }
    
    async loadSettings() {
        const data = await chrome.storage.sync.get(['settings']);
        this.settings = data.settings || this.getDefaultSettings();
        
        // Aplicar configuración a la UI
        this.applySettingsToUI();
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
                autoCheck: ['docs.google.com', 'mail.google.com']
            },
            appearance: {
                highlightStyle: 'underline',
                showFloatingButton: true,
                soundEnabled: false
            },
            advanced: {
                cacheSize: 100,
                checkDelay: 1000,
                minWordLength: 3
            }
        };
    }
    
    applySettingsToUI() {
        // General Settings
        document.getElementById('language').value = this.settings.language;
        document.getElementById('auto-correct').checked = this.settings.autoCorrect;
        
        // Check Options
        document.getElementById('check-style').checked = this.settings.checkStyle;
        document.getElementById('check-grammar').checked = this.settings.checkGrammar;
        document.getElementById('check-spelling').checked = this.settings.checkSpelling;
        document.getElementById('check-punctuation').checked = this.settings.checkPunctuation;
        
        // Writing Goals
        document.querySelector(`[name="tone"][value="${this.settings.goals.tone}"]`).checked = true;
        document.querySelector(`[name="audience"][value="${this.settings.goals.audience}"]`).checked = true;
        document.querySelector(`[name="intent"][value="${this.settings.goals.intent}"]`).checked = true;
        
        // Appearance
        document.getElementById('highlight-style').value = this.settings.appearance.highlightStyle;
        document.getElementById('show-floating-button').checked = this.settings.appearance.showFloatingButton;
        document.getElementById('sound-enabled').checked = this.settings.appearance.soundEnabled;
        
        // Sites
        this.updateDisabledSitesList();
        this.updateAutoCheckSitesList();
        
        // Advanced
        document.getElementById('cache-size').value = this.settings.advanced.cacheSize;
        document.getElementById('check-delay').value = this.settings.advanced.checkDelay;
        document.getElementById('min-word-length').value = this.settings.advanced.minWordLength;
    }
    
    setupEventListeners() {
        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetSettings();
        });
        
        // Export/Import
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportSettings();
        });
        
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });
        
        document.getElementById('import-file').addEventListener('change', (e) => {
            this.importSettings(e.target.files[0]);
        });
        
        // Add site buttons
        document.getElementById('add-disabled-site').addEventListener('click', () => {
            this.addDisabledSite();
        });
        
        document.getElementById('add-auto-check-site').addEventListener('click', () => {
            this.addAutoCheckSite();
        });
        
        // Personal dictionary
        document.getElementById('add-word-btn').addEventListener('click', () => {
            this.addWordToDictionary();
        });
        
        document.getElementById('clear-dictionary-btn').addEventListener('click', () => {
            this.clearDictionary();
        });
        
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }
    
    async saveSettings() {
        // Recopilar configuración de la UI
        this.settings = {
            ...this.settings,
            language: document.getElementById('language').value,
            autoCorrect: document.getElementById('auto-correct').checked,
            checkStyle: document.getElementById('check-style').checked,
            checkGrammar: document.getElementById('check-grammar').checked,
            checkSpelling: document.getElementById('check-spelling').checked,
            checkPunctuation: document.getElementById('check-punctuation').checked,
            goals: {
                tone: document.querySelector('[name="tone"]:checked').value,
                audience: document.querySelector('[name="audience"]:checked').value,
                intent: document.querySelector('[name="intent"]:checked').value
            },
            appearance: {
                highlightStyle: document.getElementById('highlight-style').value,
                showFloatingButton: document.getElementById('show-floating-button').checked,
                soundEnabled: document.getElementById('sound-enabled').checked
            },
            advanced: {
                cacheSize: parseInt(document.getElementById('cache-size').value),
                checkDelay: parseInt(document.getElementById('check-delay').value),
                minWordLength: parseInt(document.getElementById('min-word-length').value)
            }
        };
        
        // Guardar
        await chrome.storage.sync.set({ settings: this.settings });
        
        // Notificar a todas las pestañas
        chrome.runtime.sendMessage({
            action: 'update-settings',
            settings: this.settings
        });
        
        // Mostrar confirmación
        this.showNotification('Settings saved successfully!', 'success');
    }
    
    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            this.settings = this.getDefaultSettings();
            await chrome.storage.sync.set({ settings: this.settings });
            this.applySettingsToUI();
            this.showNotification('Settings reset to default', 'info');
        }
    }
    
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `grammar-checker-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }
    
    async importSettings(file) {
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            
            // Validar estructura básica
            if (imported.language && imported.goals) {
                this.settings = imported;
                await chrome.storage.sync.set({ settings: this.settings });
                this.applySettingsToUI();
                this.showNotification('Settings imported successfully!', 'success');
            } else {
                throw new Error('Invalid settings file');
            }
        } catch (error) {
            this.showNotification('Error importing settings: ' + error.message, 'error');
        }
    }
    
    updateDisabledSitesList() {
        const list = document.getElementById('disabled-sites-list');
        list.innerHTML = '';
        
        this.settings.sites.disabled.forEach(site => {
            const item = this.createSiteItem(site, () => {
                this.removeDisabledSite(site);
            });
            list.appendChild(item);
        });
    }
    
    updateAutoCheckSitesList() {
        const list = document.getElementById('auto-check-sites-list');
        list.innerHTML = '';
        
        this.settings.sites.autoCheck.forEach(site => {
            const item = this.createSiteItem(site, () => {
                this.removeAutoCheckSite(site);
            });
            list.appendChild(item);
        });
    }
    
    createSiteItem(site, onRemove) {
        const item = document.createElement('div');
        item.className = 'site-item';
        item.innerHTML = `
            <span>${site}</span>
            <button class="remove-btn">×</button>
        `;
        
        item.querySelector('.remove-btn').addEventListener('click', onRemove);
        return item;
    }
    
    addDisabledSite() {
        const input = document.getElementById('disabled-site-input');
        const site = input.value.trim();
        
        if (site && !this.settings.sites.disabled.includes(site)) {
            this.settings.sites.disabled.push(site);
            this.updateDisabledSitesList();
            input.value = '';
        }
    }
    
    removeDisabledSite(site) {
        const index = this.settings.sites.disabled.indexOf(site);
        if (index > -1) {
            this.settings.sites.disabled.splice(index, 1);
            this.updateDisabledSitesList();
        }
    }
    
    addAutoCheckSite() {
        const input = document.getElementById('auto-check-site-input');
        const site = input.value.trim();
        
        if (site && !this.settings.sites.autoCheck.includes(site)) {
            this.settings.sites.autoCheck.push(site);
            this.updateAutoCheckSitesList();
            input.value = '';
        }
    }
    
    removeAutoCheckSite(site) {
        const index = this.settings.sites.autoCheck.indexOf(site);
        if (index > -1) {
            this.settings.sites.autoCheck.splice(index, 1);
            this.updateAutoCheckSitesList();
        }
    }
    
    async loadPersonalDictionary() {
        const list = document.getElementById('dictionary-list');
        list.innerHTML = '';
        
        this.settings.personalDictionary.forEach(word => {
            const item = document.createElement('div');
            item.className = 'dictionary-word';
            item.innerHTML = `
                <span>${word}</span>
                <button class="remove-btn">×</button>
            `;
            
            item.querySelector('.remove-btn').addEventListener('click', () => {
                this.removeWordFromDictionary(word);
            });
            
            list.appendChild(item);
        });
        
        document.getElementById('dictionary-count').textContent = 
            `${this.settings.personalDictionary.length} words`;
    }
    
    addWordToDictionary() {
        const input = document.getElementById('dictionary-word-input');
        const word = input.value.trim().toLowerCase();
        
        if (word && !this.settings.personalDictionary.includes(word)) {
            this.settings.personalDictionary.push(word);
            this.loadPersonalDictionary();
            input.value = '';
        }
    }
    
    removeWordFromDictionary(word) {
        const index = this.settings.personalDictionary.indexOf(word);
        if (index > -1) {
            this.settings.personalDictionary.splice(index, 1);
            this.loadPersonalDictionary();
        }
    }
    
    clearDictionary() {
        if (confirm('Are you sure you want to clear your personal dictionary?')) {
            this.settings.personalDictionary = [];
            this.loadPersonalDictionary();
        }
    }
    
    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new GrammarOptions();
});