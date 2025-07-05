class GrammarEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.sidebar = document.getElementById('sidebar');
        this.statsPanel = document.getElementById('stats-panel');
        this.goalsPanel = document.getElementById('goals-panel');
        this.currentText = '';
        this.currentLanguage = 'es';
        this.errors = [];
        this.stats = {
            words: 0,
            characters: 0,
            sentences: 0,
            readingTime: 0,
            score: 100
        };
        
        this.initialize();
    }
    
    async initialize() {
        // Configurar editor
        this.setupEditor();
        
        // Cargar configuración
        await this.loadSettings();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Mensaje inicial si hay texto
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === 'load-text') {
                this.editor.textContent = request.text;
                this.analyzeText();
            }
        });
    }
    
    setupEditor() {
        // Hacer el editor más inteligente
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
        
        // Auto-save
        let saveTimeout;
        this.editor.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveToStorage();
                this.analyzeText();
            }, 1000);
        });
    }
    
    async loadSettings() {
        const response = await chrome.runtime.sendMessage({ action: 'get-settings' });
        this.currentLanguage = response.language;
        this.goals = response.goals;
        
        // Actualizar UI
        document.getElementById('language-select').value = this.currentLanguage;
        this.updateGoalsUI();
    }
    
    setupEventListeners() {
        // Botón de análisis
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeText();
        });
        
        // Botón de limpiar
        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea limpiar todo el texto?')) {
                this.editor.textContent = '';
                this.clearAnalysis();
            }
        });
        
        // Exportar
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportText();
        });
        
        // Cambio de idioma
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            this.analyzeText();
        });
        
        // Objetivos
        document.querySelectorAll('.goal-selector').forEach(selector => {
            selector.addEventListener('change', (e) => {
                this.updateGoal(e.target.name, e.target.value);
            });
        });
    }
    
    async analyzeText() {
        const text = this.editor.innerText;
        if (!text.trim()) return;
        
        // Mostrar loading
        this.showLoading(true);
        
        try {
            // Analizar con el modelo
            const results = await chrome.runtime.sendMessage({
                action: 'check-text',
                text: text,
                language: this.currentLanguage
            });
            
            // Procesar resultados
            this.processResults(results);
            
            // Actualizar estadísticas
            this.updateStats(text);
            
            // Actualizar score
            this.updateScore();
            
        } catch (error) {
            console.error('Error analyzing text:', error);
            this.showError('Error al analizar el texto');
        } finally {
            this.showLoading(false);
        }
    }
    
    processResults(results) {
        // Limpiar errores anteriores
        this.clearHighlights();
        this.errors = [];
        
        results.forEach(result => {
            result.errors.forEach(error => {
                this.errors.push(error);
                this.highlightError(error, result.offset);
            });
        });
        
        // Actualizar sidebar con errores
        this.updateErrorsList();
    }
    
    highlightError(error, offset) {
        const text = this.editor.innerText;
        const before = text.substring(0, error.position + offset);
        const errorText = text.substring(error.position + offset, error.position + offset + error.length);
        const after = text.substring(error.position + offset + error.length);
        
        // Crear span con error
        const errorSpan = document.createElement('span');
        errorSpan.className = `error-highlight error-${error.type}`;
        errorSpan.textContent = errorText;
        errorSpan.dataset.errorIndex = this.errors.indexOf(error);
        
        // Reemplazar contenido manteniendo formato
        const range = document.createRange();
        const textNode = this.getTextNodeAtOffset(error.position + offset);
        
        if (textNode) {
            range.setStart(textNode, error.position);
            range.setEnd(textNode, error.position + error.length);
            range.deleteContents();
            range.insertNode(errorSpan);
        }
    }
    
    getTextNodeAtOffset(offset) {
        // Encontrar el nodo de texto en el offset dado
        const walker = document.createTreeWalker(
            this.editor,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let currentOffset = 0;
        let node;
        
        while (node = walker.nextNode()) {
            if (currentOffset + node.textContent.length >= offset) {
                return node;
            }
            currentOffset += node.textContent.length;
        }
        
        return null;
    }
    
    clearHighlights() {
        this.editor.querySelectorAll('.error-highlight').forEach(span => {
            const text = span.textContent;
            span.replaceWith(text);
        });
    }
    
    updateErrorsList() {
        const errorsList = document.getElementById('errors-list');
        errorsList.innerHTML = '';
        
        const errorsByType = this.groupErrorsByType();
        
        Object.entries(errorsByType).forEach(([type, errors]) => {
            const section = document.createElement('div');
            section.className = 'errors-section';
            
            section.innerHTML = `
                <h4 class="errors-section-title">
                    <span class="error-icon ${type}"></span>
                    ${this.getTypeLabel(type)} (${errors.length})
                </h4>
                <div class="errors-items">
                    ${errors.map((error, index) => `
                        <div class="error-card" data-error-index="${this.errors.indexOf(error)}">
                            <div class="error-content">
                                <span class="error-original">${error.original}</span>
                                <span class="error-arrow">→</span>
                                <span class="error-suggestion">${error.suggestion}</span>
                            </div>
                            <button class="apply-correction-btn" data-index="${this.errors.indexOf(error)}">
                                Apply
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
            
            errorsList.appendChild(section);
        });
        
        // Event listeners para aplicar correcciones
        errorsList.querySelectorAll('.apply-correction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.applyCorrection(index);
            });
        });
        
        errorsList.querySelectorAll('.error-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('apply-correction-btn')) {
                    const index = parseInt(card.dataset.errorIndex);
                    this.scrollToError(index);
                }
            });
        });
    }
    
    groupErrorsByType() {
        return this.errors.reduce((groups, error) => {
            if (!groups[error.type]) {
                groups[error.type] = [];
            }
            groups[error.type].push(error);
            return groups;
        }, {});
    }
    
    getTypeLabel(type) {
        const labels = {
            'spelling': 'Ortografía',
            'grammar': 'Gramática',
            'punctuation': 'Puntuación',
            'style': 'Estilo',
            'capitalization': 'Mayúsculas'
        };
        return labels[type] || type;
    }
    
    applyCorrection(index) {
        const error = this.errors[index];
        const errorSpan = this.editor.querySelector(`[data-error-index="${index}"]`);
        
        if (errorSpan) {
            errorSpan.textContent = error.suggestion;
            errorSpan.classList.remove('error-highlight', `error-${error.type}`);
            errorSpan.classList.add('corrected');
            
            // Remover de la lista
            this.errors.splice(index, 1);
            this.updateErrorsList();
            this.updateScore();
            
            // Animar
            setTimeout(() => {
                errorSpan.classList.remove('corrected');
            }, 1000);
        }
    }
    
    scrollToError(index) {
        const errorSpan = this.editor.querySelector(`[data-error-index="${index}"]`);
        if (errorSpan) {
            errorSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorSpan.classList.add('highlight-pulse');
            setTimeout(() => {
                errorSpan.classList.remove('highlight-pulse');
            }, 1000);
        }
    }
    
    updateStats(text) {
        // Palabras
        this.stats.words = text.split(/\s+/).filter(word => word.length > 0).length;
        
        // Caracteres
        this.stats.characters = text.length;
        
        // Oraciones
        this.stats.sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        
        // Tiempo de lectura (200 palabras por minuto)
        this.stats.readingTime = Math.ceil(this.stats.words / 200);
        
        // Actualizar UI
        document.getElementById('word-count').textContent = this.stats.words;
        document.getElementById('char-count').textContent = this.stats.characters;
        document.getElementById('sentence-count').textContent = this.stats.sentences;
        document.getElementById('reading-time').textContent = `${this.stats.readingTime} min`;
    }
    
    updateScore() {
        // Calcular score basado en errores
        const errorPenalty = {
            'spelling': 5,
            'grammar': 5,
            'punctuation': 3,
            'style': 2,
            'capitalization': 1
        };
        
        let totalPenalty = 0;
        this.errors.forEach(error => {
            totalPenalty += errorPenalty[error.type] || 3;
        });
        
        this.stats.score = Math.max(0, 100 - totalPenalty);
        
        // Actualizar UI con animación
        const scoreElement = document.getElementById('writing-score');
        const currentScore = parseInt(scoreElement.textContent);
        
        this.animateNumber(scoreElement, currentScore, this.stats.score);
        
        // Actualizar color según score
        scoreElement.className = 'score';
        if (this.stats.score >= 90) {
            scoreElement.classList.add('excellent');
        } else if (this.stats.score >= 70) {
            scoreElement.classList.add('good');
        } else if (this.stats.score >= 50) {
            scoreElement.classList.add('fair');
        } else {
            scoreElement.classList.add('poor');
        }
    }
    
    animateNumber(element, from, to) {
        const duration = 500;
        const start = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const current = from + (to - from) * progress;
                element.textContent = Math.round(current);
                requestAnimationFrame(animate);
            } else {
                element.textContent = to;
            }
        };
        
        animate();
    }
    
    updateGoalsUI() {
        // Actualizar selectores de objetivos
        document.querySelector(`[name="tone"][value="${this.goals.tone}"]`).checked = true;
        document.querySelector(`[name="audience"][value="${this.goals.audience}"]`).checked = true;
        document.querySelector(`[name="intent"][value="${this.goals.intent}"]`).checked = true;
    }
    
    updateGoal(type, value) {
        this.goals[type] = value;
        
        // Guardar en configuración
        chrome.runtime.sendMessage({
            action: 'update-settings',
            settings: { goals: this.goals }
        });
        
        // Re-analizar con nuevos objetivos
        this.analyzeText();
    }
    
    exportText() {
        const text = this.editor.innerText;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `document_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    saveToStorage() {
        chrome.storage.local.set({
            editorContent: this.editor.innerHTML,
            editorText: this.editor.innerText
        });
    }
    
    async loadFromStorage() {
        const data = await chrome.storage.local.get(['editorContent']);
        if (data.editorContent) {
            this.editor.innerHTML = data.editorContent;
            this.analyzeText();
        }
    }
    
    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    }
    
    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Inicializar editor
document.addEventListener('DOMContentLoaded', () => {
    new GrammarEditor();
});