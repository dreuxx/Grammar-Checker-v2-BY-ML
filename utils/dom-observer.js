export class DOMObserver {
    constructor() {
        this.observers = new Map();
        this.callbacks = new Map();
        this.throttleTimers = new Map();
    }
    
    /**
     * Observe an element for changes
     * @param {Element} element - Element to observe
     * @param {Object} options - Observer options
     * @param {Function} callback - Callback function
     * @param {number} throttle - Throttle delay in ms
     */
    observe(element, options, callback, throttle = 0) {
        const id = this.generateId();
        
        // Create observer
        const observer = new MutationObserver((mutations) => {
            if (throttle > 0) {
                this.throttledCallback(id, mutations, callback, throttle);
            } else {
                callback(mutations);
            }
        });
        
        // Default options
        const defaultOptions = {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeOldValue: true,
            characterDataOldValue: true
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        // Start observing
        observer.observe(element, mergedOptions);
        
        // Store observer and callback
        this.observers.set(id, { observer, element, options: mergedOptions });
        this.callbacks.set(id, callback);
        
        return id;
    }
    
    /**
     * Stop observing an element
     * @param {string} id - Observer ID
     */
    disconnect(id) {
        const observerData = this.observers.get(id);
        if (observerData) {
            observerData.observer.disconnect();
            this.observers.delete(id);
            this.callbacks.delete(id);
            
            // Clear throttle timer if exists
            if (this.throttleTimers.has(id)) {
                clearTimeout(this.throttleTimers.get(id));
                this.throttleTimers.delete(id);
            }
        }
    }
    
    /**
     * Disconnect all observers
     */
    disconnectAll() {
        for (const [id] of this.observers) {
            this.disconnect(id);
        }
    }
    
    /**
     * Pause an observer
     * @param {string} id - Observer ID
     */
    pause(id) {
        const observerData = this.observers.get(id);
        if (observerData) {
            observerData.observer.disconnect();
            observerData.paused = true;
        }
    }
    
    /**
     * Resume a paused observer
     * @param {string} id - Observer ID
     */
    resume(id) {
        const observerData = this.observers.get(id);
        if (observerData && observerData.paused) {
            observerData.observer.observe(observerData.element, observerData.options);
            observerData.paused = false;
        }
    }
    
    /**
     * Throttled callback execution
     */
    throttledCallback(id, mutations, callback, delay) {
        // Clear existing timer
        if (this.throttleTimers.has(id)) {
            clearTimeout(this.throttleTimers.get(id));
        }
        
        // Set new timer
        const timer = setTimeout(() => {
            callback(mutations);
            this.throttleTimers.delete(id);
        }, delay);
        
        this.throttleTimers.set(id, timer);
    }
    
    /**
     * Observe multiple elements with the same options
     * @param {NodeList|Array} elements - Elements to observe
     * @param {Object} options - Observer options
     * @param {Function} callback - Callback function
     * @returns {Array} Array of observer IDs
     */
    observeMultiple(elements, options, callback) {
        const ids = [];
        elements.forEach(element => {
            const id = this.observe(element, options, callback);
            ids.push(id);
        });
        return ids;
    }
    
    /**
     * Observe element addition to DOM
     * @param {string} selector - CSS selector for elements to watch
     * @param {Function} callback - Callback when element is added
     * @param {Element} container - Container to watch (default: document.body)
     */
    observeAddition(selector, callback, container = document.body) {
        return this.observe(container, {
            childList: true,
            subtree: true
        }, (mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself matches
                        if (node.matches && node.matches(selector)) {
                            callback(node);
                        }
                        
                        // Check descendants
                        const matches = node.querySelectorAll ? node.querySelectorAll(selector) : [];
                        matches.forEach(match => callback(match));
                    }
                });
            });
        });
    }
    
    /**
     * Observe element removal from DOM
     * @param {string} selector - CSS selector for elements to watch
     * @param {Function} callback - Callback when element is removed
     * @param {Element} container - Container to watch
     */
    observeRemoval(selector, callback, container = document.body) {
        // Keep track of elements
        const trackedElements = new WeakSet();
        
        // Find and track initial elements
        container.querySelectorAll(selector).forEach(el => {
            trackedElements.add(el);
        });
        
        return this.observe(container, {
            childList: true,
            subtree: true
        }, (mutations) => {
            mutations.forEach(mutation => {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the node itself was tracked
                        if (trackedElements.has(node)) {
                            callback(node);
                            trackedElements.delete(node);
                        }
                        
                        // Check descendants
                        if (node.querySelectorAll && node.childElementCount > 0) {
                            node.querySelectorAll(selector).forEach(el => {
                                if (trackedElements.has(el)) {
                                    callback(el);
                                    trackedElements.delete(el);
                                }
                            });
                        }
                    }
                });
                
                // Track new additions
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(selector)) {
                            trackedElements.add(node);
                        }
                        
                        if (node.querySelectorAll) {
                            node.querySelectorAll(selector).forEach(el => {
                                trackedElements.add(el);
                            });
                        }
                    }
                });
            });
        });
    }
    
    /**
     * Observe attribute changes
     * @param {Element} element - Element to observe
     * @param {Array} attributes - Specific attributes to watch
     * @param {Function} callback - Callback function
     */
    observeAttributes(element, attributes, callback) {
        return this.observe(element, {
            attributes: true,
            attributeFilter: attributes,
            attributeOldValue: true,
            childList: false,
            subtree: false
        }, (mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes') {
                    callback({
                        element: mutation.target,
                        attribute: mutation.attributeName,
                        oldValue: mutation.oldValue,
                        newValue: mutation.target.getAttribute(mutation.attributeName)
                    });
                }
            });
        });
    }
    
    /**
     * Observe text content changes
     * @param {Element} element - Element to observe
     * @param {Function} callback - Callback function
     */
    observeText(element, callback) {
        let lastText = element.textContent;
        
        return this.observe(element, {
            characterData: true,
            childList: true,
            subtree: true
        }, () => {
            const currentText = element.textContent;
            if (currentText !== lastText) {
                callback({
                    element: element,
                    oldText: lastText,
                    newText: currentText
                });
                lastText = currentText;
            }
        });
    }
    
    /**
     * Wait for element to appear in DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in ms (0 = no timeout)
     * @returns {Promise<Element>}
     */
    waitForElement(selector, timeout = 0) {
        return new Promise((resolve, reject) => {
            // Check if element already exists
            const existing = document.querySelector(selector);
            if (existing) {
                resolve(existing);
                return;
            }
            
            let timeoutId;
            
            // Set up observer
            const observerId = this.observeAddition(selector, (element) => {
                if (timeoutId) clearTimeout(timeoutId);
                this.disconnect(observerId);
                resolve(element);
            });
            
            // Set up timeout if specified
            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    this.disconnect(observerId);
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                }, timeout);
            }
        });
    }
    
    /**
     * Observe element resize
     * @param {Element} element - Element to observe
     * @param {Function} callback - Callback function
     */
    observeResize(element, callback) {
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(entries => {
                entries.forEach(entry => {
                    callback({
                        element: entry.target,
                        contentRect: entry.contentRect,
                        borderBoxSize: entry.borderBoxSize,
                        contentBoxSize: entry.contentBoxSize
                    });
                });
            });
            
            resizeObserver.observe(element);
            
            // Store resize observer separately
            const id = this.generateId();
            this.observers.set(id, { 
                observer: resizeObserver, 
                element,
                type: 'resize'
            });
            
            return id;
        } else {
            // Fallback for browsers without ResizeObserver
            console.warn('ResizeObserver not supported, using fallback');
            let lastRect = element.getBoundingClientRect();
            return this.observeAttributes(element, ['style', 'class'], () => {
                const newRect = element.getBoundingClientRect();
                if (newRect.width !== lastRect.width || newRect.height !== lastRect.height) {
                    callback({
                        element: element,
                        contentRect: newRect
                    });
                    lastRect = newRect;
                }
            });
        }
    }
    
    /**
     * Generate unique ID
     * @returns {string}
     */
    generateId() {
        if (window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `observer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    
    /**
     * Get statistics about active observers
     */
    getStats() {
        const stats = {
            total: this.observers.size,
            paused: 0,
            byType: {
                mutation: 0,
                resize: 0
            }
        };
        
        this.observers.forEach(data => {
            if (data.paused) stats.paused++;
            if (data.type === 'resize') {
                stats.byType.resize++;
            } else {
                stats.byType.mutation++;
            }
        });
        
        return stats;
    }
}