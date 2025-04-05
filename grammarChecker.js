// Clase GrammarChecker que utiliza NLP.js desde CDN
class GrammarChecker {
    constructor() {
      // Usar NLP.js desde el objeto global window.nlp
      this.manager = new window.nlp.NlpManager({ 
        languages: ['en', 'es'],
        forceNER: true
      });
      
      // Reglas gramaticales por idioma
      this.grammarRules = {
        en: this.loadEnglishRules(),
        es: this.loadSpanishRules()
      };
      
      // Flag de inicialización
      this.initialized = false;
    }
    
    /**
     * Inicializa el corrector gramatical
     */
    async initialize() {
      if (this.initialized) return true;
      
      try {
        // Simulamos carga de modelos con un retraso
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.initialized = true;
        return true;
      } catch (error) {
        console.error('Error al inicializar el corrector gramatical:', error);
        return false;
      }
    }
    
    /**
     * Detecta el idioma del texto proporcionado
     * @param {string} text - Texto a analizar
     * @returns {string} - Código del idioma detectado
     */
    async detectLanguage(text) {
      try {
        // Usar el detector de idioma de NLP.js
        const language = new window.nlp.Language();
        const result = await language.guess(text, null, 0.5);
        
        // Devolver el código del idioma o 'en' como respaldo
        return (result && result.alpha2) ? result.alpha2 : 'en';
      } catch (error) {
        console.error('Error al detectar idioma:', error);
        
        // Detección simple de respaldo
        const spanishWords = ['el', 'la', 'los', 'las', 'de', 'en', 'con', 'por', 'que', 'es', 'son'];
        const englishWords = ['the', 'a', 'an', 'of', 'in', 'on', 'with', 'is', 'are', 'were'];
        
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        let spanishCount = 0;
        let englishCount = 0;
        
        for (const word of words) {
          if (spanishWords.includes(word)) spanishCount++;
          if (englishWords.includes(word)) englishCount++;
        }
        
        return spanishCount > englishCount ? 'es' : 'en';
      }
    }
    
    /**
     * Verifica la gramática y ortografía del texto
     * @param {string} text - Texto a verificar
     * @returns {Object} - Resultados con correcciones
     */
    async checkGrammar(text) {
      if (!this.initialized) await this.initialize();
      
      try {
        // Detectar idioma
        const language = await this.detectLanguage(text);
        
        // Obtener reglas para el idioma
        const rules = this.grammarRules[language] || this.grammarRules.en;
        
        // Aplicar reglas gramaticales
        const corrections = [];
        
        // Dividir texto en oraciones para un análisis más preciso
        const sentences = this.splitSentences(text);
        
        let offset = 0;
        for (const sentence of sentences) {
          // Aplicar cada regla a la oración
          for (const rule of rules) {
            const ruleCorrections = this.applyRule(sentence, rule);
            
            // Ajustar posiciones con el offset actual
            for (const correction of ruleCorrections) {
              correction.position += offset;
              corrections.push(correction);
            }
          }
          
          offset += sentence.length + 1; // +1 para el espacio/punto
        }
        
        return {
          language,
          corrections,
          text
        };
      } catch (error) {
        console.error('Error al verificar gramática:', error);
        return {
          language: 'en',
          corrections: [],
          text,
          error: error.message
        };
      }
    }
    
