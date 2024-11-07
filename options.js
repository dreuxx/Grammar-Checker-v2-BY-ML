document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        apiKey: document.getElementById('apiKey'),
        model: document.getElementById('model'),
        saveButton: document.getElementById('save'),
        status: document.getElementById('status')
    };

    const DEFAULT_MODEL = 'gpt-3.5-turbo';
    const STORAGE_KEYS = {
        API_KEY: 'openaiApiKey',
        MODEL: 'openaiModel'
    };

    const loadOptions = () => {
        chrome.storage.sync.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.MODEL], items => {
            elements.apiKey.value = items[STORAGE_KEYS.API_KEY] || '';
            elements.model.value = items[STORAGE_KEYS.MODEL] || DEFAULT_MODEL;
        });
    };

    const saveOptions = () => {
        const apiKeyValue = elements.apiKey.value.trim();
        if (!apiKeyValue) {
            showStatus('Por favor, ingrese una clave API válida.', 'text-red-500');
            return;
        }

        chrome.storage.sync.set({
            [STORAGE_KEYS.API_KEY]: apiKeyValue,
            [STORAGE_KEYS.MODEL]: elements.model.value
        }, () => showStatus('Configuración guardada correctamente.', 'text-green-500'));
    };

    const showStatus = (message, className) => {
        elements.status.textContent = message;
        elements.status.className = `mt-4 text-center text-sm ${className}`;
        setTimeout(() => {
            elements.status.textContent = '';
            elements.status.className = 'mt-4 text-center text-sm';
        }, 3000);
    };

    loadOptions();
    elements.saveButton.addEventListener('click', saveOptions);
});