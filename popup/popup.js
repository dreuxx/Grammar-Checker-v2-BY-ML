class GrammarPopup {
    constructor() {
        this.initialize();
    }
    
    async initialize() {
        try {
            // Cargar estado actual
            await this.loadCurrentState();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Cargar estadísticas
            await this.loadStats();
        } catch (error) {
            console.error('Error initializing popup:', error);
            this.showToast('Error initializing extension');
        }
    }
    
    async loadCurrentState() {
        try {
            // Obtener configuración
            const settings = await chrome.storage.sync.get(['settings']);
            this.settings = settings.settings || {};
            
            // Obtener estado de la pestaña actual
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            this.currentTab = tab;
            
            // Verificar si está habilitado
            const hostname = new URL(tab.url).hostname;
            const isDisabled = this.settings.sites?.disabled?.includes(hostname);
            
            // Actualizar UI
            document.getElementById('toggle-switch').checked = !isDisabled;
            document.getElementById('site-name').textContent = hostname;
            
            // Mostrar/ocultar opciones según estado
            this.updateUIState(!isDisabled);
        } catch (error) {
            console.error('Error loading current state:', error);
            this.showToast('Error loading extension state');
        }
    }
    
    setupEventListeners() {
        try {
            console.log('Setting up event listeners...');
            
            // Toggle principal
            const toggleSwitch = document.getElementById('toggle-switch');
            if (toggleSwitch) {
                toggleSwitch.addEventListener('change', (e) => {
                    console.log('Toggle switch changed:', e.target.checked);
                    this.toggleForSite(e.target.checked);
                });
            } else {
                console.error('Toggle switch element not found');
            }
            
            // Botón de check
            const checkPageBtn = document.getElementById('check-page-btn');
            if (checkPageBtn) {
                checkPageBtn.addEventListener('click', () => {
                    console.log('Check page button clicked');
                    this.checkCurrentPage();
                });
            } else {
                console.error('Check page button element not found');
            }
            
            // Abrir editor
            const openEditorBtn = document.getElementById('open-editor-btn');
            if (openEditorBtn) {
                openEditorBtn.addEventListener('click', () => {
                    console.log('Open editor button clicked');
                    chrome.runtime.sendMessage({ action: 'open-editor' });
                    window.close();
                });
            } else {
                console.error('Open editor button element not found');
            }
            
            // Configuración
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    console.log('Settings button clicked');
                    chrome.runtime.openOptionsPage();
                });
            } else {
                console.error('Settings button element not found');
            }
            
            // Idioma
            const languageSelect = document.getElementById('language-select');
            if (languageSelect) {
                languageSelect.addEventListener('change', (e) => {
                    console.log('Language changed:', e.target.value);
                    this.updateLanguage(e.target.value);
                });
            } else {
                console.error('Language select element not found');
            }
            
            console.log('Event listeners setup completed');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }
    
    async toggleForSite(enabled) {
        try {
            const hostname = new URL(this.currentTab.url).hostname;
            const disabledSites = this.settings.sites?.disabled || [];
            
            if (enabled) {
                // Remover de sitios deshabilitados
                const index = disabledSites.indexOf(hostname);
                if (index > -1) {
                    disabledSites.splice(index, 1);
                }
            } else {
                // Agregar a sitios deshabilitados
                if (!disabledSites.includes(hostname)) {
                    disabledSites.push(hostname);
                }
            }
            
            // Guardar cambios
            this.settings.sites = { ...this.settings.sites, disabled: disabledSites };
            await chrome.storage.sync.set({ settings: this.settings });
            
            // Notificar al content script
            try {
                await chrome.tabs.sendMessage(this.currentTab.id, {
                    action: 'toggle-checker',
                    data: enabled
                });
            } catch (messageError) {
                console.warn('Could not send message to content script:', messageError);
                // This might be expected if the page doesn't have content scripts
            }
            
            // Actualizar UI
            this.updateUIState(enabled);
            
            this.showToast(enabled ? 'Extension enabled' : 'Extension disabled');
        } catch (error) {
            console.error('Error toggling for site:', error);
            this.showToast('Error updating settings');
        }
    }
    
    updateUIState(enabled) {
        const controls = document.getElementById('controls');
        controls.style.display = enabled ? 'block' : 'none';
        
        const status = document.getElementById('status');
        status.textContent = enabled ? 'Active' : 'Disabled';
        status.className = `status ${enabled ? 'active' : 'disabled'}`;
    }
    
    async checkCurrentPage() {
        // Mostrar loading
        const btn = document.getElementById('check-page-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Checking...';
        btn.disabled = true;
        
        try {
            console.log('Checking current page...');
            // Enviar mensaje para verificar página
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'check-page'
            });
            
            console.log('Check page message sent successfully');
            this.showToast('Page check started');
            
            // Cerrar popup después de iniciar
            setTimeout(() => window.close(), 500);
            
        } catch (error) {
            console.error('Error checking page:', error);
            btn.textContent = 'Error';
            this.showToast('Error: Could not check page');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        }
    }
    
    async updateLanguage(language) {
        this.settings.language = language;
        await chrome.storage.sync.set({ settings: this.settings });
        
        // Mostrar confirmación
        this.showToast('Language updated');
    }
    
    async loadStats() {
        const stats = await chrome.storage.local.get(['weeklyStats']);
        const weeklyStats = stats.weeklyStats || {
            errorsFound: 0,
            correctionsAccepted: 0,
            wordsChecked: 0
        };
        
        // Actualizar UI
        document.getElementById('errors-found').textContent = weeklyStats.errorsFound;
        document.getElementById('corrections-made').textContent = weeklyStats.correctionsAccepted;
        document.getElementById('words-checked').textContent = this.formatNumber(weeklyStats.wordsChecked);
        
        // Calcular precisión
        const accuracy = weeklyStats.errorsFound > 0 
            ? Math.round((weeklyStats.correctionsAccepted / weeklyStats.errorsFound) * 100)
            : 100;
        document.getElementById('accuracy').textContent = `${accuracy}%`;
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new GrammarPopup();
});