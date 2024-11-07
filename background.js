const EXTENSION_NAME = 'Grammar Checker';

const log = message => console.log(`[${EXTENSION_NAME}]: ${message}`);
const handleError = error => console.error(`[${EXTENSION_NAME} Error]:`, error);

const initializeExtension = () => {
  log('Extension installed or updated.');
  
  chrome.storage.sync.get(['openaiApiKey', 'openaiModel'], result => {
    if (!result.openaiApiKey) {
      log('API key not set. Prompting user to set it.');
      chrome.runtime.openOptionsPage();
    } else {
      log('Extension configured successfully.');
    }
  });
};

chrome.runtime.onInstalled.addListener(initializeExtension);

chrome.runtime.onUninstalled.addListener(() => {
  log('Extension uninstalled.');
});

try {
  // Cualquier código adicional de inicialización iría aquí
  log('Background script loaded.');
} catch (error) {
  handleError(error);
}