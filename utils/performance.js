export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.timers = new Map();
        this.observers = new Map();
        this.thresholds = {
            longTask: 50, // ms
            slowNetwork: 3000, // ms
            highMemory: 100 * 1024 * 1024, // 100MB
            lowFPS: 30
        };
    }
    
    /**
     * Start timing an operation
     * @param {string} label - Operation label
     */
    startTimer(label) {
        this.timers.set(label, {
            start: performance.now(),
            marks: []
        });
    }
    
    /**
     * Add a mark to an existing timer
     * @param {string} label - Timer label
     * @param {string} mark - Mark name
     */
    mark(label, mark) {
        const timer = this.timers.get(label);
        if (timer) {
            timer.marks.push({
                name: mark,
                time: performance.now() - timer.start
            });
        }
    }
    
    /**
     * End timing and record the result
     * @param {string} label - Operation label
     * @returns {number} Duration in ms
     */
    endTimer(label) {
        const timer = this.timers.get(label);
        if (!timer) return 0;
        
        const duration = performance.now() - timer.start;
        
        // Store metric
        if (!this.metrics.has(label)) {
            this.metrics.set(label, {
                count: 0,
                total: 0,
                min: Infinity,
                max: 0,
                average: 0,
                marks: []
            });
        }
        
        const metric = this.metrics.get(label);
        metric.count++;
        metric.total += duration;
        metric.min = Math.min(metric.min, duration);
        metric.max = Math.max(metric.max, duration);
        metric.average = metric.total / metric.count;
        
        if (timer.marks.length > 0) {
            metric.marks = timer.marks;
        }
        
        this.timers.delete(label);
        
        // Check if it's a long task
        if (duration > this.thresholds.longTask) {
            this.reportLongTask(label, duration);
        }
        
        return duration;
    }
    
    /**
     * Measure a function's execution time
     * @param {Function} fn - Function to measure
     * @param {string} label - Label for the measurement
     * @returns {any} Function result
     */
    async measure(fn, label) {
        this.startTimer(label);
        try {
            const result = await fn();
            this.endTimer(label);
            return result;
        } catch (error) {
            this.endTimer(label);
            throw error;
        }
    }
    
    /**
     * Report a long task
     * @param {string} label - Task label
     * @param {number} duration - Duration in ms
     */
    reportLongTask(label, duration) {
        console.warn(`Long task detected: ${label} took ${duration.toFixed(2)}ms`);
        
        // Send to analytics if needed
        if (window.chrome && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'performance-warning',
                data: {
                    type: 'long-task',
                    label: label,
                    duration: duration
                }
            });
        }
    }
    
    /**
     * Monitor memory usage
     * @param {Function} callback - Callback when threshold exceeded
     * @param {number} interval - Check interval in ms
     */
    monitorMemory(callback, interval = 5000) {
        if (!performance.memory) {
            console.warn('Memory monitoring not supported');
            return null;
        }
        
        const checkMemory = () => {
            const used = performance.memory.usedJSHeapSize;
            const total = performance.memory.totalJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            
            const usage = {
                used: used,
                total: total,
                limit: limit,
                percentage: (used / limit) * 100
            };
            
            if (used > this.thresholds.highMemory) {
                callback({
                    type: 'high-memory',
                    usage: usage
                });
            }
            
            return usage;
        };
        
        // Check immediately
        const initialUsage = checkMemory();
        
        // Set up periodic monitoring
        const intervalId = setInterval(checkMemory, interval);
        
        this.observers.set('memory', { id: intervalId, type: 'interval' });
        
        return initialUsage;
    }
    
    /**
     * Monitor frame rate (FPS)
     * @param {Function} callback - Callback when FPS drops
     */
    monitorFPS(callback) {
        let lastTime = performance.now();
        let frames = 0;
        let fps = 0;
        
        const calculateFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                fps = Math.round((frames * 1000) / (currentTime - lastTime));
                
                if (fps < this.thresholds.lowFPS && fps > 0) {
                    callback({
                        type: 'low-fps',
                        fps: fps
                    });
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(calculateFPS);
        };
        
        const rafId = requestAnimationFrame(calculateFPS);
        this.observers.set('fps', { id: rafId, type: 'animationFrame' });
        
        return () => {
            cancelAnimationFrame(rafId);
            this.observers.delete('fps');
        };
    }
    
    /**
     * Monitor network requests
     * @param {Function} callback - Callback for slow requests
     */
    monitorNetwork(callback) {
        if (!window.PerformanceObserver) {
            console.warn('PerformanceObserver not supported');
            return;
        }
        
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'resource') {
                    const duration = entry.duration;
                    
                    if (duration > this.thresholds.slowNetwork) {
                        callback({
                            type: 'slow-network',
                            url: entry.name,
                            duration: duration,
                            size: entry.transferSize
                        });
                    }
                }
            }
        });
        
        observer.observe({ entryTypes: ['resource'] });
        this.observers.set('network', { observer, type: 'performance' });
    }
    
    /**
     * Observe Largest Contentful Paint (LCP)
     * @param {Function} [callback]
     */
    observeLCP(callback) {
        if (!window.PerformanceObserver) {
            console.warn('PerformanceObserver not supported, cannot observe LCP.');
            return;
        }
        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
                const lcpEntry = entries[entries.length - 1]; // The last one is the LCP
                this.metrics.set('lcp', lcpEntry.startTime);
                if (callback) callback(lcpEntry);
            }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        this.observers.set('lcp', { observer, type: 'performance' });
    }

    /**
     * Observe First Input Delay (FID)
     * @param {Function} [callback]
     */
    observeFID(callback) {
        if (!window.PerformanceObserver) {
            console.warn('PerformanceObserver not supported, cannot observe FID.');
            return;
        }
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const fid = entry.processingStart - entry.startTime;
                this.metrics.set('fid', fid);
                if (callback) callback(entry);
                // FID is only reported once, so we can disconnect
                observer.disconnect(); 
                this.observers.delete('fid');
            }
        });
        observer.observe({ type: 'first-input', buffered: true });
        this.observers.set('fid', { observer, type: 'performance' });
    }

    /**
     * Observe long tasks that block the main thread.
     * @param {Function} [callback] - Callback for long tasks
     */
    observeLongTasks(callback) {
        if (!window.PerformanceObserver) {
            console.warn('PerformanceObserver not supported, cannot observe long tasks.');
            return;
        }

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (callback) {
                    callback({
                        type: 'long-task-native',
                        duration: entry.duration,
                        attribution: entry.attribution,
                    });
                }
            }
        });

        observer.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', { observer, type: 'performance' });
    }
    
    /**
     * Get performance metrics summary
     * @returns {Object} Metrics summary
     */
    getMetrics() {
        const summary = {
            operations: {},
            memory: null,
            rendering: null
        };
        
        // Operation metrics
        this.metrics.forEach((metric, label) => {
            summary.operations[label] = {
                count: metric.count,
                average: metric.average.toFixed(2),
                min: metric.min.toFixed(2),
                max: metric.max.toFixed(2),
                total: metric.total.toFixed(2)
            };
        });
        
        // Memory metrics
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const total = performance.memory.totalJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            
            summary.memory = {
                used: this.formatBytes(used),
                total: this.formatBytes(total),
                limit: this.formatBytes(limit),
                percentage: ((used / limit) * 100).toFixed(2) + '%'
            };
        }
        
        // Rendering metrics
        if (performance.getEntriesByType) {
            const paintEntries = performance.getEntriesByType('paint');
            summary.rendering = {
                firstPaint: null,
                firstContentfulPaint: null
            };
            
            paintEntries.forEach(entry => {
                if (entry.name === 'first-paint') {
                    summary.rendering.firstPaint = entry.startTime.toFixed(2);
                } else if (entry.name === 'first-contentful-paint') {
                    summary.rendering.firstContentfulPaint = entry.startTime.toFixed(2);
                }
            });
        }
        
        // Add LCP and FID from metrics map
        if (this.metrics.has('lcp')) {
            if (!summary.rendering) summary.rendering = {};
            summary.rendering.largestContentfulPaint = this.metrics.get('lcp').toFixed(2);
        }
        if (this.metrics.has('fid')) {
            if (!summary.rendering) summary.rendering = {};
            summary.rendering.firstInputDelay = this.metrics.get('fid').toFixed(2);
        }
        
        return summary;
    }
    
    /**
     * Create a performance report
     * @returns {string} HTML report
     */
    generateReport() {
        const metrics = this.getMetrics();
        
        let report = '<div class="performance-report">';
        report += '<h2>Performance Report</h2>';
        
        // Operations
        report += '<h3>Operations</h3>';
        report += '<table>';
        report += '<tr><th>Operation</th><th>Count</th><th>Avg (ms)</th><th>Min (ms)</th><th>Max (ms)</th></tr>';
        
        Object.entries(metrics.operations).forEach(([label, data]) => {
            report += `<tr>
                <td>${label}</td>
                <td>${data.count}</td>
                <td>${data.average}</td>
                <td>${data.min}</td>
                <td>${data.max}</td>
            </tr>`;
        });
        
        report += '</table>';
        
        // Memory
        if (metrics.memory) {
            report += '<h3>Memory Usage</h3>';
            report += `<p>Used: ${metrics.memory.used} (${metrics.memory.percentage})</p>`;
            report += `<p>Total: ${metrics.memory.total}</p>`;
            report += `<p>Limit: ${metrics.memory.limit}</p>`;
        }
        
        // Rendering
        if (metrics.rendering) {
            report += '<h3>Rendering</h3>';
            report += `<p>First Paint: ${metrics.rendering.firstPaint || 'N/A'} ms</p>`;
            report += `<p>First Contentful Paint: ${metrics.rendering.firstContentfulPaint || 'N/A'} ms</p>`;
            report += `<p>Largest Contentful Paint: ${metrics.rendering.largestContentfulPaint || 'N/A'} ms</p>`;
            report += `<p>First Input Delay: ${metrics.rendering.firstInputDelay || 'N/A'} ms</p>`;
        }
        
        report += '</div>';
        
        return report;
    }
    
    /**
     * Export metrics as JSON
     * @returns {string} JSON string
     */
    exportMetrics() {
        const metrics = this.getMetrics();
        return JSON.stringify(metrics, null, 2);
    }
    
    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.clear();
        this.timers.clear();
    }
    
    /**
     * Stop all monitoring
     */
    stopAllMonitoring() {
        this.observers.forEach((data) => {
            switch (data.type) {
                case 'interval':
                    clearInterval(data.id);
                    break;
                case 'animationFrame':
                    cancelAnimationFrame(data.id);
                    break;
                case 'performance':
                    if (data.observer) data.observer.disconnect();
                    break;
            }
        });
        
        this.observers.clear();
    }
    
    /**
     * Reset and stop all monitoring.
     */
    destroy() {
        this.stopAllMonitoring();
        this.reset();
    }
    
    /**
     * Format bytes to human readable string
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        
        const debounced = (...args) => {
            const later = () => {
                timeout = null;
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
        
        debounced.cancel = () => {
            clearTimeout(timeout);
            timeout = null;
        };
        
        return debounced;
    }
    
    /**
     * Throttle a function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        let lastResult;
        
        return (...args) => {
            if (!inThrottle) {
                inThrottle = true;
                lastResult = func(...args);
                
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
            
            return lastResult;
        };
    }
    
    /**
     * Profile a specific operation
     * @param {string} label - Operation label
     * @param {Function} operation - Operation to profile
     * @param {number} iterations - Number of iterations
     * @returns {Object} Profiling results
     */
    async profile(label, operation, iterations = 100) {
        const results = [];
        
        // Warm up
        for (let i = 0; i < 10; i++) {
            await operation();
        }
        
        // Actual profiling
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await operation();
            const end = performance.now();
            results.push(end - start);
        }
        
        // Calculate statistics
        const sorted = results.sort((a, b) => a - b);
        const sum = sorted.reduce((a, b) => a + b, 0);
        
        return {
            label: label,
            iterations: iterations,
            average: sum / iterations,
            median: sorted[Math.floor(iterations / 2)],
            min: sorted[0],
            max: sorted[iterations - 1],
            p95: sorted[Math.floor(iterations * 0.95)],
            p99: sorted[Math.floor(iterations * 0.99)]
        };
    }
}