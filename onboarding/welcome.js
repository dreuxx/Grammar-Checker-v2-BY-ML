class Onboarding {
    constructor() {
        this.currentStep = 0;
        this.steps = [
            'welcome',
            'permissions',
            'features',
            'customization',
            'ready'
        ];
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
        this.showStep(0);
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextStep();
        });
        
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.prevStep();
        });
        
        document.getElementById('skip-btn').addEventListener('click', () => {
            this.complete();
        });
        
        // Permission request
        document.getElementById('grant-permissions-btn').addEventListener('click', () => {
            this.requestPermissions();
        });
        
        // Language selection
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.selectLanguage(e.target.value);
        });
        
        // Get started button
        document.getElementById('get-started-btn').addEventListener('click', () => {
            this.complete();
        });
    }
    
    showStep(index) {
        // Hide all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        
        // Show current step
        const currentStepElement = document.getElementById(`step-${this.steps[index]}`);
        currentStepElement.classList.add('active');
        
        // Update progress
        this.updateProgress();
        
        // Update navigation
        this.updateNavigation();
        
        // Animate entrance
        currentStepElement.style.animation = 'slideIn 0.5s ease';
    }
    
    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }
    
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }
    
    updateProgress() {
        const progress = ((this.currentStep + 1) / this.steps.length) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
        
        // Update dots
        document.querySelectorAll('.progress-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index <= this.currentStep);
        });
    }
    
    updateNavigation() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const skipBtn = document.getElementById('skip-btn');
        
        // Show/hide buttons based on current step
        prevBtn.style.display = this.currentStep === 0 ? 'none' : 'inline-block';
        nextBtn.style.display = this.currentStep === this.steps.length - 1 ? 'none' : 'inline-block';
        skipBtn.style.display = this.currentStep === this.steps.length - 1 ? 'none' : 'inline-block';
    }
    
    async requestPermissions() {
        // En Manifest V3, los permisos ya están otorgados
        // Simular proceso
        const btn = document.getElementById('grant-permissions-btn');
        btn.textContent = 'Granting...';
        btn.disabled = true;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        btn.textContent = '✓ Permissions Granted';
        btn.classList.add('success');
        
        // Auto avanzar al siguiente paso
        setTimeout(() => this.nextStep(), 1000);
    }
    
    selectLanguage(language) {
        // Guardar idioma seleccionado
        chrome.storage.sync.set({
            settings: { language: language }
        });
        
        // Mostrar confirmación visual
        const select = document.getElementById('language-select');
        select.style.borderColor = '#11a683';
        
        // Actualizar preview
        this.updateLanguagePreview(language);
    }
    
    updateLanguagePreview(language) {
        const previews = {
            'es': 'Hola! Grammar Checker está listo para ayudarte.',
            'en': 'Hello! Grammar Checker is ready to help you.',
            'fr': 'Bonjour! Grammar Checker est prêt à vous aider.',
            'de': 'Hallo! Grammar Checker ist bereit, Ihnen zu helfen.',
            'ru': 'Привет! Grammar Checker готов вам помочь.'
        };
        
        const previewElement = document.getElementById('language-preview');
        previewElement.textContent = previews[language] || previews['en'];
        previewElement.style.opacity = '0';
        
        setTimeout(() => {
            previewElement.style.opacity = '1';
        }, 100);
    }
    
    complete() {
        // Marcar onboarding como completado
        chrome.storage.local.set({ onboardingCompleted: true });
        
        // Cerrar tab
        window.close();
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new Onboarding();
});