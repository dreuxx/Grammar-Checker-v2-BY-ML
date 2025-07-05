class FloatingButton {
    constructor() {
        this.button = null;
        this.badge = null;
        this.createButton();
    }
    
    createButton() {
        this.button = document.createElement('div');
        this.button.className = 'grammar-floating-button';
        this.button.innerHTML = `
            <div class="button-icon">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
                </svg>
            </div>
            <div class="button-badge" style="display: none;">0</div>
        `;
        
        this.badge = this.button.querySelector('.button-badge');
        
        // Ocultar inicialmente
        this.button.style.display = 'none';
        document.body.appendChild(this.button);
        
        // Hacer draggable
        this.makeDraggable();
    }
    
    makeDraggable() {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        const handleMouseDown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.button.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            this.button.style.cursor = 'grabbing';
            this.button.classList.add('dragging');
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            this.button.style.left = `${initialX + dx}px`;
            this.button.style.top = `${initialY + dy}px`;
            this.button.style.right = 'auto';
            this.button.style.bottom = 'auto';
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                this.button.style.cursor = 'pointer';
                this.button.classList.remove('dragging');
                
                // Guardar posición
                this.savePosition();
            }
        };
        
        this.button.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Click handler
        this.button.addEventListener('click', (e) => {
            if (!isDragging) {
                if (this.onClick) {
                    this.onClick();
                }
            }
        });
    }
    
    savePosition() {
        const rect = this.button.getBoundingClientRect();
        chrome.storage.local.set({
            floatingButtonPosition: {
                left: rect.left,
                top: rect.top
            }
        });
    }
    
    async loadPosition() {
        const data = await chrome.storage.local.get('floatingButtonPosition');
        if (data.floatingButtonPosition) {
            this.button.style.left = `${data.floatingButtonPosition.left}px`;
            this.button.style.top = `${data.floatingButtonPosition.top}px`;
            this.button.style.right = 'auto';
            this.button.style.bottom = 'auto';
        }
    }
    
    show() {
        this.button.style.display = 'flex';
        this.loadPosition();
        
        // Animación de entrada
        this.button.classList.add('fade-in');
        setTimeout(() => this.button.classList.remove('fade-in'), 300);
    }
    
    hide() {
        this.button.classList.add('fade-out');
        setTimeout(() => {
            this.button.style.display = 'none';
            this.button.classList.remove('fade-out');
        }, 300);
    }
    
    updateCount(count) {
        if (count > 0) {
            this.badge.textContent = count > 99 ? '99+' : count;
            this.badge.style.display = 'block';
            this.button.classList.add('has-errors');
        } else {
            this.badge.style.display = 'none';
            this.button.classList.remove('has-errors');
        }
    }
    
    onClick(callback) {
        this.onClickCallback = callback;
    }
}