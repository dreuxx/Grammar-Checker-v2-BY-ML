class SuggestionCard {
    constructor() {
        this.card = null;
        this.currentError = null;
        this.createCard();
    }
    
    createCard() {
        this.card = document.createElement('div');
        this.card.className = 'grammar-suggestion-card';
        this.card.innerHTML = `
            <div class="suggestion-header">
                <span class="error-type"></span>
                <button class="close-btn">×</button>
            </div>
            <div class="suggestion-content">
                <div class="error-text">
                    <span class="original"></span>
                    <span class="arrow">→</span>
                    <span class="suggestion"></span>
                </div>
                <div class="error-message"></div>
            </div>
            <div class="suggestion-actions">
                <button class="accept-btn primary">Accept</button>
                <button class="ignore-btn">Ignore</button>
                <button class="dictionary-btn">Add to Dictionary</button>
            </div>
            <div class="suggestion-footer">
                <span class="confidence"></span>
                <a href="#" class="learn-more">Learn more</a>
            </div>
        `;
        
        // Ocultar inicialmente
        this.card.style.display = 'none';
        document.body.appendChild(this.card);
        
        // Event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.card.querySelector('.close-btn').onclick = () => this.hide();
        
        this.card.querySelector('.accept-btn').onclick = () => {
            if (this.callbacks?.onAccept) {
                this.callbacks.onAccept();
            }
        };
        
        this.card.querySelector('.ignore-btn').onclick = () => {
            if (this.callbacks?.onIgnore) {
                this.callbacks.onIgnore();
            }
        };
        
        this.card.querySelector('.dictionary-btn').onclick = () => {
            if (this.callbacks?.onAddToDictionary) {
                this.callbacks.onAddToDictionary();
            }
        };
        
        this.card.querySelector('.learn-more').onclick = (e) => {
            e.preventDefault();
            this.showLearnMore();
        };
        
        // Cerrar al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!this.card.contains(e.target) && 
                !e.target.closest('.grammar-highlight')) {
                this.hide();
            }
        });
    }
    
    show(options) {
        const { element, error, onAccept, onIgnore, onAddToDictionary } = options;
        
        this.currentError = error;
        this.callbacks = { onAccept, onIgnore, onAddToDictionary };
        
        // Actualizar contenido
        this.card.querySelector('.error-type').textContent = error.type;
        this.card.querySelector('.error-type').className = `error-type ${error.type}`;
        this.card.querySelector('.original').textContent = error.original;
        this.card.querySelector('.suggestion').textContent = error.suggestion;
        this.card.querySelector('.error-message').textContent = error.message;
        
        // Mostrar/ocultar botón de diccionario según el tipo
        const dictBtn = this.card.querySelector('.dictionary-btn');
        dictBtn.style.display = error.type === 'spelling' ? 'inline-block' : 'none';
        
        // Posicionar tarjeta
        this.positionCard(element);
        
        // Mostrar con animación
        this.card.style.display = 'block';
        this.card.classList.add('show');
    }
    
    positionCard(element) {
        const rect = element.getBoundingClientRect();
        const cardRect = this.card.getBoundingClientRect();
        
        // Calcular posición óptima
        let top = rect.bottom + window.scrollY + 10;
        let left = rect.left + window.scrollX;
        
        // Ajustar si se sale de la pantalla
        if (left + cardRect.width > window.innerWidth) {
            left = window.innerWidth - cardRect.width - 10;
        }
        
        if (top + cardRect.height > window.innerHeight + window.scrollY) {
            // Mostrar arriba del elemento
            top = rect.top + window.scrollY - cardRect.height - 10;
        }
        
        this.card.style.top = `${top}px`;
        this.card.style.left = `${left}px`;
    }
    
    hide() {
        this.card.classList.remove('show');
        setTimeout(() => {
            this.card.style.display = 'none';
        }, 200);
    }
    
    showPreview(error) {
        // Mostrar preview minimalista
        if (!this.preview) {
            this.preview = document.createElement('div');
            this.preview.className = 'grammar-preview';
            document.body.appendChild(this.preview);
        }
        
        this.preview.innerHTML = `
            <span class="preview-type ${error.type}">${error.type}</span>
            ${error.suggestion}
        `;
        
        // Posicionar cerca del cursor
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        this.preview.style.left = `${mouseX + 10}px`;
        this.preview.style.top = `${mouseY + 10}px`;
        this.preview.style.display = 'block';
        
        // Ocultar después de un tiempo
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            this.preview.style.display = 'none';
        }, 2000);
    }
    
    showLearnMore() {
        // Abrir página con más información sobre el error
        const learnMoreUrl = chrome.runtime.getURL('learn-more.html') + 
            `?type=${this.currentError.type}&rule=${encodeURIComponent(this.currentError.rule || '')}`;
        
        window.open(learnMoreUrl, '_blank');
    }
}