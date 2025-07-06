class TextDetector {
    constructor() {
        this.editableSelectors = [
            'textarea',
            'input[type="text"]',
            'input[type="email"]',
            'input[type="search"]',
            '[contenteditable="true"]',
            '[contenteditable=""]',
            '[role="textbox"]',
            '.notion-page-content', // Notion
            '.ql-editor', // Quill
            '.ProseMirror', // ProseMirror
            '.CodeMirror', // CodeMirror
            '[data-slate-editor="true"]', // Slate
            '.gmail_default', // Gmail
            '.Am.Al.editable', // Gmail compose
            '[g_editable="true"]', // Google Docs
            '.kix-appview-editor', // Google Docs
            '[data-gramm="false"]' // Excluir Grammarly
        ];
        
        this.excludeSelectors = [
            'input[type="password"]',
            'input[type="number"]',
            'input[type="tel"]',
            '[data-grammar-ignore="true"]',
            '.grammar-highlight',
            '.CodeMirror-line' // Evitar código
        ];
    }
    
    findEditableElements() {
        const elements = [];
        
        // Buscar por selectores
        this.editableSelectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            found.forEach(el => {
                if (this.isValidElement(el) && !elements.includes(el)) {
                    elements.push(el);
                }
            });
        });
        
        // Buscar iframes (Google Docs, etc.)
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const iframeEditables = this.findEditableInDocument(iframeDoc);
                elements.push(...iframeEditables);
            } catch (e) {
                // Cross-origin iframe
            }
        });
        
        return elements;
    }
    
    findEditableInDocument(doc) {
        const elements = [];
        
        this.editableSelectors.forEach(selector => {
            const found = doc.querySelectorAll(selector);
            found.forEach(el => {
                if (this.isValidElement(el)) {
                    elements.push(el);
                }
            });
        });
        
        return elements;
    }
    
    isValidElement(element) {
        // Verificar si es visible
        if (!this.isVisible(element)) return false;
        
        // Verificar exclusiones
        for (const selector of this.excludeSelectors) {
            if (element.matches(selector)) return false;
        }
        
        // Verificar si tiene contenido
        const text = this.getElementText(element);
        if (text.trim().length < 3) return false;
        
        return true;
    }
    
    isVisible(element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
        );
    }
    
    isEditableElement(element) {
        if (!element) return false;
        
        // Check common editable attributes
        if (element.contentEditable === 'true' || element.contentEditable === '') return true;
        
        // Check input/textarea
        if (element.tagName === 'TEXTAREA') return true;
        if (element.tagName === 'INPUT' && ['text', 'email', 'search'].includes(element.type)) return true;
        
        // Check role
        if (element.getAttribute('role') === 'textbox') return true;
        
        // Check parent elements
        return this.editableSelectors.some(selector => element.closest(selector));
    }
    
    getElementText(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return element.value;
        } else if (element.contentEditable === 'true' || element.contentEditable === '') {
            return this.getContentEditableText(element);
        } else {
            return element.textContent || '';
        }
    }
    
    getContentEditableText(element) {
        // Preservar estructura para mejor mapeo de posiciones
        let text = '';
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            text += node.textContent;
        }
        
        return text;
    }
    
    setElementText(element, text, cursorPosition) {
        if (!element || typeof text !== 'string') {
            console.warn('Invalid parameters for setElementText');
            return;
        }
        
        try {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                const start = element.selectionStart || 0;
                const end = element.selectionEnd || 0;
                
                element.value = text;
                
                // Restaurar posición del cursor
                if (cursorPosition !== undefined && typeof cursorPosition === 'number') {
                    const safePosition = Math.max(0, Math.min(cursorPosition, text.length));
                    element.setSelectionRange(safePosition, safePosition);
                } else {
                    const safeStart = Math.max(0, Math.min(start, text.length));
                    const safeEnd = Math.max(0, Math.min(end, text.length));
                    element.setSelectionRange(safeStart, safeEnd);
                }
                
                // Disparar evento input
                element.dispatchEvent(new Event('input', { bubbles: true }));
                
            } else if (element.contentEditable === 'true' || element.contentEditable === '') {
                // Para contentEditable es más complejo
                this.setContentEditableText(element, text, cursorPosition);
            }
        } catch (error) {
            console.error('Error setting element text:', error);
        }
    }
    
    setContentEditableText(element, text, cursorPosition) {
        if (!element || typeof text !== 'string') {
            console.warn('Invalid parameters for setContentEditableText');
            return;
        }
        
        try {
            // Guardar selección actual
            const selection = window.getSelection();
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            
            // Actualizar texto
            element.textContent = text;
            
            // Restaurar cursor si es posible
            if (cursorPosition !== undefined && typeof cursorPosition === 'number' && element.firstChild) {
                const newRange = document.createRange();
                const textNode = element.firstChild;
                
                try {
                    const safePosition = Math.max(0, Math.min(cursorPosition, textNode.length));
                    newRange.setStart(textNode, safePosition);
                    newRange.setEnd(textNode, safePosition);
                    
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                } catch (e) {
                    console.warn('Could not restore cursor position:', e);
                }
            }
            
            // Disparar evento input
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (error) {
            console.error('Error setting contentEditable text:', error);
        }
    }
    
    getCaretPosition(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return element.selectionStart;
        } else if (element.contentEditable === 'true' || element.contentEditable === '') {
            return this.getContentEditableCaretPosition(element);
        }
        return 0;
    }
    
    getContentEditableCaretPosition(element) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return 0;
        
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        
        return preCaretRange.toString().length;
    }
}