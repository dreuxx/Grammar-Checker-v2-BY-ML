export class StorageManager {
    constructor() {
        this.cache = new Map();
        this.listeners = new Map();
        this.quotaWarningThreshold = 0.9; // 90% of quota
        this.syncInterval = null;
        this.pendingSync = new Set();
        this.isLocked = false; // For transaction locking
        this.storageChangeListener = this.handleStorageChange.bind(this);

        this.initialize();
    }

    async initialize() {
        // Set up storage change listener
        chrome.storage.onChanged.addListener(this.storageChangeListener);

        // Check storage quota
        await this.checkQuota();

        // Set up periodic sync
        this.setupPeriodicSync();
    }

    /**
     * Get data from storage
     * @param {string|Array} keys - Keys to retrieve
     * @param {string} area - Storage area (local, sync, managed)
     * @returns {Promise<Object>} Retrieved data
     */
    async get(keys, area = 'local') {
        // Check cache first
        if (typeof keys === 'string' && this.cache.has(`${area}:${keys}`)) {
            return { [keys]: this.cache.get(`${area}:${keys}`) };
        }

        try {
            const storage = chrome.storage[area];
            const result = await storage.get(keys);

            // Update cache
            if (result) {
                if (keys === null) {
                    // If we fetched everything for an area, cache all results
                    Object.entries(result).forEach(([key, value]) => {
                        this.cache.set(`${area}:${key}`, value);
                    });
                } else if (typeof keys === 'string') {
                    if (result[keys] !== undefined) {
                        this.cache.set(`${area}:${keys}`, result[keys]);
                    }
                } else if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        if (result[key] !== undefined) {
                            this.cache.set(`${area}:${key}`, result[key]);
                        }
                    });
                }
            }

            return result;
        } catch (error) {
            console.error(`Error getting from ${area} storage:`, error);
            throw error;
        }
    }

    /**
     * Set data in storage
     * @param {Object} items - Items to store
     * @param {string} area - Storage area
     * @returns {Promise<void>}
     */
    async set(items, area = 'local') {
        try {
            const storage = chrome.storage[area];
            await storage.set(items);

            // Update cache
            Object.entries(items).forEach(([key, value]) => {
                this.cache.set(`${area}:${key}`, value);
            });

            // Check quota after write
            await this.checkQuota();

        } catch (error) {
            console.error(`Error setting to ${area} storage:`, error);

            // If sync storage fails, try local storage
            if (area === 'sync' && error.message.includes('QUOTA_BYTES')) {
                console.warn(`Sync storage quota exceeded. Falling back to local storage for these items. Error: ${error.message}`);
                return this.set(items, 'local');
            }

            throw error;
        }
    }

    /**
     * Remove data from storage
     * @param {string|Array} keys - Keys to remove
     * @param {string} area - Storage area
     * @returns {Promise<void>}
     */
    async remove(keys, area = 'local') {
        try {
            const storage = chrome.storage[area];
            await storage.remove(keys);

            // Update cache
            const keysArray = Array.isArray(keys) ? keys : [keys];
            keysArray.forEach(key => {
                this.cache.delete(`${area}:${key}`);
            });

        } catch (error) {
            console.error(`Error removing from ${area} storage:`, error);
            throw error;
        }
    }

    /**
     * Clear all data from storage area
     * @param {string} area - Storage area
     * @returns {Promise<void>}
     */
    async clear(area = 'local') {
        try {
            const storage = chrome.storage[area];
            await storage.clear();

            // Clear cache for this area
            for (const [key] of this.cache) {
                if (key.startsWith(`${area}:`)) {
                    this.cache.delete(key);
                }
            }

        } catch (error) {
            console.error(`Error clearing ${area} storage:`, error);
            throw error;
        }
    }

    /**
     * Get storage usage and quota
     * @param {string} area - Storage area
     * @returns {Promise<Object>} Usage information
     */
    async getUsage(area = 'local') {
        try {
            const storage = chrome.storage[area];

            if (area === 'local' && storage.getBytesInUse) {
                const bytesInUse = await storage.getBytesInUse();
                const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default

                return {
                    used: bytesInUse,
                    quota: quota,
                    percentage: (bytesInUse / quota) * 100,
                    remaining: quota - bytesInUse
                };
            } else if (area === 'sync') {
                // Sync storage has different quotas
                return {
                    quota: {
                        QUOTA_BYTES: chrome.storage.sync.QUOTA_BYTES || 102400,
                        QUOTA_BYTES_PER_ITEM: chrome.storage.sync.QUOTA_BYTES_PER_ITEM || 8192,
                        MAX_ITEMS: chrome.storage.sync.MAX_ITEMS || 512
                    }
                };
            }

        } catch (error) {
            console.error(`Error getting usage for ${area} storage:`, error);
            throw error;
        }
    }

    /**
     * Check storage quota and warn if near limit
     */
    async checkQuota() {
        const usage = await this.getUsage('local');

        if (usage.percentage > this.quotaWarningThreshold * 100) {
            console.warn(`Storage usage at ${usage.percentage.toFixed(2)}%`);

            // Notify background script
            chrome.runtime.sendMessage({
                action: 'storage-warning',
                data: usage
            });

            // Try to clean up old data
            await this.cleanup();
        }
    }

    /**
     * Clean up old or unnecessary data
     */
    async cleanup() {
        try {
            // Get all data
            const allData = await this.get(null, 'local');

            // Identify old data (e.g., older than 30 days)
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const keysToRemove = [];

            Object.entries(allData).forEach(([key, value]) => {
                // Check if data has timestamp and is old
                if (value && typeof value === 'object' && value.timestamp) {
                    if (value.timestamp < thirtyDaysAgo) {
                        keysToRemove.push(key);
                    }
                }

                // Remove cached data that's not critical
                if (key.startsWith('cache_') || key.startsWith('temp_')) {
                    keysToRemove.push(key);
                }
            });

            if (keysToRemove.length > 0) {
                await this.remove(keysToRemove, 'local');
                console.log(`Cleaned up ${keysToRemove.length} old storage items`);
            }

        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    /**
     * Add listener for storage changes
     * @param {string} key - Key to watch (null for all)
     * @param {Function} callback - Callback function
     * @param {string} area - Storage area
     * @returns {Function} Unsubscribe function
     */
    onChange(key, callback, area = 'local') {
        const listenerId = `${area}:${key || '*'}:${Date.now()}`;

        this.listeners.set(listenerId, {
            key: key,
            callback: callback,
            area: area
        });

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listenerId);
        };
    }

    /**
     * Handle storage changes
     */
    handleStorageChange(changes, areaName) {
        this.listeners.forEach(listener => {
            if (listener.area !== areaName) return;

            // Check if this listener should be triggered
            if (listener.key === null || changes[listener.key]) {
                const relevantChanges = listener.key
                    ? { [listener.key]: changes[listener.key] }
                    : changes;

                listener.callback(relevantChanges, areaName);
            }
        });

        // Update cache
        Object.entries(changes).forEach(([key, change]) => {
            const cacheKey = `${areaName}:${key}`;
            if (change.newValue !== undefined) {
                this.cache.set(cacheKey, change.newValue);
            } else {
                this.cache.delete(cacheKey);
            }
        });
    }

    /**
     * Sync data between local and sync storage
     * @param {Array} keys - Keys to sync
     */
    async sync(keys) {
        try {
            // Get data from local storage
            const localData = await this.get(keys, 'local');

            // Check sync storage quota
            const syncQuota = await this.getUsage('sync');

            // Filter data that fits in sync storage
            const syncData = {};
            let totalSize = 0;

            for (const [key, value] of Object.entries(localData)) {
                const size = new Blob([JSON.stringify(value)]).size;

                if (size < syncQuota.quota.QUOTA_BYTES_PER_ITEM &&
                    totalSize + size < syncQuota.quota.QUOTA_BYTES) {
                    syncData[key] = value;
                    totalSize += size;
                } else {
                    console.warn(`Skipping ${key} from sync due to size constraints`);
                }
            }

            // Save to sync storage
            if (Object.keys(syncData).length > 0) {
                await this.set(syncData, 'sync');
            }

        } catch (error) {
            console.error('Error syncing data:', error);
        }
    }

    /**
     * Set up periodic sync
     */
    setupPeriodicSync() {
        // Sync important data every 5 minutes
        this.syncInterval = setInterval(() => {
            this.performPeriodicSync();
        }, 5 * 60 * 1000);
    }

    async performPeriodicSync() {
        if (this.pendingSync.size > 0) {
            await this.sync(Array.from(this.pendingSync));
            this.pendingSync.clear();
        }
    }

    /**
     * Mark keys for sync
     * @param {string|Array} keys - Keys to sync
     */
    markForSync(keys) {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => this.pendingSync.add(key));
    }

    /**
     * Export all data
     * @returns {Promise<Object>} All stored data
     */
    async exportAll() {
        const data = {
            local: await this.get(null, 'local'),
            sync: await this.get(null, 'sync'),
            timestamp: Date.now()
        };

        return data;
    }

    /**
     * Import data
     * @param {Object} data - Data to import
     * @param {boolean} merge - Whether to merge with existing data
     */
    async importData(data, merge = false) {
        try {
            if (!merge) {
                await this.clear('local');
                await this.clear('sync');
            }

            if (data.local) {
                await this.set(data.local, 'local');
            }

            if (data.sync) {
                await this.set(data.sync, 'sync');
            }

        } catch (error) {
            console.error('Error importing data:', error);
            throw error;
        }
    }

    /**
     * Get data with default value
     * @param {string} key - Storage key
     * @param {any} defaultValue - Default value if not found
     * @param {string} area - Storage area
     * @returns {Promise<any>} Value or default
     */
    async getWithDefault(key, defaultValue, area = 'local') {
        const result = await this.get(key, area);
        return result[key] !== undefined ? result[key] : defaultValue;
    }

    /**
     * Update existing data
     * @param {string} key - Storage key
     * @param {Function} updateFn - Update function
     * @param {string} area - Storage area
     */
    async update(key, updateFn, area = 'local') {
        const current = await this.getWithDefault(key, {}, area);
        const updated = await updateFn(current);
        await this.set({ [key]: updated }, area);
        return updated;
    }

    /**
     * Transaction-like operation
     * @param {Function} operation - Operation to perform
     * @returns {Promise<any>} Operation result
     */
    async transaction(operation) {
        if (this.isLocked) {
            console.error('Transaction failed: Another transaction is already in progress.');
            throw new Error('StorageManager is locked.');
        }

        this.isLocked = true;
        // Create backup
        const backup = await this.exportAll();

        try {
            const result = await operation(this);
            return result;
        } catch (error) {
            // Restore from backup on error
            console.error('Transaction failed, restoring backup:', error);
            await this.importData(backup, false);
            throw error;
        } finally {
            this.isLocked = false;
        }
    }

    /**
     * Destroy storage manager
     */
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        // Remove the listener to prevent memory leaks
        chrome.storage.onChanged.removeListener(this.storageChangeListener);

        this.cache.clear();
        this.listeners.clear();
        this.pendingSync.clear();
    }
}