class GrammarPopup {
    constructor() {
        this.initialize();
    }
    
    async initialize() {
        // Cargar estado actual
        await this.loadCurrentState();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Cargar estadísticas
        await this.loadStats();
    }
    
    async loadCurrentState() {
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
    }
    
    setupEventListeners() {
        // Toggle principal
        document.getElementById('toggle-switch').addEventListener('change', (e) => {
            this.toggleForSite(e.target.checked);
        });
        
        // Botón de check
        document.getElementById('check-page-btn').addEventListener('click', () => {
            this.checkCurrentPage();
        });
        
        // Abrir editor
        document.getElementById('open-editor-btn').addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'open-editor' });
            window.close();
        });
        
        // Configuración
        document.getElementById('settings-btn').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
        
        // Idioma
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.updateLanguage(e.target.value);
        });
    }
    
    async toggleForSite(enabled) {
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
        chrome.tabs.sendMessage(this.currentTab.id, {
            action: 'toggle-checker',
            data: enabled
        });
        
        // Actualizar UI
        this.updateUIState(enabled);
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
            // Enviar mensaje para verificar página
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'check-page'
            });
            
            // Cerrar popup después de iniciar
            setTimeout(() => window.close(), 500);
            
        } catch (error) {
            console.error('Error checking page:', error);
            btn.textContent = 'Error';
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