    /**
     * Divide un texto en oraciones
     * @param {string} text - Texto a dividir
     * @returns {Array} - Array de oraciones
     */
    splitSentences(text) {
      // Expresión regular simple para dividir en oraciones
      const sentenceRegex = /[.!?]+[\s\n]+|$/gm;
      return text.split(sentenceRegex)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim());
    }
    
    /**
     * Aplica una regla gramatical a un texto
     * @param {string} text - Texto a verificar
     * @param {Object} rule - Regla a aplicar
     * @returns {Array} - Correcciones encontradas
     */
    applyRule(text, rule) {
      const corrections = [];
      
      if (rule.customReplacer) {
        // Para reglas con reemplazador personalizado (como palabras sin tilde)
        const words = text.match(/\b\w+\b/g) || [];
        for (const word of words) {
          const lowerWord = word.toLowerCase();
          // Verificar si es una palabra sin acento
          if (rule.words && rule.words[lowerWord]) {
            const replacement = rule.words[lowerWord];
            const pos = text.indexOf(word);
            if (pos !== -1) {
              corrections.push({
                type: 'spelling',
                position: pos,
                length: word.length,
                original: word,
                suggestion: replacement,
                message: `${rule.message}: "${word}" debe escribirse "${replacement}"`
              });
            }
          }
        }
      } else {
        // Para reglas basadas en patrones regulares
        // Clonar patrón para evitar problemas con lastIndex
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const original = match[rule.groupToReplace || 1];
          
          corrections.push({
            type: 'grammar',
            position: match.index + (match[0].indexOf(original) || 0),
            length: original.length,
            original: original,
            suggestion: rule.replacement,
            message: rule.message
          });
        }
      }
      
      return corrections;
    }
    
    /**
     * Carga reglas gramaticales para inglés
     * @returns {Array} - Reglas gramaticales
     */
    loadEnglishRules() {
      return [
        {
          name: 'your_youre',
          pattern: /\b(your)\s+(welcome|right|going|kidding|joking|trying|looking|talking|leaving|staying|tired|sure|correct|done|finished|invited)\b/gi,
          replacement: "you're",
          message: 'Posible error: "your" debería ser "you\'re" (contracción de "you are")'
        },
        {
          name: 'its_its',
          pattern: /\b(its)\s+(a|an|the|going|not|because|important|time|necessary|possible)\b/gi,
          replacement: "it's",
          message: 'Posible error: "its" debería ser "it\'s" (contracción de "it is")'
        },
        {
          name: 'their_theyre',
          pattern: /\b(their)\s+(going|coming|trying|looking|talking|leaving|staying|waiting)\b/gi,
          replacement: "they're",
          message: 'Posible error: "their" debería ser "they\'re" (contracción de "they are")'
        },
        {
          name: 'then_than',
          pattern: /\b(is|are|seem|looks|get|become)\s+(more|less|better|worse|bigger|smaller)\s+(then)\b/gi,
          groupToReplace: 3,
          replacement: "than",
          message: 'Posible error: "then" debería ser "than" (para comparaciones)'
        },
        // Errores ortográficos comunes en inglés
        {
          name: 'common_misspellings',
          customReplacer: true,
          message: 'Error ortográfico',
          words: {
            'recieve': 'receive',
            'wierd': 'weird',
            'definately': 'definitely',
            'seperate': 'separate',
            'occured': 'occurred',
            'untill': 'until',
            'begining': 'beginning',
            'accomodate': 'accommodate',
            'foriegn': 'foreign',
            'goverment': 'government',
            'similiar': 'similar',
            'tommorrow': 'tomorrow'
          }
        }
      ];
    }
    
    /**
     * Carga reglas gramaticales para español
     * @returns {Array} - Reglas gramaticales
     */
    loadSpanishRules() {
      return [
        {
          name: 'hay_ahi_ay',
          pattern: /\b(hay)\s+(está|aquí|allí|allá|arriba|abajo|adentro|afuera|cerca|lejos|adelante|atrás)\b/gi,
          replacement: "ahí",
          message: 'Posible confusión: "hay" (existencia) debe ser "ahí" (lugar)'
        },
        {
          name: 'a_ha_ah',
          pattern: /\b(a)\s+(sido|estado|terminado|comenzado|empezado|llegado|venido|ido|hecho|dicho)\b/gi,
          replacement: "ha",
          message: 'Posible confusión: "a" (preposición) debe ser "ha" (verbo haber)'
        },
        {
          name: 'haber_a_ver',
          pattern: /\b(haber)\s+(si|qué|cómo|dónde|cuándo|cuánto|quién)\b/gi,
          replacement: "a ver",
          message: 'Posible confusión: "haber" (verbo) debe ser "a ver" (preposición + verbo)'
        },
        // Palabras sin tilde
        {
          name: 'sin_acento',
          customReplacer: true,
          message: 'Falta tilde',
          words: {
            'gramatica': 'gramática',
            'ultimo': 'último',
            'exito': 'éxito',
            'tambien': 'también',
            'aqui': 'aquí',
            'alli': 'allí',
            'esta ': 'está ',
            'este ': 'esté ',
            'facil': 'fácil',
            'dificil': 'difícil',
            'dia': 'día',
            'telefono': 'teléfono',
            'cafe': 'café',
            'numero': 'número',
            'musica': 'música',
            'rapido': 'rápido',
            'codigo': 'código',
            'metodo': 'método',
            'asi': 'así',
            'ademas': 'además'
          }
        }
      ];
    }
    
    /**
     * Genera HTML con errores resaltados
     * @param {string} text - Texto original
     * @param {Array} errors - Errores a resaltar
     * @returns {string} - HTML con errores resaltados
     */
    highlightErrors(text, errors) {
      // Convertir texto a HTML seguro
      let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      
      // Ordenar errores de derecha a izquierda para no afectar posiciones
      const sortedErrors = [...errors].sort((a, b) => b.position - a.position);
      
      for (const error of sortedErrors) {
        const before = html.substring(0, error.position);
        const highlighted = html.substring(error.position, error.position + error.length);
        const after = html.substring(error.position + error.length);
        
        // Crear elemento span con la clase y datos adecuados
        const correctionSpan = `<span class="correction" data-type="${error.type}" data-message="${error.message}" data-suggestion="${error.suggestion}">${highlighted}</span>`;
        
        html = before + correctionSpan + after;
      }
      
      return html;
    }
    
    /**
     * Aplica correcciones al texto
     * @param {string} text - Texto original
     * @param {Array} corrections - Correcciones a aplicar
     * @returns {string} - Texto corregido
     */
    applyCorrections(text, corrections) {
      // Ordenar correcciones de derecha a izquierda para no afectar posiciones
      const sortedCorrections = [...corrections].sort((a, b) => b.position - a.position);
      
      let result = text;
      for (const correction of sortedCorrections) {
        result = result.substring(0, correction.position) + 
                correction.suggestion + 
                result.substring(correction.position + correction.length);
      }
      
      return result;
    }
  }