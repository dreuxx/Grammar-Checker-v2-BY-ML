(() => {
    const EXTENSION_NAME = 'Grammar Checker';

    // Función para registrar mensajes en la consola
    const log = (message) => {
        console.log(`[${EXTENSION_NAME}]: ${message}`);
    };

    // Función para inicializar el script de contenido
    const initialize = () => {
        log('Content script loaded and initialized.');

        // Aquí puedes añadir la lógica principal de tu script de contenido
        // Por ejemplo, podrías agregar un listener para mensajes del script de fondo:
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'checkGrammar') {
                const selectedText = window.getSelection().toString();
                if (selectedText) {
                    log('Text selected for grammar check: ' + selectedText);
                    // Aquí podrías enviar el texto seleccionado de vuelta al script de fondo
                    // para procesarlo con la API de OpenAI
                    sendResponse({text: selectedText});
                } else {
                    log('No text selected for grammar check');
                    sendResponse({error: 'No text selected'});
                }
            }
            return true; // Keeps the message channel open for asynchronous responses
        });
    };

    // Manejo de errores
    const handleError = (error) => {
        console.error(`[${EXTENSION_NAME} Error]:`, error);
    };

    // Inicializar el script de contenido
    try {
        initialize();
    } catch (error) {
        handleError(error);
    }
})();