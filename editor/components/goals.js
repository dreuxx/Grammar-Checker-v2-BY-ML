export class GoalsComponent {
    constructor(container, editor) {
        this.container = container;
        this.editor = editor;
        this.goals = {
            tone: 'neutral',
            audience: 'general',
            intent: 'inform',
            custom: {
                wordCount: null,
                readingLevel: null,
                keywords: []
            }
        };
        
        this.initialize();
    }
    
    async initialize() {
        await this.loadGoals();
        this.render();
        this.setupEventListeners();
        this.analyzeAlignment();
    }
    
    async loadGoals() {
        const response = await chrome.runtime.sendMessage({ action: 'get-settings' });
        if (response && response.goals) {
            this.goals = { ...this.goals, ...response.goals };
        }
    }
    
    render() {
        this.container.innerHTML = `
            <div class="goals-component">
                <div class="goals-header">
                    <h3>Writing Goals</h3>
                    <button class="save-goals-btn" title="Save goals">💾</button>
                </div>
                
                <div class="goal-section">
                    <h4>Tone</h4>
                    <p class="goal-description">How do you want to sound?</p>
                    <div class="goal-options">
                        <label class="goal-option">
                            <input type="radio" name="tone" value="formal">
                            <div class="option-card">
                                <span class="option-icon">🎩</span>
                                <span class="option-label">Formal</span>
                                <span class="option-desc">Professional, academic</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="tone" value="neutral">
                            <div class="option-card">
                                <span class="option-icon">📝</span>
                                <span class="option-label">Neutral</span>
                                <span class="option-desc">Balanced, versatile</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="tone" value="informal">
                            <div class="option-card">
                                <span class="option-icon">💬</span>
                                <span class="option-label">Informal</span>
                                <span class="option-desc">Casual, conversational</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div class="goal-section">
                    <h4>Audience</h4>
                    <p class="goal-description">Who are you writing for?</p>
                    <div class="goal-options">
                        <label class="goal-option">
                            <input type="radio" name="audience" value="general">
                            <div class="option-card">
                                <span class="option-icon">👥</span>
                                <span class="option-label">General</span>
                                <span class="option-desc">Wide audience</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="audience" value="academic">
                            <div class="option-card">
                                <span class="option-icon">🎓</span>
                                <span class="option-label">Academic</span>
                                <span class="option-desc">Scholarly, research</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="audience" value="business">
                            <div class="option-card">
                                <span class="option-icon">💼</span>
                                <span class="option-label">Business</span>
                                <span class="option-desc">Professional, corporate</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="audience" value="creative">
                            <div class="option-card">
                                <span class="option-icon">🎨</span>
                                <span class="option-label">Creative</span>
                                <span class="option-desc">Artistic, expressive</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div class="goal-section">
                    <h4>Intent</h4>
                    <p class="goal-description">What's your purpose?</p>
                    <div class="goal-options">
                        <label class="goal-option">
                            <input type="radio" name="intent" value="inform">
                            <div class="option-card">
                                <span class="option-icon">📖</span>
                                <span class="option-label">Inform</span>
                                <span class="option-desc">Educate, explain</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="intent" value="convince">
                            <div class="option-card">
                                <span class="option-icon">💪</span>
                                <span class="option-label">Convince</span>
                                <span class="option-desc">Persuade, argue</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="intent" value="describe">
                            <div class="option-card">
                                <span class="option-icon">🖼️</span>
                                <span class="option-label">Describe</span>
                                <span class="option-desc">Paint pictures</span>
                            </div>
                        </label>
                        <label class="goal-option">
                            <input type="radio" name="intent" value="entertain">
                            <div class="option-card">
                                <span class="option-icon">🎭</span>
                                <span class="option-label">Entertain</span>
                                <span class="option-desc">Engage, amuse</span>
                            </div>
                        </label>
                    </div>
                </div>
                
                <div class="goal-section">
                    <h4>Custom Goals</h4>
                    <p class="goal-description">Set specific targets</p>
                    <div class="custom-goals">
                        <div class="custom-goal-item">
                            <label>Word count target:</label>
                            <input type="number" id="word-count-goal" placeholder="e.g., 1000" min="0">
                            <span class="goal-status" id="word-count-status"></span>
                        </div>
                        <div class="custom-goal-item">
                            <label>Reading level:</label>
                            <select id="reading-level-goal">
                                <option value="">No target</option>
                                <option value="elementary">Elementary (Grade 1-5)</option>
                                <option value="middle">Middle School (Grade 6-8)</option>
                                <option value="high">High School (Grade 9-12)</option>
                                <option value="college">College</option>
                            </select>
                            <span class="goal-status" id="reading-level-status"></span>
                        </div>
                        <div class="custom-goal-item">
                            <label>Keywords to include:</label>
                            <div class="keyword-input-container">
                                <input type="text" id="keyword-input" placeholder="Add keyword...">
                                <button class="add-keyword-btn">+</button>
                            </div>
                            <div class="keywords-list" id="keywords-list"></div>
                        </div>
                    </div>
                </div>
                
                <div class="alignment-section">
                    <h4>Goal Alignment</h4>
                    <div class="alignment-meter">
                        <div class="alignment-bar">
                            <div class="alignment-fill" id="alignment-fill"></div>
                        </div>
                        <div class="alignment-label" id="alignment-label">Checking alignment...</div>
                    </div>
                    <div class="alignment-feedback" id="alignment-feedback"></div>
                </div>
                
                <div class="suggestions-section">
                    <h4>Suggestions</h4>
                    <div class="suggestions-list" id="suggestions-list">
                        <div class="empty-state">Set your goals to see suggestions</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Goal selections
        this.container.querySelectorAll('input[type="radio"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateGoal(e.target.name, e.target.value);
            });
        });
        
        // Custom goals
        const wordCountInput = this.container.querySelector('#word-count-goal');
        wordCountInput.addEventListener('input', (e) => {
            this.goals.custom.wordCount = e.target.value ? parseInt(e.target.value) : null;
            this.updateWordCountStatus();
            this.analyzeAlignment();
        });
        
        const readingLevelSelect = this.container.querySelector('#reading-level-goal');
        readingLevelSelect.addEventListener('change', (e) => {
            this.goals.custom.readingLevel = e.target.value || null;
            this.updateReadingLevelStatus();
            this.analyzeAlignment();
        });
        
        // Keywords
        const keywordInput = this.container.querySelector('#keyword-input');
        const addKeywordBtn = this.container.querySelector('.add-keyword-btn');
        
        const addKeyword = () => {
            const keyword = keywordInput.value.trim();
            if (keyword && !this.goals.custom.keywords.includes(keyword)) {
                this.goals.custom.keywords.push(keyword);
                keywordInput.value = '';
                this.updateKeywordsList();
                this.analyzeAlignment();
            }
        };
        
        addKeywordBtn.addEventListener('click', addKeyword);
        keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addKeyword();
            }
        });
        
        // Save button
        this.container.querySelector('.save-goals-btn').addEventListener('click', () => {
            this.saveGoals();
        });
        
        // Listen to editor changes
        this.editor.on('text-changed', () => {
            this.analyzeAlignment();
        });
        
        // Set initial values
        this.applyGoalsToUI();
    }
    
    applyGoalsToUI() {
        // Set radio buttons
        const toneInput = this.container.querySelector(`input[name="tone"][value="${this.goals.tone}"]`);
        if (toneInput) toneInput.checked = true;
        
        const audienceInput = this.container.querySelector(`input[name="audience"][value="${this.goals.audience}"]`);
        if (audienceInput) audienceInput.checked = true;
        
        const intentInput = this.container.querySelector(`input[name="intent"][value="${this.goals.intent}"]`);
        if (intentInput) intentInput.checked = true;
        
        // Set custom goals
        if (this.goals.custom.wordCount) {
            this.container.querySelector('#word-count-goal').value = this.goals.custom.wordCount;
        }
        
        if (this.goals.custom.readingLevel) {
            this.container.querySelector('#reading-level-goal').value = this.goals.custom.readingLevel;
        }
        
        this.updateKeywordsList();
    }
    
    updateGoal(type, value) {
        this.goals[type] = value;
        this.analyzeAlignment();
        this.generateSuggestions();
    }
    
    updateWordCountStatus() {
        const status = this.container.querySelector('#word-count-status');
        if (!this.goals.custom.wordCount) {
            status.textContent = '';
            return;
        }
        
        const currentWords = this.editor.getStats().words;
        const target = this.goals.custom.wordCount;
        const percentage = Math.round((currentWords / target) * 100);
        
        status.textContent = `${currentWords}/${target} (${percentage}%)`;
        status.className = 'goal-status';
        
        if (percentage >= 90 && percentage <= 110) {
            status.classList.add('good');
        } else if (percentage >= 70 && percentage <= 130) {
            status.classList.add('warning');
        } else {
            status.classList.add('poor');
        }
    }
    
    updateReadingLevelStatus() {
        const status = this.container.querySelector('#reading-level-status');
        if (!this.goals.custom.readingLevel) {
            status.textContent = '';
            return;
        }
        
        const currentLevel = this.getReadingLevel();
        const targetLevel = this.goals.custom.readingLevel;
        
        status.textContent = `Current: ${currentLevel}`;
        status.className = 'goal-status';
        
        if (this.isReadingLevelMatch(currentLevel, targetLevel)) {
            status.classList.add('good');
        } else {
            status.classList.add('warning');
        }
    }
    
    updateKeywordsList() {
        const container = this.container.querySelector('#keywords-list');
        
        if (this.goals.custom.keywords.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = this.goals.custom.keywords.map(keyword => {
            const isUsed = this.isKeywordUsed(keyword);
            return `
                <div class="keyword-tag ${isUsed ? 'used' : 'unused'}">
                    <span>${keyword}</span>
                    <button class="remove-keyword" data-keyword="${keyword}">×</button>
                </div>
            `;
        }).join('');
        
        // Add remove handlers
        container.querySelectorAll('.remove-keyword').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const keyword = e.target.dataset.keyword;
                this.goals.custom.keywords = this.goals.custom.keywords.filter(k => k !== keyword);
                this.updateKeywordsList();
                this.analyzeAlignment();
            });
        });
    }
    
    isKeywordUsed(keyword) {
        const text = this.editor.getText().toLowerCase();
        return text.includes(keyword.toLowerCase());
    }
    
    analyzeAlignment() {
        const alignment = {
            tone: this.analyzeToneAlignment(),
            audience: this.analyzeAudienceAlignment(),
            intent: this.analyzeIntentAlignment(),
            wordCount: this.analyzeWordCountAlignment(),
            readingLevel: this.analyzeReadingLevelAlignment(),
            keywords: this.analyzeKeywordsAlignment()
        };
        
        // Calculate overall alignment
        const scores = Object.values(alignment).filter(score => score !== null);
        const overallScore = scores.length > 0 
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : 0;
        
        // Update UI
        this.updateAlignmentMeter(overallScore);
        this.updateAlignmentFeedback(alignment);
        this.generateSuggestions();
        
        // Update custom goal statuses
        this.updateWordCountStatus();
        this.updateReadingLevelStatus();
    }
    
    analyzeToneAlignment() {
        const text = this.editor.getText();
        if (text.length < 50) return null;
        
        const toneIndicators = {
            formal: {
                words: /\b(therefore|furthermore|however|moreover|nonetheless|consequently|subsequently)\b/gi,
                score: 0
            },
            neutral: {
                words: /\b(also|because|but|so|then|now|here)\b/gi,
                score: 0
            },
            informal: {
                words: /\b(gonna|wanna|gotta|kinda|sorta|yeah|cool|awesome)\b/gi,
                score: 0
            }
        };
        
        // Count indicators
        Object.entries(toneIndicators).forEach(([tone, indicator]) => {
            const matches = text.match(indicator.words) || [];
            indicator.score = matches.length;
        });
        
        // Compare with goal
        const currentTone = Object.entries(toneIndicators)
            .sort(([,a], [,b]) => b.score - a.score)[0][0];
            
        return currentTone === this.goals.tone ? 100 : 50;
    }
    
    analyzeAudienceAlignment() {
        const text = this.editor.getText();
        if (text.length < 50) return null;
        
        const audienceIndicators = {
            general: { avgWordLength: 5, sentenceLength: 15 },
            academic: { avgWordLength: 6, sentenceLength: 20 },
            business: { avgWordLength: 5.5, sentenceLength: 18 },
            creative: { avgWordLength: 4.5, sentenceLength: 12 }
        };
        
        const stats = this.editor.getStats();
        const avgWordLength = this.calculateAverageWordLength(text);
        const avgSentenceLength = stats.sentences > 0 ? stats.words / stats.sentences : 0;
        
        const target = audienceIndicators[this.goals.audience];
        const wordLengthDiff = Math.abs(avgWordLength - target.avgWordLength);
        const sentenceLengthDiff = Math.abs(avgSentenceLength - target.sentenceLength);
        
        const score = Math.max(0, 100 - (wordLengthDiff * 10) - (sentenceLengthDiff * 2));
        return Math.round(score);
    }
    
    analyzeIntentAlignment() {
        const text = this.editor.getText();
        if (text.length < 50) return null;
        
        const intentIndicators = {
            inform: /\b(explains?|describes?|shows?|demonstrates?|indicates?)\b/gi,
            convince: /\b(should|must|need|important|essential|crucial|believe)\b/gi,
            describe: /\b(looks?|sounds?|feels?|appears?|seems?|beautiful|wonderful)\b/gi,
            entertain: /\b(funny|amusing|hilarious|exciting|thrilling|surprising)\b/gi
        };
        
        const pattern = intentIndicators[this.goals.intent];
        const matches = text.match(pattern) || [];
        
        // Score based on frequency
        const wordsPerMatch = stats.words / (matches.length || 1);
        if (wordsPerMatch < 50) return 100;
        if (wordsPerMatch < 100) return 75;
        if (wordsPerMatch < 200) return 50;
        return 25;
    }
    
    analyzeWordCountAlignment() {
        if (!this.goals.custom.wordCount) return null;
        
        const current = this.editor.getStats().words;
        const target = this.goals.custom.wordCount;
        const percentage = (current / target) * 100;
        
        if (percentage >= 90 && percentage <= 110) return 100;
        if (percentage >= 70 && percentage <= 130) return 75;
        if (percentage >= 50 && percentage <= 150) return 50;
        return 25;
    }
    
    analyzeReadingLevelAlignment() {
        if (!this.goals.custom.readingLevel) return null;
        
        const current = this.getReadingLevel();
        const target = this.goals.custom.readingLevel;
        
        return this.isReadingLevelMatch(current, target) ? 100 : 50;
    }
    
    analyzeKeywordsAlignment() {
        if (this.goals.custom.keywords.length === 0) return null;
        
        const usedCount = this.goals.custom.keywords.filter(keyword => 
            this.isKeywordUsed(keyword)
        ).length;
        
        return Math.round((usedCount / this.goals.custom.keywords.length) * 100);
    }
    
    getReadingLevel() {
        const text = this.editor.getText();
        const stats = this.editor.getStats();
        
        if (stats.words === 0 || stats.sentences === 0) return 'unknown';
        
        const avgWordsPerSentence = stats.words / stats.sentences;
        const avgSyllablesPerWord = this.countTotalSyllables(text) / stats.words;
        
        const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
        
        if (grade <= 5) return 'elementary';
        if (grade <= 8) return 'middle';
        if (grade <= 12) return 'high';
        return 'college';
    }
    
    isReadingLevelMatch(current, target) {
        const levels = ['elementary', 'middle', 'high', 'college'];
        const currentIndex = levels.indexOf(current);
        const targetIndex = levels.indexOf(target);
        
        return Math.abs(currentIndex - targetIndex) <= 1;
    }
    
    countTotalSyllables(text) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        return words.reduce((total, word) => total + this.countSyllables(word), 0);
    }
    
    countSyllables(word) {
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
        
        if (word.endsWith('e')) {
            count--;
        }
        
        return Math.max(1, count);
    }
    
    calculateAverageWordLength(text) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return 0;
        
        const totalLength = words.reduce((sum, word) => sum + word.length, 0);
        return totalLength / words.length;
    }
    
    updateAlignmentMeter(score) {
        const fill = this.container.querySelector('#alignment-fill');
        const label = this.container.querySelector('#alignment-label');
        
        fill.style.width = `${score}%`;
        fill.className = 'alignment-fill';
        
        if (score >= 80) {
            fill.classList.add('excellent');
            label.textContent = 'Excellent alignment!';
        } else if (score >= 60) {
            fill.classList.add('good');
            label.textContent = 'Good alignment';
        } else if (score >= 40) {
            fill.classList.add('fair');
            label.textContent = 'Fair alignment';
        } else {
            fill.classList.add('poor');
            label.textContent = 'Needs improvement';
        }
    }
    
    updateAlignmentFeedback(alignment) {
        const feedback = this.container.querySelector('#alignment-feedback');
        const items = [];
        
        // Generate feedback for each aspect
        if (alignment.tone !== null) {
            if (alignment.tone === 100) {
                items.push({ type: 'good', message: `Tone matches ${this.goals.tone} style` });
            } else {
                items.push({ type: 'warning', message: `Tone doesn't match ${this.goals.tone} style` });
            }
        }
        
        if (alignment.wordCount !== null) {
            const current = this.editor.getStats().words;
            const target = this.goals.custom.wordCount;
            if (alignment.wordCount === 100) {
                items.push({ type: 'good', message: 'Word count on target' });
            } else if (current < target) {
                items.push({ type: 'info', message: `Need ${target - current} more words` });
            } else {
                items.push({ type: 'warning', message: `${current - target} words over target` });
            }
        }
        
        if (alignment.keywords !== null) {
            const used = this.goals.custom.keywords.filter(k => this.isKeywordUsed(k)).length;
            const total = this.goals.custom.keywords.length;
            if (alignment.keywords === 100) {
                items.push({ type: 'good', message: 'All keywords included' });
            } else {
                items.push({ type: 'info', message: `${used}/${total} keywords used` });
            }
        }
        
        feedback.innerHTML = items.map(item => `
            <div class="feedback-item ${item.type}">
                <span class="feedback-icon">${this.getFeedbackIcon(item.type)}</span>
                <span class="feedback-message">${item.message}</span>
            </div>
        `).join('');
    }
    
    getFeedbackIcon(type) {
        const icons = {
            good: '✅',
            warning: '⚠️',
            info: 'ℹ️',
            error: '❌'
        };
        return icons[type] || '•';
    }
    
    generateSuggestions() {
        const suggestions = [];
        const text = this.editor.getText();
        
        // Tone suggestions
        if (this.goals.tone === 'formal' && this.analyzeToneAlignment() < 80) {
            suggestions.push({
                type: 'tone',
                title: 'Make it more formal',
                message: 'Consider using more formal language and avoiding contractions.',
                action: 'Apply formal tone'
            });
        }
        
        // Word count suggestions
        if (this.goals.custom.wordCount) {
            const current = this.editor.getStats().words;
            const target = this.goals.custom.wordCount;
            if (current < target * 0.8) {
                suggestions.push({
                    type: 'expansion',
                    title: 'Expand your content',
                    message: `Add ${target - current} more words to reach your goal.`,
                    action: 'Show expansion tips'
                });
            }
        }
        
        // Keyword suggestions
        const unusedKeywords = this.goals.custom.keywords.filter(k => !this.isKeywordUsed(k));
        if (unusedKeywords.length > 0) {
            suggestions.push({
                type: 'keywords',
                title: 'Include missing keywords',
                message: `Add: ${unusedKeywords.join(', ')}`,
                action: 'Highlight opportunities'
            });
        }
        
        // Update UI
        const container = this.container.querySelector('#suggestions-list');
        
        if (suggestions.length === 0) {
            container.innerHTML = '<div class="empty-state">Your writing aligns well with your goals!</div>';
            return;
        }
        
        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-card">
                <h5>${suggestion.title}</h5>
                <p>${suggestion.message}</p>
                <button class="suggestion-action" data-type="${suggestion.type}">
                    ${suggestion.action}
                </button>
            </div>
        `).join('');
        
        // Add action handlers
        container.querySelectorAll('.suggestion-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleSuggestionAction(e.target.dataset.type);
            });
        });
    }
    
    handleSuggestionAction(type) {
        switch (type) {
            case 'tone':
                this.applyFormalTone();
                break;
            case 'expansion':
                this.showExpansionTips();
                break;
            case 'keywords':
                this.highlightKeywordOpportunities();
                break;
        }
    }
    
    applyFormalTone() {
        const text = this.editor.getText();
        const formalReplacements = {
            "can't": "cannot",
            "won't": "will not",
            "don't": "do not",
            "didn't": "did not",
            "hasn't": "has not",
            "haven't": "have not",
            "isn't": "is not",
            "aren't": "are not",
            "wasn't": "was not",
            "weren't": "were not",
            "I'm": "I am",
            "you're": "you are",
            "it's": "it is",
            "that's": "that is",
            "there's": "there is",
            "gonna": "going to",
            "wanna": "want to",
            "gotta": "have to",
            "kinda": "kind of",
            "sorta": "sort of"
        };
        
        let formalText = text;
        Object.entries(formalReplacements).forEach(([informal, formal]) => {
            const regex = new RegExp(`\\b${informal}\\b`, 'gi');
            formalText = formalText.replace(regex, formal);
        });
        
        if (formalText !== text) {
            this.editor.setText(formalText);
            this.showNotification('Formal tone applied', 'success');
        } else {
            this.showNotification('Text is already formal', 'info');
        }
    }
    
    showExpansionTips() {
        const modal = document.createElement('div');
        modal.className = 'modal expansion-tips';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Tips to Expand Your Content</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="tip-section">
                        <h4>Add Details</h4>
                        <ul>
                            <li>Include specific examples</li>
                            <li>Add statistics or data</li>
                            <li>Provide more context</li>
                        </ul>
                    </div>
                    <div class="tip-section">
                        <h4>Expand Ideas</h4>
                        <ul>
                            <li>Explain the "why" behind statements</li>
                            <li>Add supporting arguments</li>
                            <li>Include counter-arguments</li>
                        </ul>
                    </div>
                    <div class="tip-section">
                        <h4>Enhance Structure</h4>
                        <ul>
                            <li>Add transition sentences</li>
                            <li>Include topic sentences</li>
                            <li>Create fuller conclusions</li>
                        </ul>
                    </div>
                    <button class="btn-primary analyze-btn">Analyze for expansion opportunities</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.analyze-btn').addEventListener('click', () => {
            modal.remove();
            this.analyzeExpansionOpportunities();
        });
    }
    
    analyzeExpansionOpportunities() {
        const text = this.editor.getText();
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        const opportunities = [];
        
        sentences.forEach((sentence, index) => {
            // Short sentences that could be expanded
            if (sentence.split(/\s+/).length < 8) {
                opportunities.push({
                    type: 'short-sentence',
                    position: text.indexOf(sentence),
                    suggestion: 'This sentence could be expanded with more details.'
                });
            }
            
            // Sentences with general terms
            const generalTerms = /\b(thing|stuff|good|bad|nice|okay)\b/gi;
            if (generalTerms.test(sentence)) {
                opportunities.push({
                    type: 'general-terms',
                    position: text.indexOf(sentence),
                    suggestion: 'Replace general terms with specific details.'
                });
            }
        });
        
        // Highlight opportunities in the editor
        this.editor.highlightOpportunities(opportunities);
        this.showNotification(`Found ${opportunities.length} expansion opportunities`, 'info');
    }
    
    highlightKeywordOpportunities() {
        const text = this.editor.getText();
        const unusedKeywords = this.goals.custom.keywords.filter(k => !this.isKeywordUsed(k));
        
        if (unusedKeywords.length === 0) {
            this.showNotification('All keywords are already included', 'success');
            return;
        }
        
        // Find potential insertion points
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const opportunities = [];
        
        unusedKeywords.forEach(keyword => {
            // Find sentences where the keyword might fit based on context
            sentences.forEach((sentence, index) => {
                // Simple heuristic: look for related words or topics
                const relatedWords = this.getRelatedWords(keyword);
                const hasRelated = relatedWords.some(word => 
                    sentence.toLowerCase().includes(word.toLowerCase())
                );
                
                if (hasRelated) {
                    opportunities.push({
                        keyword: keyword,
                        sentence: sentence,
                        position: text.indexOf(sentence)
                    });
                }
            });
        });
        
        if (opportunities.length > 0) {
            this.showKeywordOpportunities(opportunities);
        } else {
            this.showNotification('Consider adding new sentences to include keywords', 'info');
        }
    }
    
    getRelatedWords(keyword) {
        // Simple related words mapping - in production, use a proper thesaurus API
        const relatedMap = {
            'performance': ['speed', 'efficiency', 'fast', 'quick', 'optimal'],
            'quality': ['good', 'excellent', 'best', 'superior', 'high'],
            'innovation': ['new', 'creative', 'innovative', 'novel', 'unique'],
            'solution': ['solve', 'fix', 'answer', 'resolve', 'address']
        };
        
        return relatedMap[keyword.toLowerCase()] || [];
    }
    
    showKeywordOpportunities(opportunities) {
        const modal = document.createElement('div');
        modal.className = 'modal keyword-opportunities';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Keyword Insertion Opportunities</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <p>Consider adding these keywords in the following locations:</p>
                    <div class="opportunities-list">
                        ${opportunities.map(opp => `
                            <div class="opportunity-item">
                                <div class="keyword-badge">${opp.keyword}</div>
                                <div class="sentence-context">
                                    "...${this.truncate(opp.sentence, 100)}..."
                                </div>
                                <button class="insert-btn" data-position="${opp.position}" data-keyword="${opp.keyword}">
                                    Insert here
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelectorAll('.insert-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const position = parseInt(e.target.dataset.position);
                const keyword = e.target.dataset.keyword;
                this.editor.insertTextAt(position, ` ${keyword}`);
                modal.remove();
                this.updateKeywordsList();
                this.analyzeAlignment();
            });
        });
    }
    
    truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    async saveGoals() {
        try {
            await chrome.runtime.sendMessage({
                action: 'update-settings',
                settings: { goals: this.goals }
            });
            
            // Animate save button
            const saveBtn = this.container.querySelector('.save-goals-btn');
            saveBtn.textContent = '✅';
            setTimeout(() => {
                saveBtn.textContent = '💾';
            }, 1000);
            
            this.showNotification('Goals saved successfully', 'success');
        } catch (error) {
            console.error('Error saving goals:', error);
            this.showNotification('Error saving goals', 'error');
        }
    }
    
    refresh() {
        this.analyzeAlignment();
        this.generateSuggestions();
    }
    
    destroy() {
        // Clean up
        this.container.innerHTML = '';
    }
}