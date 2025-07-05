export class Sidebar {
    constructor(container, editor) {
        this.container = container;
        this.editor = editor;
        this.panels = new Map();
        this.activePanelId = 'errors';
        
        this.initialize();
    }
    
    initialize() {
        this.createStructure();
        this.setupEventListeners();
        this.createPanels();
    }
    
    createStructure() {
        this.container.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-tabs">
                    <button class="sidebar-tab active" data-panel="errors">
                        <span class="tab-icon">⚠️</span>
                        <span class="tab-label">Issues</span>
                        <span class="tab-count" id="errors-count">0</span>
                    </button>
                    <button class="sidebar-tab" data-panel="stats">
                        <span class="tab-icon">📊</span>
                        <span class="tab-label">Stats</span>
                    </button>
                    <button class="sidebar-tab" data-panel="goals">
                        <span class="tab-icon">🎯</span>
                        <span class="tab-label">Goals</span>
                    </button>
                    <button class="sidebar-tab" data-panel="insights">
                        <span class="tab-icon">💡</span>
                        <span class="tab-label">Insights</span>
                    </button>
                </div>
            </div>
            <div class="sidebar-content">
                <div class="sidebar-panels"></div>
            </div>
        `;
        
        this.panelsContainer = this.container.querySelector('.sidebar-panels');
    }
    
    setupEventListeners() {
        // Tab clicks
        this.container.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchPanel(tab.dataset.panel);
            });
        });
        
        // Listen to editor events
        this.editor.on('errors-updated', (errors) => {
            this.updateErrorsPanel(errors);
            this.updateErrorsCount(errors.length);
        });
        
        this.editor.on('stats-updated', (stats) => {
            this.updateStatsPanel(stats);
        });
        
        this.editor.on('text-changed', () => {
            this.updateInsights();
        });
    }
    
    createPanels() {
        // Create Errors Panel
        const errorsPanel = this.createPanel('errors', `
            <div class="panel-header">
                <h3>Issues Found</h3>
                <div class="panel-actions">
                    <button class="btn-small" id="fix-all-btn">Fix All</button>
                    <button class="btn-small" id="filter-btn">Filter</button>
                </div>
            </div>
            <div class="filters-bar" id="filters-bar" style="display: none;">
                <label class="filter-item">
                    <input type="checkbox" value="spelling" checked>
                    <span class="filter-label spelling">Spelling</span>
                </label>
                <label class="filter-item">
                    <input type="checkbox" value="grammar" checked>
                    <span class="filter-label grammar">Grammar</span>
                </label>
                <label class="filter-item">
                    <input type="checkbox" value="punctuation" checked>
                    <span class="filter-label punctuation">Punctuation</span>
                </label>
                <label class="filter-item">
                    <input type="checkbox" value="style" checked>
                    <span class="filter-label style">Style</span>
                </label>
            </div>
            <div class="errors-container">
                <div id="errors-list" class="errors-list"></div>
            </div>
        `);
        
        // Create Stats Panel
        const statsPanel = this.createPanel('stats', `
            <div class="stats-panel" id="stats-content">
                <!-- Stats component will populate this -->
            </div>
        `);
        
        // Create Goals Panel
        const goalsPanel = this.createPanel('goals', `
            <div class="goals-panel" id="goals-content">
                <!-- Goals component will populate this -->
            </div>
        `);
        
        // Create Insights Panel
        const insightsPanel = this.createPanel('insights', `
            <div class="panel-header">
                <h3>Writing Insights</h3>
            </div>
            <div class="insights-container">
                <div id="insights-list" class="insights-list"></div>
            </div>
        `);
        
        // Setup panel-specific event handlers
        this.setupErrorsPanelEvents(errorsPanel);
        
        // Show initial panel
        this.showPanel('errors');
    }
    
    createPanel(id, content) {
        const panel = document.createElement('div');
        panel.className = 'sidebar-panel';
        panel.id = `panel-${id}`;
        panel.innerHTML = content;
        panel.style.display = 'none';
        
        this.panelsContainer.appendChild(panel);
        this.panels.set(id, panel);
        
        return panel;
    }
    
    switchPanel(panelId) {
        // Update tabs
        this.container.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panel === panelId);
        });
        
        // Show panel
        this.showPanel(panelId);
        
        // Trigger panel-specific updates
        this.onPanelSwitch(panelId);
    }
    
    showPanel(panelId) {
        this.panels.forEach((panel, id) => {
            panel.style.display = id === panelId ? 'block' : 'none';
        });
        this.activePanelId = panelId;
    }
    
    onPanelSwitch(panelId) {
        switch (panelId) {
            case 'errors':
                this.applyFilters();
                break;
            case 'stats':
                this.editor.statsComponent?.refresh();
                break;
            case 'goals':
                this.editor.goalsComponent?.refresh();
                break;
            case 'insights':
                this.updateInsights();
                break;
        }
    }
    
    setupErrorsPanelEvents(panel) {
        // Fix all button
        panel.querySelector('#fix-all-btn').addEventListener('click', () => {
            this.editor.applyAllCorrections();
        });
        
        // Filter button
        const filterBtn = panel.querySelector('#filter-btn');
        const filtersBar = panel.querySelector('#filters-bar');
        
        filterBtn.addEventListener('click', () => {
            const isVisible = filtersBar.style.display !== 'none';
            filtersBar.style.display = isVisible ? 'none' : 'flex';
            filterBtn.classList.toggle('active', !isVisible);
        });
        
        // Filter checkboxes
        filtersBar.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.applyFilters();
            });
        });
    }
    
    updateErrorsPanel(errors) {
        const errorsList = document.getElementById('errors-list');
        
        if (errors.length === 0) {
            errorsList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">✨</span>
                    <p>No issues found!</p>
                    <p class="empty-subtext">Your writing looks great.</p>
                </div>
            `;
            return;
        }
        
        // Group errors by type
        const groupedErrors = this.groupErrorsByType(errors);
        
        errorsList.innerHTML = Object.entries(groupedErrors)
            .map(([type, typeErrors]) => `
                <div class="error-group" data-type="${type}">
                    <div class="error-group-header">
                        <span class="error-type-icon ${type}"></span>
                        <span class="error-type-label">${this.getTypeLabel(type)}</span>
                        <span class="error-type-count">${typeErrors.length}</span>
                    </div>
                    <div class="error-group-items">
                        ${typeErrors.map((error, index) => this.renderErrorItem(error, index)).join('')}
                    </div>
                </div>
            `).join('');
        
        // Add event listeners to error items
        errorsList.querySelectorAll('.error-item').forEach(item => {
            item.addEventListener('click', () => {
                const errorId = item.dataset.errorId;
                this.editor.focusError(errorId);
            });
            
            item.querySelector('.error-fix-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const errorId = item.dataset.errorId;
                this.editor.applyCorrection(errorId);
            });
            
            item.querySelector('.error-ignore-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const errorId = item.dataset.errorId;
                this.editor.ignoreError(errorId);
                item.classList.add('ignored');
            });
        });
    }
    
    renderErrorItem(error, index) {
        return `
            <div class="error-item" data-error-id="${error.id}">
                <div class="error-content">
                    <div class="error-text">
                        <span class="error-original">${this.escapeHtml(error.original)}</span>
                        <span class="error-arrow">→</span>
                        <span class="error-suggestion">${this.escapeHtml(error.suggestion)}</span>
                    </div>
                    <div class="error-message">${this.escapeHtml(error.message)}</div>
                    <div class="error-context">"...${this.getErrorContext(error)}..."</div>
                </div>
                <div class="error-actions">
                    <button class="error-fix-btn" title="Apply correction">✓</button>
                    <button class="error-ignore-btn" title="Ignore">×</button>
                </div>
            </div>
        `;
    }
    
    getErrorContext(error) {
        const text = this.editor.getText();
        const start = Math.max(0, error.position - 20);
        const end = Math.min(text.length, error.position + error.length + 20);
        
        let context = text.substring(start, end);
        const errorText = text.substring(error.position, error.position + error.length);
        
        // Highlight the error in context
        context = context.replace(
            errorText,
            `<mark>${errorText}</mark>`
        );
        
        return context;
    }
    
    groupErrorsByType(errors) {
        return errors.reduce((groups, error) => {
            if (!groups[error.type]) {
                groups[error.type] = [];
            }
            groups[error.type].push(error);
            return groups;
        }, {});
    }
    
    getTypeLabel(type) {
        const labels = {
            'spelling': 'Spelling',
            'grammar': 'Grammar',
            'punctuation': 'Punctuation',
            'style': 'Style',
            'capitalization': 'Capitalization'
        };
        return labels[type] || type;
    }
    
    applyFilters() {
        const activeFilters = Array.from(
            document.querySelectorAll('#filters-bar input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        
        document.querySelectorAll('.error-group').forEach(group => {
            const type = group.dataset.type;
            group.style.display = activeFilters.includes(type) ? 'block' : 'none';
        });
    }
    
    updateErrorsCount(count) {
        document.getElementById('errors-count').textContent = count;
        
        // Update tab styling based on count
        const errorsTab = document.querySelector('[data-panel="errors"]');
        errorsTab.classList.toggle('has-errors', count > 0);
        errorsTab.classList.toggle('no-errors', count === 0);
    }
    
    updateStatsPanel(stats) {
        // This will be handled by the Stats component
        if (this.editor.statsComponent) {
            this.editor.statsComponent.update(stats);
        }
    }
    
    updateInsights() {
        const insightsList = document.getElementById('insights-list');
        const insights = this.generateInsights();
        
        if (insights.length === 0) {
            insightsList.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <p>Keep writing to see insights!</p>
                </div>
            `;
            return;
        }
        
        insightsList.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.message}</p>
                    ${insight.action ? `
                        <button class="insight-action" data-action="${insight.action}">
                            ${insight.actionLabel}
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        // Add action handlers
        insightsList.querySelectorAll('.insight-action').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleInsightAction(btn.dataset.action);
            });
        });
    }
    
    generateInsights() {
        const text = this.editor.getText();
        const stats = this.editor.getStats();
        const insights = [];
        
        // Readability insight
        const readabilityScore = this.calculateReadability(text);
        if (readabilityScore < 60) {
            insights.push({
                type: 'warning',
                icon: '📖',
                title: 'Readability',
                message: 'Your text might be difficult to read. Try using shorter sentences.',
                action: 'improve-readability',
                actionLabel: 'Show suggestions'
            });
        }
        
        // Sentence variety
        if (stats.sentences > 5) {
            const avgSentenceLength = stats.words / stats.sentences;
            if (avgSentenceLength > 25) {
                insights.push({
                    type: 'tip',
                    icon: '✂️',
                    title: 'Long sentences',
                    message: 'Some sentences are quite long. Consider breaking them up for better clarity.',
                    action: 'highlight-long-sentences',
                    actionLabel: 'Show me'
                });
            }
        }
        
        // Passive voice
        const passiveCount = this.countPassiveVoice(text);
        if (passiveCount > stats.sentences * 0.2) {
            insights.push({
                type: 'suggestion',
                icon: '💪',
                title: 'Active voice',
                message: `${passiveCount} sentences use passive voice. Active voice is usually stronger.`,
                action: 'fix-passive-voice',
                actionLabel: 'Fix passive voice'
            });
        }
        
        // Vocabulary variety
        const uniqueWords = new Set(text.toLowerCase().split(/\s+/));
        const vocabScore = (uniqueWords.size / stats.words) * 100;
        if (vocabScore < 50 && stats.words > 100) {
            insights.push({
                type: 'tip',
                icon: '📚',
                title: 'Vocabulary',
                message: 'Try using more varied vocabulary to make your writing more engaging.',
                action: 'suggest-synonyms',
                actionLabel: 'Suggest alternatives'
            });
        }
        
        // Tone consistency
        const toneAnalysis = this.analyzeTone(text);
        if (toneAnalysis.inconsistent) {
            insights.push({
                type: 'warning',
                icon: '🎭',
                title: 'Tone consistency',
                message: 'Your tone seems to vary. Consider maintaining a consistent voice.',
                action: 'analyze-tone',
                actionLabel: 'See analysis'
            });
        }
        
        // Positive feedback
        if (stats.score >= 90) {
            insights.push({
                type: 'success',
                icon: '🌟',
                title: 'Great writing!',
                message: 'Your text is clear, well-structured, and error-free. Keep it up!'
            });
        }
        
        return insights;
    }
    
    calculateReadability(text) {
        // Simplified Flesch Reading Ease score
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const syllables = words.reduce((count, word) => {
            return count + this.countSyllables(word);
        }, 0);
        
        if (sentences.length === 0 || words.length === 0) return 100;
        
        const avgWordsPerSentence = words.length / sentences.length;
        const avgSyllablesPerWord = syllables / words.length;
        
        // Flesch Reading Ease formula
        const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
        
        return Math.max(0, Math.min(100, score));
    }
    
    countSyllables(word) {
        // Simple syllable counting
        word = word.toLowerCase();
        let count = 0;
        let previousWasVowel = false;
        
        for (let i = 0; i < word.length; i++) {
            const isVowel = /[aeiou]/.test(word[i]);
            if (isVowel && !previousWasVowel) {
                count++;
            }
            previousWasVowel = isVowel;
        }
        
        // Adjust for silent e
        if (word.endsWith('e')) {
            count--;
        }
        
        // Ensure at least one syllable
        return Math.max(1, count);
    }
    
    countPassiveVoice(text) {
        // Simple passive voice detection
        const passiveIndicators = [
            /\b(is|are|was|were|been|being)\s+\w+ed\b/gi,
            /\b(is|are|was|were|been|being)\s+\w+en\b/gi
        ];
        
        let count = 0;
        passiveIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                count += matches.length;
            }
        });
        
        return count;
    }
    
    analyzeTone(text) {
        // Simple tone analysis
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const tones = sentences.map(sentence => this.detectSentenceTone(sentence));
        
        // Check for consistency
        const uniqueTones = new Set(tones);
        const inconsistent = uniqueTones.size > 2 && sentences.length > 5;
        
        return {
            inconsistent,
            dominantTone: this.getMostFrequent(tones),
            tones: Array.from(uniqueTones)
        };
    }
    
    detectSentenceTone(sentence) {
        // Simple tone detection based on keywords and patterns
        const formal = /\b(therefore|furthermore|however|moreover|nonetheless)\b/i;
        const informal = /\b(gonna|wanna|gotta|kinda|sorta)\b/i;
        const positive = /\b(great|excellent|wonderful|amazing|fantastic)\b/i;
        const negative = /\b(terrible|awful|horrible|bad|poor)\b/i;
        
        if (formal.test(sentence)) return 'formal';
        if (informal.test(sentence)) return 'informal';
        if (positive.test(sentence)) return 'positive';
        if (negative.test(sentence)) return 'negative';
        
        return 'neutral';
    }
    
    getMostFrequent(array) {
        const counts = {};
        array.forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });
        
        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)[0][0];
    }
    
    handleInsightAction(action) {
        switch (action) {
            case 'improve-readability':
                this.showReadabilityTips();
                break;
            case 'highlight-long-sentences':
                this.editor.highlightLongSentences();
                break;
            case 'fix-passive-voice':
                this.editor.suggestActiveVoice();
                break;
            case 'suggest-synonyms':
                this.editor.showSynonymSuggestions();
                break;
            case 'analyze-tone':
                this.showToneAnalysis();
                break;
        }
    }
    
    showReadabilityTips() {
        const modal = document.createElement('div');
        modal.className = 'modal readability-tips';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Readability Tips</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <h4>To improve readability:</h4>
                    <ul>
                        <li>Use shorter sentences (aim for 15-20 words)</li>
                        <li>Choose simple words over complex ones</li>
                        <li>Break up long paragraphs</li>
                        <li>Use active voice</li>
                        <li>Add transition words</li>
                    </ul>
                    <h4>Current metrics:</h4>
                    <div class="readability-metrics">
                        ${this.getReadabilityMetrics()}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    getReadabilityMetrics() {
        const text = this.editor.getText();
        const stats = this.editor.getStats();
        const score = this.calculateReadability(text);
        
        return `
            <div class="metric">
                <span class="metric-label">Reading ease:</span>
                <span class="metric-value ${this.getScoreClass(score)}">${Math.round(score)}/100</span>
            </div>
            <div class="metric">
                <span class="metric-label">Avg sentence length:</span>
                <span class="metric-value">${Math.round(stats.words / stats.sentences)} words</span>
            </div>
            <div class="metric">
                <span class="metric-label">Complex words:</span>
                <span class="metric-value">${this.countComplexWords(text)} (${this.getComplexWordPercentage(text)}%)</span>
            </div>
        `;
    }
    
    getScoreClass(score) {
        if (score >= 70) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    }
    
    countComplexWords(text) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        return words.filter(word => this.countSyllables(word) >= 3).length;
    }
    
    getComplexWordPercentage(text) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const complexCount = this.countComplexWords(text);
        return Math.round((complexCount / words.length) * 100);
    }
    
    showToneAnalysis() {
        const analysis = this.analyzeTone(this.editor.getText());
        
        const modal = document.createElement('div');
        modal.className = 'modal tone-analysis';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Tone Analysis</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="tone-summary">
                        <h4>Dominant tone: <span class="tone-badge ${analysis.dominantTone}">${analysis.dominantTone}</span></h4>
                        <p>Detected tones: ${analysis.tones.map(tone => 
                            `<span class="tone-badge ${tone}">${tone}</span>`
                        ).join(' ')}</p>
                    </div>
                    <div class="tone-recommendation">
                        ${analysis.inconsistent ? `
                            <div class="warning-box">
                                <p>⚠️ Your text shows varying tones, which might confuse readers.</p>
                                <p>Consider maintaining a consistent ${analysis.dominantTone} tone throughout.</p>
                            </div>
                        ` : `
                            <div class="success-box">
                                <p>✅ Your tone is consistent!</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    destroy() {
        // Clean up event listeners and DOM
        this.container.innerHTML = '';
        this.panels.clear();
    }
}