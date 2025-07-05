export class StatsComponent {
    constructor(container, editor) {
        this.container = container;
        this.editor = editor;
        this.stats = {
            words: 0,
            characters: 0,
            charactersNoSpaces: 0,
            sentences: 0,
            paragraphs: 0,
            readingTime: 0,
            speakingTime: 0,
            score: 100
        };
        
        this.initialize();
    }
    
    initialize() {
        this.render();
        this.setupEventListeners();
        this.update();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="stats-component">
                <div class="stats-header">
                    <h3>Document Statistics</h3>
                    <button class="refresh-btn" title="Refresh stats">🔄</button>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-value" id="stat-words">0</div>
                        <div class="stat-label">Words</div>
                        <div class="stat-detail" id="stat-unique-words">0 unique</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-value" id="stat-characters">0</div>
                        <div class="stat-label">Characters</div>
                        <div class="stat-detail" id="stat-characters-no-spaces">0 without spaces</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-value" id="stat-sentences">0</div>
                        <div class="stat-label">Sentences</div>
                        <div class="stat-detail" id="stat-avg-sentence">0 words avg</div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-value" id="stat-paragraphs">0</div>
                        <div class="stat-label">Paragraphs</div>
                        <div class="stat-detail" id="stat-avg-paragraph">0 sentences avg</div>
                    </div>
                </div>
                
                <div class="time-estimates">
                    <div class="time-estimate">
                        <span class="time-icon">👁️</span>
                        <span class="time-label">Reading time:</span>
                        <span class="time-value" id="reading-time">0 min</span>
                    </div>
                    <div class="time-estimate">
                        <span class="time-icon">🎤</span>
                        <span class="time-label">Speaking time:</span>
                        <span class="time-value" id="speaking-time">0 min</span>
                    </div>
                </div>
                
                <div class="score-section">
                    <h4>Writing Score</h4>
                    <div class="score-container">
                        <div class="score-circle" id="score-circle">
                            <svg viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" stroke-width="10"/>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#11a683" stroke-width="10"
                                        stroke-dasharray="283" stroke-dashoffset="283"
                                        transform="rotate(-90 50 50)" id="score-progress"/>
                            </svg>
                            <div class="score-text">
                                <span class="score-value" id="score-value">100</span>
                                <span class="score-label">Score</span>
                            </div>
                        </div>
                        <div class="score-details" id="score-details">
                            <div class="score-factor good">
                                <span class="factor-icon">✓</span>
                                <span class="factor-label">No errors</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="advanced-metrics">
                    <h4>Advanced Metrics</h4>
                    <div class="metrics-list">
                        <div class="metric-item">
                            <span class="metric-label">Lexical Diversity:</span>
                            <span class="metric-value" id="lexical-diversity">0%</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Average Word Length:</span>
                            <span class="metric-value" id="avg-word-length">0</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Readability Grade:</span>
                            <span class="metric-value" id="readability-grade">-</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Sentiment:</span>
                            <span class="metric-value" id="sentiment">Neutral</span>
                        </div>
                    </div>
                </div>
                
                <div class="word-frequency">
                    <h4>Most Used Words</h4>
                    <div class="frequency-list" id="frequency-list">
                        <div class="empty-state">Start typing to see word frequency</div>
                    </div>
                </div>
                
                <div class="export-section">
                    <button class="btn-secondary" id="export-stats">Export Stats</button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Refresh button
        this.container.querySelector('.refresh-btn').addEventListener('click', () => {
            this.refresh();
        });
        
        // Export button
        this.container.querySelector('#export-stats').addEventListener('click', () => {
            this.exportStats();
        });
        
        // Listen to editor changes
        this.editor.on('text-changed', () => {
            this.update();
        });
        
        this.editor.on('errors-updated', (errors) => {
            this.updateScore(errors);
        });
    }
    
    update(text = null) {
        const content = text || this.editor.getText();
        
        // Basic stats
        this.stats.words = this.countWords(content);
        this.stats.characters = content.length;
        this.stats.charactersNoSpaces = content.replace(/\s/g, '').length;
        this.stats.sentences = this.countSentences(content);
        this.stats.paragraphs = this.countParagraphs(content);
        
        // Time estimates
        this.stats.readingTime = Math.ceil(this.stats.words / 200); // 200 WPM average
        this.stats.speakingTime = Math.ceil(this.stats.words / 150); // 150 WPM average
        
        // Update UI
        this.updateUI();
        
        // Update advanced metrics
        this.updateAdvancedMetrics(content);
        
        // Update word frequency
        this.updateWordFrequency(content);
    }
    
    updateUI() {
        // Basic stats
        document.getElementById('stat-words').textContent = this.formatNumber(this.stats.words);
        document.getElementById('stat-characters').textContent = this.formatNumber(this.stats.characters);
        document.getElementById('stat-characters-no-spaces').textContent = 
            `${this.formatNumber(this.stats.charactersNoSpaces)} without spaces`;
        document.getElementById('stat-sentences').textContent = this.stats.sentences;
        document.getElementById('stat-paragraphs').textContent = this.stats.paragraphs;
        
        // Unique words
        const uniqueWords = this.getUniqueWords();
        document.getElementById('stat-unique-words').textContent = `${uniqueWords} unique`;
        
        // Averages
        const avgSentenceLength = this.stats.sentences > 0 
            ? Math.round(this.stats.words / this.stats.sentences) 
            : 0;
        document.getElementById('stat-avg-sentence').textContent = `${avgSentenceLength} words avg`;
        
        const avgParagraphLength = this.stats.paragraphs > 0 
            ? Math.round(this.stats.sentences / this.stats.paragraphs) 
            : 0;
        document.getElementById('stat-avg-paragraph').textContent = `${avgParagraphLength} sentences avg`;
        
        // Time estimates
        document.getElementById('reading-time').textContent = `${this.stats.readingTime} min`;
        document.getElementById('speaking-time').textContent = `${this.stats.speakingTime} min`;
    }
    
    updateAdvancedMetrics(content) {
        // Lexical diversity
        const uniqueWords = this.getUniqueWords();
        const diversity = this.stats.words > 0 
            ? Math.round((uniqueWords / this.stats.words) * 100) 
            : 0;
        document.getElementById('lexical-diversity').textContent = `${diversity}%`;
        
        // Average word length
        const avgWordLength = this.calculateAverageWordLength(content);
        document.getElementById('avg-word-length').textContent = avgWordLength.toFixed(1);
        
        // Readability grade
        const grade = this.calculateReadabilityGrade(content);
        document.getElementById('readability-grade').textContent = grade;
        
        // Sentiment
        const sentiment = this.analyzeSentiment(content);
        const sentimentElement = document.getElementById('sentiment');
        sentimentElement.textContent = sentiment.label;
        sentimentElement.className = `metric-value sentiment-${sentiment.type}`;
    }
    
    updateWordFrequency(content) {
        const frequency = this.calculateWordFrequency(content);
        const container = document.getElementById('frequency-list');
        
        if (frequency.length === 0) {
            container.innerHTML = '<div class="empty-state">Start typing to see word frequency</div>';
            return;
        }
        
        container.innerHTML = frequency.slice(0, 10).map(([word, count]) => `
            <div class="frequency-item">
                <span class="word">${this.escapeHtml(word)}</span>
                <div class="frequency-bar">
                    <div class="frequency-fill" style="width: ${(count / frequency[0][1]) * 100}%"></div>
                </div>
                <span class="count">${count}</span>
            </div>
        `).join('');
    }
    
    updateScore(errors = []) {
        // Calculate score based on errors
        const errorPenalty = {
            'spelling': 5,
            'grammar': 5,
            'punctuation': 3,
            'style': 2,
            'capitalization': 1
        };
        
        let totalPenalty = 0;
        errors.forEach(error => {
            totalPenalty += errorPenalty[error.type] || 3;
        });
        
        // Additional factors
        const readabilityPenalty = this.getReadabilityPenalty();
        const lengthPenalty = this.getLengthPenalty();
        
        this.stats.score = Math.max(0, 100 - totalPenalty - readabilityPenalty - lengthPenalty);
        
        // Update UI
        this.animateScore(this.stats.score);
        this.updateScoreDetails(errors, readabilityPenalty, lengthPenalty);
    }
    
    animateScore(newScore) {
        const scoreValue = document.getElementById('score-value');
        const scoreProgress = document.getElementById('score-progress');
        const currentScore = parseInt(scoreValue.textContent);
        
        // Animate number
        const duration = 500;
        const start = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const score = Math.round(currentScore + (newScore - currentScore) * progress);
                scoreValue.textContent = score;
                
                // Update circle
                const offset = 283 - (283 * score / 100);
                scoreProgress.style.strokeDashoffset = offset;
                
                // Update color
                scoreProgress.style.stroke = this.getScoreColor(score);
                
                requestAnimationFrame(animate);
            } else {
                scoreValue.textContent = newScore;
                const offset = 283 - (283 * newScore / 100);
                scoreProgress.style.strokeDashoffset = offset;
                scoreProgress.style.stroke = this.getScoreColor(newScore);
            }
        };
        
        animate();
    }
    
    getScoreColor(score) {
        if (score >= 90) return '#4caf50';
        if (score >= 70) return '#8bc34a';
        if (score >= 50) return '#ff9800';
        return '#f44336';
    }
    
    updateScoreDetails(errors, readabilityPenalty, lengthPenalty) {
        const details = document.getElementById('score-details');
        const factors = [];
        
        if (errors.length === 0) {
            factors.push({
                type: 'good',
                icon: '✓',
                label: 'No errors'
            });
        } else {
            const errorTypes = [...new Set(errors.map(e => e.type))];
            errorTypes.forEach(type => {
                const count = errors.filter(e => e.type === type).length;
                factors.push({
                    type: 'bad',
                    icon: '⚠️',
                    label: `${count} ${type} error${count > 1 ? 's' : ''}`
                });
            });
        }
        
        if (readabilityPenalty > 0) {
            factors.push({
                type: 'warning',
                icon: '📖',
                label: 'Complex readability'
            });
        }
        
        if (lengthPenalty > 0) {
            factors.push({
                type: 'warning',
                icon: '📏',
                label: 'Long sentences'
            });
        }
        
        details.innerHTML = factors.map(factor => `
            <div class="score-factor ${factor.type}">
                <span class="factor-icon">${factor.icon}</span>
                <span class="factor-label">${factor.label}</span>
            </div>
        `).join('');
    }
    
    getReadabilityPenalty() {
        // Simple penalty based on average sentence length
        const avgSentenceLength = this.stats.sentences > 0 
            ? this.stats.words / this.stats.sentences 
            : 0;
            
        if (avgSentenceLength > 25) return 10;
        if (avgSentenceLength > 20) return 5;
        return 0;
    }
    
    getLengthPenalty() {
        // Penalty for very short or very long documents
        if (this.stats.words < 50) return 5;
        if (this.stats.words > 5000) return 5;
        return 0;
    }
    
    countWords(text) {
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }
    
    countSentences(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences.length;
    }
    
    countParagraphs(text) {
        if (!text.trim()) {
            return 0;
        }
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
        return paragraphs.length > 0 ? paragraphs.length : 1;
    }
    
    getUniqueWords() {
        const text = this.editor.getText();
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const uniqueWords = new Set(words);
        return uniqueWords.size;
    }
    
    calculateAverageWordLength(text) {
        const words = text.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return 0;
        
        const totalLength = words.reduce((sum, word) => sum + word.length, 0);
        return totalLength / words.length;
    }
    
    calculateReadabilityGrade(text) {
        // Flesch-Kincaid Grade Level
        if (this.stats.words === 0 || this.stats.sentences === 0) return '-';
        
        const avgWordsPerSentence = this.stats.words / this.stats.sentences;
        const avgSyllablesPerWord = this.countTotalSyllables(text) / this.stats.words;
        
        const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
        
        if (grade < 1) return 'K';
        if (grade > 16) return 'Graduate';
        return `Grade ${Math.round(grade)}`;
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
    
    analyzeSentiment(text) {
        // Simple sentiment analysis
        const positive = /\b(good|great|excellent|amazing|wonderful|fantastic|love|happy|joy|excited)\b/gi;
        const negative = /\b(bad|terrible|awful|horrible|hate|sad|angry|disappointed|frustrated)\b/gi;
        
        const positiveMatches = (text.match(positive) || []).length;
        const negativeMatches = (text.match(negative) || []).length;
        
        const total = positiveMatches + negativeMatches;
        
        if (total === 0) {
            return { type: 'neutral', label: 'Neutral' };
        }
        
        const positiveRatio = positiveMatches / total;
        
        if (positiveRatio > 0.7) {
            return { type: 'positive', label: 'Positive' };
        } else if (positiveRatio < 0.3) {
            return { type: 'negative', label: 'Negative' };
        } else {
            return { type: 'mixed', label: 'Mixed' };
        }
    }
    
    calculateWordFrequency(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2); // Ignore very short words
        
        const frequency = {};
        words.forEach(word => {
            frequency[word] = (frequency[word] || 0) + 1;
        });
        
        // Sort by frequency
        return Object.entries(frequency)
            .sort(([,a], [,b]) => b - a)
            .filter(([word, count]) => count > 1); // Only show words used more than once
    }
    
    formatNumber(num) {
        return num.toLocaleString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    refresh() {
        this.update();
        
        // Animate refresh button
        const refreshBtn = this.container.querySelector('.refresh-btn');
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            refreshBtn.style.transform = '';
        }, 300);
    }
    
    exportStats() {
        const stats = {
            basic: {
                words: this.stats.words,
                characters: this.stats.characters,
                charactersNoSpaces: this.stats.charactersNoSpaces,
                sentences: this.stats.sentences,
                paragraphs: this.stats.paragraphs
            },
            timeEstimates: {
                readingTime: this.stats.readingTime,
                speakingTime: this.stats.speakingTime
            },
            advanced: {
                uniqueWords: this.getUniqueWords(),
                lexicalDiversity: Math.round((this.getUniqueWords() / this.stats.words) * 100),
                averageWordLength: this.calculateAverageWordLength(this.editor.getText()),
                readabilityGrade: this.calculateReadabilityGrade(this.editor.getText()),
                sentiment: this.analyzeSentiment(this.editor.getText())
            },
            wordFrequency: this.calculateWordFrequency(this.editor.getText()).slice(0, 20),
            score: this.stats.score,
            timestamp: new Date().toISOString()
        };
        
        // Create download
        const dataStr = JSON.stringify(stats, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `writing-stats-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        // Show confirmation
        this.showExportConfirmation();
    }
    
    showExportConfirmation() {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = 'Statistics exported successfully!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    destroy() {
        // Clean up
        this.container.innerHTML = '';
    }
}