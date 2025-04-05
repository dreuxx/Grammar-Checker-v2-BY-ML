document.addEventListener('DOMContentLoaded', async function() {
    // Elementos de la UI
    const elements = {
        inputText: document.getElementById('inputText'),
        checkButton: document.getElementById('checkButton'),
        clearButton: document.getElementById('clearButton'),
        outputText: document.getElementById('outputText'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        copyButton: document.getElementById('copyButton'),
        modelLoadingStatus: document.getElementById('modelLoadingStatus')
    };

    // Inicializar el corrector gramatical
    const grammarChecker = new GrammarChecker();
    let lastCheckResults = null;

    // Inicializar la biblioteca
    await initializeChecker();

    /**
     * Inicializa el corrector gramatical
     */
    async function initializeChecker() {
        updateStatus('Inicializando corrector gramatical...', 'loading');
        
        try {
            await grammarChecker.initialize();
            updateStatus('¡Corrector gramatical listo!', 'success');
            
            // Ocultar indicador después de un momento
            setTimeout(() => {
                elements.modelLoadingStatus.classList.add('hidden');
            }, 2000);
            
            // Habilitar botón
            elements.checkButton.disabled = false;
        } catch (error) {
            console.error('Error al inicializar:', error);
            updateStatus(`Error al inicializar el corrector: ${error.message}`, 'error');
        }
    }

    /**
     * Actualiza el estado de carga en la UI
     */
    function updateStatus(message, type = 'loading') {
        const statusElem = elements.modelLoadingStatus;
        if (!statusElem) return;

        let bgColor, textColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-50';
                textColor = 'text-green-700';
                icon = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                break;
            case 'error':
                bgColor = 'bg-red-50';
                textColor = 'text-red-700';
                icon = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                break;
            default:
                bgColor = 'bg-blue-50';
                textColor = 'text-blue-700';
                icon = '<svg class="w-5 h-5 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>';
        }

        statusElem.className = `mb-4 p-2 ${bgColor} ${textColor} rounded flex items-center`;
        statusElem.innerHTML = `${icon}<span>${message}</span>`;
        statusElem.classList.remove('hidden');
    }

    /**
     * Muestra mensajes en el área de salida
     */
    function showOutput(message, className = '') {
        elements.outputText.innerHTML = `<p class="${className}">${message}</p>`;
    }

    /**
     * Controla la visibilidad del indicador de carga
     */
    function showLoading(isLoading) {
        elements.loadingIndicator.classList.toggle('hidden', !isLoading);
        elements.checkButton.disabled = isLoading;
        elements.clearButton.disabled = isLoading;
    }

    /**
     * Verifica la gramática del texto ingresado
     */
    async function checkGrammar() {
        const text = elements.inputText.value.trim();
        if (text === '') {
            showOutput('Por favor, ingrese un texto para revisar.', 'text-red-500');
            return;
        }

        if (text.split(/\s+/).length > 2500) {
            showOutput('El texto excede el límite de 2500 palabras.', 'text-red-500');
            return;
        }

        try {
            showLoading(true);
            
            // Llamar al corrector gramatical
            const results = await grammarChecker.checkGrammar(text);
            lastCheckResults = results;
            
            if (results.corrections.length === 0) {
                showOutput(`No se encontraron errores gramaticales en el texto (${results.language}).`, 'text-green-500');
            } else {
                // Generar HTML con errores resaltados
                const highlightedText = grammarChecker.highlightErrors(text, results.corrections);
                
                // Mostrar resultados
                elements.outputText.innerHTML = `
                    <div class="mb-2">
                        <span class="font-bold">Idioma detectado:</span> ${getLanguageName(results.language)}
                    </div>
                    <div class="mb-2">
                        <span class="font-bold">Errores encontrados:</span> ${results.corrections.length}
                    </div>
                    <div class="border p-3 bg-white rounded text-gray-800 max-h-64 overflow-y-auto">
                        ${highlightedText}
                    </div>
                    <div class="mt-2 text-sm text-gray-500">
                        Pase el cursor sobre las palabras subrayadas para ver sugerencias.
                    </div>
                `;
                
                // Agregar listeners para tooltips
                addTooltipListeners();
            }
            
            elements.copyButton.classList.remove('hidden');
        } catch (error) {
            console.error('Error:', error);
            showOutput(`Error al verificar el texto: ${error.message}`, 'text-red-500');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Convierte código de idioma a nombre completo
     */
    function getLanguageName(langCode) {
        const languages = {
            'en': 'Inglés',
            'es': 'Español',
            'fr': 'Francés',
            'de': 'Alemán',
            'it': 'Italiano',
            'pt': 'Portugués',
            'nl': 'Holandés',
            'ru': 'Ruso',
            'ja': 'Japonés',
            'zh': 'Chino'
        };
        
        return languages[langCode] || langCode;
    }

    /**
     * Agrega listeners para mostrar tooltips en errores
     */
    function addTooltipListeners() {
        document.querySelectorAll('.correction').forEach(el => {
            el.addEventListener('mouseover', function() {
                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip absolute bg-gray-800 text-white p-2 rounded shadow-lg text-sm z-10';
                tooltip.style.maxWidth = '250px';
                
                const type = this.getAttribute('data-type') === 'spelling' ? 'Ortografía' : 'Gramática';
                
                tooltip.innerHTML = `
                    <div class="font-bold">${type}</div>
                    <div>${this.getAttribute('data-message')}</div>
                    <div class="font-bold mt-1 text-green-300">Sugerencia: ${this.getAttribute('data-suggestion')}</div>
                `;
                
                document.body.appendChild(tooltip);
                
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + 'px';
                tooltip.style.top = (rect.bottom + 10) + 'px';
                
                this.addEventListener('mouseout', function() {
                    document.body.removeChild(tooltip);
                }, { once: true });
            });
            
            // Permitir reemplazar errores con un clic
            el.addEventListener('click', function() {
                const suggestion = this.getAttribute('data-suggestion');
                const originalText = elements.inputText.value;
                
                // Encontrar la posición exacta en el texto original
                const position = originalText.indexOf(this.textContent);
                if (position !== -1) {
                    const newText = originalText.substring(0, position) + 
                                  suggestion + 
                                  originalText.substring(position + this.textContent.length);
                    
                    elements.inputText.value = newText;
                    // Actualizar la verificación
                    checkGrammar();
                }
            });
        });
    }

    /**
     * Copia el texto corregido al portapapeles
     */
    function copyImprovedText() {
        if (!lastCheckResults) {
            return;
        }
        
        const text = elements.inputText.value;
        const correctedText = grammarChecker.applyCorrections(text, lastCheckResults.corrections);
        
        navigator.clipboard.writeText(correctedText).then(() => {
            showOutput('Texto corregido copiado al portapapeles', 'text-green-500');
            
            // Restaurar después de un momento
            setTimeout(() => {
                if (lastCheckResults.corrections.length === 0) {
                    showOutput(`No se encontraron errores gramaticales en el texto (${lastCheckResults.language}).`, 'text-green-500');
                } else {
                    const highlightedText = grammarChecker.highlightErrors(text, lastCheckResults.corrections);
                    
                    elements.outputText.innerHTML = `
                        <div class="mb-2">
                            <span class="font-bold">Idioma detectado:</span> ${getLanguageName(lastCheckResults.language)}
                        </div>
                        <div class="mb-2">
                            <span class="font-bold">Errores encontrados:</span> ${lastCheckResults.corrections.length}
                        </div>
                        <div class="border p-3 bg-white rounded text-gray-800 max-h-64 overflow-y-auto">
                            ${highlightedText}
                        </div>
                        <div class="mt-2 text-sm text-gray-500">
                            Pase el cursor sobre las palabras subrayadas para ver sugerencias.
                        </div>
                    `;
                    
                    addTooltipListeners();
                }
            }, 2000);
        }, (err) => {
            console.error('Error al copiar texto: ', err);
            showOutput('Error al copiar texto', 'text-red-500');
        });
    }

    /**
     * Limpia el texto y los resultados
     */
    function clearAll() {
        elements.inputText.value = '';
        elements.outputText.innerHTML = '';
        elements.copyButton.classList.add('hidden');
        lastCheckResults = null;
    }

    // Registrar eventos
    elements.checkButton.addEventListener('click', checkGrammar);
    elements.clearButton.addEventListener('click', clearAll);
    elements.copyButton.addEventListener('click', copyImprovedText);
    
    // Inicialmente deshabilitar botón hasta que la biblioteca esté lista
    elements.checkButton.disabled = true;
});