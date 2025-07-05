export class AnalyticsManager {
    constructor() {
        this.stats = {
            daily: this.initDailyStats(),
            weekly: this.initWeeklyStats(),
            allTime: this.initAllTimeStats()
        };
        
        this.initialize();
    }
    
    initDailyStats() {
        return {
            date: new Date().toDateString(),
            wordsChecked: 0,
            errorsFound: 0,
            correctionsAccepted: 0,
            correctionsIgnored: 0,
            timeActive: 0,
            languagesUsed: {}
        };
    }
    
    initWeeklyStats() {
        return {
            startDate: this.getWeekStart(),
            wordsChecked: 0,
            errorsFound: 0,
            correctionsAccepted: 0,
            correctionsIgnored: 0,
            topErrors: [],
            improvementRate: 0,
            weeklyErrorCounts: {}
        };
    }
    
    initAllTimeStats() {
        return {
            totalWordsChecked: 0,
            totalErrors: 0,
            totalCorrections: 0,
            averageAccuracy: 0,
            mostCommonErrors: {},
            languageDistribution: {}
        };
    }
    
    async initialize() {
        // Cargar estadísticas guardadas
        await this.loadStats();
        
        // Configurar reset diario
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'daily-stats') {
                this.resetDailyStats();
            }
        });
        
        // Guardar estadísticas cada 5 minutos
        setInterval(() => this.saveStats(), 5 * 60 * 1000);
    }
    
    async loadStats() {
        const saved = await chrome.storage.local.get(['analytics']);
        if (saved.analytics) {
            // Verificar si el día cambió
            if (saved.analytics.daily.date !== new Date().toDateString()) {
                this.resetDailyStats();
            } else {
                this.stats.daily = saved.analytics.daily;
            }
            
            // Verificar si la semana cambió
            if (this.isNewWeek(saved.analytics.weekly.startDate)) {
                this.resetWeeklyStats();
            } else {
                this.stats.weekly = saved.analytics.weekly;
            }
            
            this.stats.allTime = saved.analytics.allTime || this.initAllTimeStats();
        }
    }
    
    async saveStats() {
        await chrome.storage.local.set({
            analytics: this.stats
        });
    }
    
    getWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        return new Date(now.setDate(diff)).toDateString();
    }
    
    isNewWeek(startDate) {
        return startDate !== this.getWeekStart();
    }
    
    resetDailyStats() {
        // Agregar estadísticas diarias al histórico antes de resetear
        this.addToHistory(this.stats.daily);
        
        this.stats.daily = this.initDailyStats();
        this.saveStats();
    }
    
    resetWeeklyStats() {
        this.stats.weekly = this.initWeeklyStats();
        this.saveStats();
    }
    
    async addToHistory(dailyStats) {
        const history = await chrome.storage.local.get(['statsHistory']);
        const statsHistory = history.statsHistory || [];
        
        // Mantener solo los últimos 30 días
        statsHistory.push(dailyStats);
        if (statsHistory.length > 30) {
            statsHistory.shift();
        }
        
        await chrome.storage.local.set({ statsHistory });
    }
    
    trackCorrection(results) {
        const wordsCount = results.reduce((total, r) => 
            total + r.original.split(/\s+/).length, 0
        );
        
        const errorsCount = results.reduce((total, r) => 
            total + r.errors.length, 0
        );
        
        // Actualizar estadísticas diarias
        this.stats.daily.wordsChecked += wordsCount;
        this.stats.daily.errorsFound += errorsCount;
        
        // Actualizar estadísticas semanales
        this.stats.weekly.wordsChecked += wordsCount;
        this.stats.weekly.errorsFound += errorsCount;
        
        // Actualizar estadísticas totales
        this.stats.allTime.totalWordsChecked += wordsCount;
        this.stats.allTime.totalErrors += errorsCount;
        
        // Actualizar errores más comunes
        results.forEach(result => {
            result.errors.forEach(error => {
                this.trackErrorType(error);
            });
        });
        
        this.calculateMetrics();
    }
    
    trackErrorType(error) {
        const key = `${error.type}:${error.original}`;
        
        if (!this.stats.allTime.mostCommonErrors[key]) {
            this.stats.allTime.mostCommonErrors[key] = {
                type: error.type,
                original: error.original,
                suggestion: error.suggestion,
                count: 0
            };
        }
        
        this.stats.allTime.mostCommonErrors[key].count++;

        // Actualizar contador semanal de errores
        const weeklyErrorKey = error.type;
        if (!this.stats.weekly.weeklyErrorCounts[weeklyErrorKey]) {
            this.stats.weekly.weeklyErrorCounts[weeklyErrorKey] = 0;
        }
        this.stats.weekly.weeklyErrorCounts[weeklyErrorKey]++;
    }
    
    updateStats(updates) {
        // Actualizar contadores específicos
        if (updates.correctionsAccepted) {
            this.stats.daily.correctionsAccepted += updates.correctionsAccepted;
            this.stats.weekly.correctionsAccepted += updates.correctionsAccepted;
            this.stats.allTime.totalCorrections += updates.correctionsAccepted;
        }
        
        if (updates.correctionsIgnored) {
            this.stats.daily.correctionsIgnored += updates.correctionsIgnored;
            this.stats.weekly.correctionsIgnored += updates.correctionsIgnored;
        }
        
        if (updates.language) {
            this.trackLanguageUse(updates.language);
        }
        
        if (updates.timeActive) {
            this.stats.daily.timeActive += updates.timeActive;
        }
        
        this.calculateMetrics();
        this.saveStats();
    }
    
    trackLanguageUse(language) {
        // Estadísticas diarias
        if (!this.stats.daily.languagesUsed[language]) {
            this.stats.daily.languagesUsed[language] = 0;
        }
        this.stats.daily.languagesUsed[language]++;
        
        // Distribución total
        if (!this.stats.allTime.languageDistribution[language]) {
            this.stats.allTime.languageDistribution[language] = 0;
        }
        this.stats.allTime.languageDistribution[language]++;
    }
    
    calculateMetrics() {
        // Calcular tasa de mejora semanal
        if (this.stats.weekly.errorsFound > 0) {
            this.stats.weekly.improvementRate = 
                (this.stats.weekly.correctionsAccepted / this.stats.weekly.errorsFound) * 100;
        }
        
        // Calcular precisión promedio
        if (this.stats.allTime.totalErrors > 0) {
            this.stats.allTime.averageAccuracy = 
                (this.stats.allTime.totalCorrections / this.stats.allTime.totalErrors) * 100;
        }
        
        // Actualizar top errores semanales
        this.updateTopErrors();
    }
    
    updateTopErrors() {
        // Ordenar y tomar top 5 de los errores de la semana
        this.stats.weekly.topErrors = Object.entries(this.stats.weekly.weeklyErrorCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
    }
    
    async getStats(period = 'daily') {
        if (period !== 'history') {
            await this.loadStats(); // Asegurar datos actualizados
        }
        
        switch (period) {
            case 'daily':
                return this.stats.daily;
            case 'weekly':
                return this.stats.weekly;
            case 'allTime':
                return this.stats.allTime;
            case 'history':
                const history = await chrome.storage.local.get(['statsHistory']);
                return history.statsHistory || [];
            default:
                return this.stats;
        }
    }
    
    async generateReport() {
        const history = await this.getStats('history');
        
        return {
            summary: {
                daily: this.stats.daily,
                weekly: this.stats.weekly,
                allTime: this.stats.allTime
            },
            trends: this.calculateTrends(history),
            insights: this.generateInsights(),
            recommendations: this.generateRecommendations()
        };
    }
    
    calculateTrends(history) {
        if (history.length < 7) {
            return { insufficient_data: true };
        }
        
        const lastWeek = history.slice(-7);
        const previousWeek = history.slice(-14, -7);
        
        const lastWeekAvg = this.calculateAverage(lastWeek, 'errorsFound');
        const previousWeekAvg = this.calculateAverage(previousWeek, 'errorsFound');
        
        return {
            errorTrend: ((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100,
            accuracyTrend: this.calculateAccuracyTrend(lastWeek, previousWeek),
            activityTrend: this.calculateActivityTrend(lastWeek, previousWeek)
        };
    }
    
    calculateAverage(data, field) {
        return data.reduce((sum, item) => sum + (item[field] || 0), 0) / data.length;
    }
    
    calculateAccuracyTrend(current, previous) {
        const currentAccuracy = this.calculatePeriodAccuracy(current);
        const previousAccuracy = this.calculatePeriodAccuracy(previous);
        
        return ((currentAccuracy - previousAccuracy) / previousAccuracy) * 100;
    }
    
    calculatePeriodAccuracy(data) {
        const totalErrors = data.reduce((sum, item) => sum + item.errorsFound, 0);
        const totalCorrections = data.reduce((sum, item) => sum + item.correctionsAccepted, 0);
        
        return totalErrors > 0 ? (totalCorrections / totalErrors) * 100 : 100;
    }
    
    calculateActivityTrend(current, previous) {
        const currentWords = current.reduce((sum, item) => sum + item.wordsChecked, 0);
        const previousWords = previous.reduce((sum, item) => sum + item.wordsChecked, 0);
        
        return previousWords > 0 
            ? ((currentWords - previousWords) / previousWords) * 100 
            : 0;
    }
    
    generateInsights() {
        const insights = [];
        
        // Insight sobre errores más comunes
        const topError = Object.values(this.stats.allTime.mostCommonErrors)
            .sort((a, b) => b.count - a.count)[0];
            
        if (topError) {
            insights.push({
                type: 'common_error',
                message: `Your most common error is ${topError.type} with "${topError.original}"`,
                suggestion: `Consider reviewing ${topError.type} rules`
            });
        }
        
        // Insight sobre mejora
        if (this.stats.weekly.improvementRate > 80) {
            insights.push({
                type: 'high_improvement',
                message: 'Great job! You\'re accepting most corrections',
                value: this.stats.weekly.improvementRate
            });
        }
        
        // Insight sobre actividad
        if (this.stats.daily.wordsChecked > 1000) {
            insights.push({
                type: 'high_activity',
                message: 'You\'re very active today!',
                value: this.stats.daily.wordsChecked
            });
        }
        
        return insights;
    }
    
    generateRecommendations() {
        const recommendations = [];
        
        // Recomendación basada en tipos de errores
        const errorTypes = this.getErrorTypeDistribution();
        const dominantError = Object.entries(errorTypes)
            .sort(([,a], [,b]) => b - a)[0];
            
        if (dominantError && dominantError[1] > 30) {
            recommendations.push({
                type: dominantError[0],
                message: `Focus on improving your ${dominantError[0]} skills`,
                resources: this.getResourcesForErrorType(dominantError[0])
            });
        }
        
        // Recomendación de práctica
        if (this.stats.weekly.wordsChecked < 500) {
            recommendations.push({
                type: 'practice',
                message: 'Try to write more to improve your skills',
                target: 'Aim for at least 100 words per day'
            });
        }
        
        return recommendations;
    }
    
    getErrorTypeDistribution() {
        const distribution = {};
        
        Object.values(this.stats.allTime.mostCommonErrors).forEach(error => {
            if (!distribution[error.type]) {
                distribution[error.type] = 0;
            }
            distribution[error.type] += error.count;
        });
        
        return distribution;
    }
    
    getResourcesForErrorType(type) {
        const resources = {
            spelling: [
                'Practice with commonly misspelled words',
                'Use mnemonics for difficult words',
                'Read more to improve vocabulary'
            ],
            grammar: [
                'Review basic grammar rules',
                'Practice sentence structure',
                'Study verb tenses and agreement'
            ],
            punctuation: [
                'Learn comma rules',
                'Practice with semicolons and colons',
                'Review quotation mark usage'
            ],
            style: [
                'Read style guides',
                'Practice concise writing',
                'Vary sentence structure'
            ]
        };
        
        return resources[type] || [];
    }
    
    async exportStats(format = 'json') {
        const data = await this.generateReport();
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(data);
        }
        
        return data;
    }
    
    convertToCSV(data) {
        // Convertir estadísticas a formato CSV
        const rows = [
            ['Metric', 'Daily', 'Weekly', 'All Time'],
            ['Words Checked', data.summary.daily.wordsChecked, data.summary.weekly.wordsChecked, data.summary.allTime.totalWordsChecked],
            ['Errors Found', data.summary.daily.errorsFound, data.summary.weekly.errorsFound, data.summary.allTime.totalErrors],
            ['Corrections', data.summary.daily.correctionsAccepted, data.summary.weekly.correctionsAccepted, data.summary.allTime.totalCorrections]
        ];
        
        return rows.map(row => row.join(',')).join('\n');
    }
}