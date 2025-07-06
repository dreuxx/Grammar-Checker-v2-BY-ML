class GrammarCheckerContent {
    constructor() {
        this.enabled = true;
        this.settings = {};
        this.textDetector = new TextDetector();
        this.highlighter = new Highlighter();
        this.suggestionCard = new SuggestionCard();
        this.floatingButton = new FloatingButton();
        this.observer = null;
        this.checkTimeout = null;
        this.currentErrors = new Map();
        
        this.initialize();
    }
    
    async initialize() {
        // Cargar configuración
        const response = await chrome.runtime.sendMessage({ action: 'get-settings' });
        this.settings = response;
        
        // Verificar si está habilitado para este sitio
        if (this.isDisabledSite()) {
            console.log('Grammar checker disabled for this site');
            return;
        }
        
        // Configurar observadores
        this.setupObservers();
        
        // Escuchar mensajes
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Check inicial
        this.performInitialCheck();
    }
    
    isDisabledSite() {
        const hostname = window.location.hostname;
        return this.settings.sites.disabled.some(site => hostname.includes(site));
    }
    
    setupObservers() {
        // Observar cambios en el DOM
        this.observer = new MutationObserver((mutations) => {
            this.handleDOMChanges(mutations);
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['contenteditable', 'spellcheck']
        });
    }
    
    handleDOMChanges(mutations) {
        // Debounce para evitar múltiples checks
        clearTimeout(this.checkTimeout);
        
        this.checkTimeout = setTimeout(() => {
            const editableElements = this.textDetector.findEditableElements();
            editableElements.forEach(element => {
                if (this.shouldCheckElement(element)) {
                    this.checkElement(element);
                }
            });
        }, 500);
    }
    
    shouldCheckElement(element) {
        // Verificar si el elemento debe ser revisado
        const text = this.textDetector.getElementText(element);
        
        return (
            text.length > 10 && // Mínimo 10 caracteres
            !element.hasAttribute('data-grammar-checking') &&
            !element.hasAttribute('data-grammar-ignore')
        );
    }
    
    async checkElement(element) {
        element.setAttribute('data-grammar-checking', 'true');
        
        try {
            const text = this.textDetector.getElementText(element);
            const language = this.detectLanguage(text);
            
            // Enviar a background para verificación
            const results = await chrome.runtime.sendMessage({
                action: 'check-text',
                text: text,
                language: language
            });
            
            // Procesar resultados
            this.processResults(element, results);
            
        } catch (error) {
            console.error('Error checking element:', error);
        } finally {
            element.removeAttribute('data-grammar-checking');
        }
    }
    
    detectLanguage(text) {
        // Detección simple basada en caracteres
        // En producción usar una librería especializada
        if (/[а-яА-Я]/.test(text)) return 'ru';
        if (/[äöüßÄÖÜ]/.test(text)) return 'de';
        if (/[àèìòùÀÈÌÒÙáéíóúÁÉÍÓÚâêîôûÂÊÎÔÛ]/.test(text)) {
            return text.includes('ñ') ? 'es' : 'fr';
        }
        return this.settings.language || 'en';
    }
    
    processResults(element, results) {
        // Limpiar errores anteriores para este elemento
        this.clearElementErrors(element);
        
        results.forEach(result => {
            result.errors.forEach(error => {
                const errorId = this.generateErrorId();
                
                // Guardar error
                this.currentErrors.set(errorId, {
                    element: element,
                    error: error,
                    result: result
                });
                
                // Resaltar error
                this.highlighter.highlightError(
                    element,
                    error.position + result.offset,
                    error.length,
                    error.type,
                    errorId
                );
            });
        });
        
        // Actualizar contador en el botón flotante
        this.floatingButton.updateCount(this.currentErrors.size);
    }
    
    clearElementErrors(element) {
        // Eliminar resaltados anteriores
        this.highlighter.clearHighlights(element);
        
        // Eliminar errores del mapa
        for (const [id, errorData] of this.currentErrors) {
            if (errorData.element === element) {
                this.currentErrors.delete(id);
            }
        }
    }
    
    generateErrorId() {
        return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    setupEventListeners() {
        // Click en resaltados
        document.addEventListener('click', (e) => {
            const highlight = e.target.closest('.grammar-highlight');
            if (highlight) {
                e.preventDefault();
                e.stopPropagation();
                this.showSuggestion(highlight.dataset.errorId);
            }
        });
        
        // Hover en resaltados
        document.addEventListener('mouseover', (e) => {
            const highlight = e.target.closest('.grammar-highlight');
            if (highlight) {
                this.previewSuggestion(highlight.dataset.errorId);
            }
        });
        
        // Input en elementos editables
        document.addEventListener('input', (e) => {
            if (this.textDetector.isEditableElement(e.target)) {
                this.handleInput(e.target);
            }
        });
        
        // Click en botón flotante
        this.floatingButton.onClick(() => {
            this.showAllErrors();
        });
    }
    
    handleInput(element) {
        // Limpiar errores del elemento mientras escribe
        this.clearElementErrors(element);
        
        // Programar nuevo check después de que deje de escribir
        clearTimeout(element.checkTimeout);
        element.checkTimeout = setTimeout(() => {
            this.checkElement(element);
        }, 1000);
    }
    
    showSuggestion(errorId) {
        const errorData = this.currentErrors.get(errorId);
        if (!errorData) return;
        
        const highlight = document.querySelector(`[data-error-id="${errorId}"]`);
        if (!highlight) return;
        
        // Mostrar tarjeta de sugerencia
        this.suggestionCard.show({
            element: highlight,
            error: errorData.error,
            onAccept: () => this.acceptSuggestion(errorId),
            onIgnore: () => this.ignoreSuggestion(errorId),
            onAddToDictionary: () => this.addToDictionary(errorData.error.original)
        });
    }
    
    previewSuggestion(errorId) {
        const errorData = this.currentErrors.get(errorId);
        if (!errorData) return;
        
        // Mostrar preview rápido
        this.suggestionCard.showPreview(errorData.error);
    }
    
    acceptSuggestion(errorId) {
        const errorData = this.currentErrors.get(errorId);
        if (!errorData) return;
        
        // Aplicar corrección
        this.applyCorrection(
            errorData.element,
            errorData.error,
            errorData.result
        );
        
        // Eliminar error
        this.currentErrors.delete(errorId);
        this.highlighter.removeHighlight(errorId);
        this.suggestionCard.hide();
        
        // Actualizar contador
        this.floatingButton.updateCount(this.currentErrors.size);
        
        // Tracking
        chrome.runtime.sendMessage({
            action: 'update-stats',
            stats: { correctionsAccepted: 1 }
        });
    }
    
    applyCorrection(element, error, result) {
        const text = this.textDetector.getElementText(element);
        const before = text.substring(0, error.position + result.offset);
        const after = text.substring(error.position + result.offset + error.length);
        const newText = before + error.suggestion + after;
        
        // Aplicar cambio manteniendo el cursor
        this.textDetector.setElementText(element, newText, error.position + result.offset + error.suggestion.length);
    }
    
    ignoreSuggestion(errorId) {
        // Marcar como ignorado temporalmente
        const highlight = document.querySelector(`[data-error-id="${errorId}"]`);
        if (highlight) {
            highlight.classList.add('ignored');
        }
        
        this.suggestionCard.hide();
        
        // Tracking
        chrome.runtime.sendMessage({
            action: 'update-stats',
            stats: { correctionsIgnored: 1 }
        });
    }
    
    async addToDictionary(word) {
        await chrome.runtime.sendMessage({
            action: 'add-to-dictionary',
            word: word
        });
        
        // Eliminar todos los errores de esa palabra
        for (const [id, errorData] of this.currentErrors) {
            if (errorData.error.original.toLowerCase() === word.toLowerCase()) {
                this.highlighter.removeHighlight(id);
                this.currentErrors.delete(id);
            }
        }
        
        this.suggestionCard.hide();
        this.floatingButton.updateCount(this.currentErrors.size);
    }
    
    showAllErrors() {
        // Crear panel lateral con todos los errores
        const panel = document.createElement('div');
        panel.className = 'grammar-errors-panel';
        
        const errors = Array.from(this.currentErrors.values());
        panel.innerHTML = `
            <div class="panel-header">
                <h3>Grammar & Spelling (${errors.length})</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="errors-list">
                ${errors.map(({ error, element }, index) => `
                    <div class="error-item" data-error-id="${this.getErrorIdByData(error, element)}">
                        <span class="error-type ${error.type}">${error.type}</span>
                        <div class="error-text">
                            <span class="original">${error.original}</span>
                            <span class="arrow">→</span>
                            <span class="suggestion">${error.suggestion}</span>
                        </div>
                        <button class="apply-btn">Apply</button>
                    </div>
                `).join('')}
            </div>
            ${errors.length > 5 ? `
                <div class="panel-footer">
                    <button class="apply-all-btn">Apply All Corrections</button>
                </div>
            ` : ''}
        `;
        
        document.body.appendChild(panel);
        
        // Event listeners
        panel.querySelector('.close-btn').onclick = () => panel.remove();
        
        panel.querySelectorAll('.error-item').forEach(item => {
            item.onclick = () => {
                const errorId = item.dataset.errorId;
                this.highlightError(errorId);
                this.showSuggestion(errorId);
            };
        });
        
        const applyAllBtn = panel.querySelector('.apply-all-btn');
        if (applyAllBtn) {
            applyAllBtn.onclick = () => this.applyAllCorrections();
        }
    }
    
    getErrorIdByData(error, element) {
        for (const [id, data] of this.currentErrors) {
            if (data.error === error && data.element === element) {
                return id;
            }
        }
        return null;
    }
    
    highlightError(errorId) {
        const highlight = document.querySelector(`[data-error-id="${errorId}"]`);
        if (highlight) {
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlight.classList.add('pulse');
            setTimeout(() => highlight.classList.remove('pulse'), 1000);
        }
    }
    
    applyAllCorrections() {
        const errorIds = Array.from(this.currentErrors.keys());
        errorIds.forEach(errorId => this.acceptSuggestion(errorId));
        
        // Cerrar panel
        document.querySelector('.grammar-errors-panel')?.remove();
    }
    
    performInitialCheck() {
        // Check automático en sitios configurados
        const hostname = window.location.hostname;
        if (this.settings.sites.autoCheck.some(site => hostname.includes(site))) {
            setTimeout(() => {
                const editableElements = this.textDetector.findEditableElements();
                editableElements.forEach(element => this.checkElement(element));
            }, 2000);
        }
    }
    
    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'toggle-checker':
                this.enabled = request.data;
                if (!this.enabled) {
                    this.disable();
                } else {
                    this.enable();
                }
                break;
                
            case 'check-selection':
                this.checkSelection(request.text);
                break;
                
            case 'settings-updated':
                this.settings = request.data;
                this.applySettings();
                break;
        }
    }
    
    disable() {
        // Limpiar todo
        this.observer?.disconnect();
        this.highlighter.clearAllHighlights();
        this.suggestionCard.hide();
        this.floatingButton.hide();
        this.currentErrors.clear();
    }
    
    enable() {
        this.setupObservers();
        this.floatingButton.show();
        this.performInitialCheck();
    }
    
    applySettings() {
        // Aplicar nueva configuración
        if (this.isDisabledSite() && this.enabled) {
            this.disable();
        } else if (!this.isDisabledSite() && !this.enabled) {
            this.enable();
        }
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            console.log('Initializing GrammarCheckerContent...');
            new GrammarCheckerContent();
        } catch (error) {
            console.error('Error initializing GrammarCheckerContent:', error);
        }
    });
} else {
    try {
        console.log('Initializing GrammarCheckerContent (DOM already ready)...');
        new GrammarCheckerContent();
    } catch (error) {
        console.error('Error initializing GrammarCheckerContent:', error);
    }
}