class Highlighter {
    constructor() {
        this.highlights = new Map();
        this.styles = {
            spelling: {
                borderBottom: '2px solid #ff5252',
                backgroundColor: 'rgba(255, 82, 82, 0.1)'
            },
            grammar: {
                borderBottom: '2px solid #ff9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)'
            },
            punctuation: {
                borderBottom: '2px dotted #2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)'
            },
            style: {
                borderBottom: '2px dashed #9c27b0',
                backgroundColor: 'rgba(156, 39, 176, 0.1)'
            }
        };
    }
    
    highlightError(element, position, length, type, errorId) {
        // Validar parámetros de entrada
        if (!element || typeof position !== 'number' || typeof length !== 'number' || !errorId) {
            console.warn('Invalid parameters for highlightError:', { element, position, length, type, errorId });
            return;
        }
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            // Para inputs usar overlay
            this.highlightInput(element, position, length, type, errorId);
        } else {
            // Para contentEditable usar spans
            this.highlightContentEditable(element, position, length, type, errorId);
        }
    }
    
    highlightInput(element, position, length, type, errorId) {
        // Validar entrada
        if (!element || !element.value) {
            console.warn('Invalid element for input highlighting');
            return;
        }
        
        const text = element.value;
        
        // Validar posiciones
        if (position < 0 || position >= text.length || length <= 0 || position + length > text.length) {
            console.warn('Invalid position or length for input highlighting:', { position, length, textLength: text.length });
            return;
        }
        
        try {
            // Crear overlay para inputs
            const wrapper = this.getOrCreateWrapper(element);
            if (!wrapper) {
                console.error('Failed to create wrapper for input element');
                return;
            }
            
            const overlay = document.createElement('div');
            overlay.className = 'grammar-highlight-overlay';
            overlay.dataset.errorId = errorId;
            overlay.dataset.type = type;
            
            // Calcular posición del error
            const before = text.substring(0, position);
            const error = text.substring(position, position + length);
            
            // Crear elemento temporal para medir
            const measurer = document.createElement('span');
            measurer.style.cssText = window.getComputedStyle(element).cssText;
            measurer.style.position = 'absolute';
            measurer.style.visibility = 'hidden';
            measurer.style.whiteSpace = 'pre';
            document.body.appendChild(measurer);
            
            measurer.textContent = before;
            const startX = measurer.offsetWidth;
            
            measurer.textContent = error;
            const width = measurer.offsetWidth;
            
            document.body.removeChild(measurer);
            
            // Posicionar overlay
            overlay.style.left = `${startX}px`;
            overlay.style.width = `${width}px`;
            overlay.style.height = `${element.offsetHeight}px`;
            
            // Aplicar estilos del tipo de error
            const errorStyles = this.styles[type] || this.styles.spelling;
            Object.assign(overlay.style, errorStyles);
            
            wrapper.appendChild(overlay);
            
            // Guardar referencia
            this.highlights.set(errorId, {
                element: element,
                overlay: overlay,
                type: type
            });
        } catch (error) {
            console.error('Error highlighting input:', error);
        }
    }
    
    getOrCreateWrapper(element) {
        if (!element || !element.parentElement) {
            console.error('Invalid element for wrapper creation');
            return null;
        }
        
        let wrapper = element.parentElement;
        
        if (!wrapper || !wrapper.classList.contains('grammar-input-wrapper')) {
            try {
                wrapper = document.createElement('div');
                wrapper.className = 'grammar-input-wrapper';
                
                // Copiar estilos importantes
                const style = window.getComputedStyle(element);
                wrapper.style.position = 'relative';
                wrapper.style.display = style.display;
                wrapper.style.width = style.width;
                
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
            } catch (error) {
                console.error('Error creating wrapper:', error);
                return null;
            }
        }
        
        return wrapper;
    }
    
    highlightContentEditable(element, position, length, type, errorId) {
        if (!element || !element.textContent) {
            console.warn('Invalid element for contentEditable highlighting');
            return;
        }
        
        const text = element.textContent;
        
        // Validar posiciones
        if (position < 0 || position >= text.length || length <= 0 || position + length > text.length) {
            console.warn('Invalid position or length for contentEditable highlighting:', { position, length, textLength: text.length });
            return;
        }
        
        try {
            const before = text.substring(0, position);
            const error = text.substring(position, position + length);
            const after = text.substring(position + length);
            
            // Crear estructura con highlight
            const beforeNode = document.createTextNode(before);
            const errorNode = document.createElement('span');
            errorNode.className = `grammar-highlight grammar-highlight-${type}`;
            errorNode.dataset.errorId = errorId;
            errorNode.dataset.type = type;
            errorNode.textContent = error;
            
            // Aplicar estilos del tipo de error
            const errorStyles = this.styles[type] || this.styles.spelling;
            Object.assign(errorNode.style, errorStyles);
            
            const afterNode = document.createTextNode(after);
            
            // Reemplazar contenido
            element.innerHTML = '';
            element.appendChild(beforeNode);
            element.appendChild(errorNode);
            element.appendChild(afterNode);
            
            // Guardar referencia
            this.highlights.set(errorId, {
                element: element,
                highlight: errorNode,
                type: type
            });
        } catch (error) {
            console.error('Error highlighting contentEditable:', error);
        }
    }
    
    removeHighlight(errorId) {
        const highlight = this.highlights.get(errorId);
        if (!highlight) return;
        
        if (highlight.overlay) {
            // Remover overlay
            highlight.overlay.remove();
        } else if (highlight.highlight) {
            // Remover span y unir texto
            const parent = highlight.highlight.parentNode;
            const text = parent.textContent;
            parent.textContent = text;
        }
        
        this.highlights.delete(errorId);
    }
    
    clearHighlights(element) {
        const toRemove = [];
        
        for (const [errorId, highlight] of this.highlights) {
            if (highlight.element === element) {
                toRemove.push(errorId);
            }
        }
        
        toRemove.forEach(errorId => this.removeHighlight(errorId));
    }
    
    clearAllHighlights() {
        for (const errorId of this.highlights.keys()) {
            this.removeHighlight(errorId);
        }
    }
}