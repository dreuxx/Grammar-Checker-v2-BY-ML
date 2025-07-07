/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/**
 * Una simulación (mock) de un tokenizador SentencePiece para pruebas.
 *
 * Esta clase es una implementación simulada del tokenizador SentencePiece.
 * Está destinada únicamente para fines de prueba y no representa la
 * funcionalidad completa de la biblioteca real de SentencePiece.
 */
class SentencePieceTokenizer {
    /**
     * Constructor para SentencePieceTokenizer.
     * @param {Object} [config] - Configuración opcional.
     * @param {Object} [config.vocab] - Un vocabulario simulado que mapea tokens a IDs.
     */
    constructor(config = {}) {
        // El vocabulario ahora se carga desde la configuración, o se usa uno por defecto.
        this.vocab = config.vocab || this.getDefaultVocab();

        // Crear el vocabulario inverso para decodificar.
        this.reverseVocab = Object.fromEntries(
            Object.entries(this.vocab).map(([key, value]) => [value, key])
        );
    }

    /**
     * Proporciona un vocabulario por defecto si no se pasa uno.
     * @returns {Object} El vocabulario por defecto.
     */
    getDefaultVocab() {
        return {
            '<pad>': 0, '<s>': 1, '</s>': 2, '<unk>': 3, ' ': 4,
            // Palabras comunes en inglés
            'the': 5, 'a': 6, 'an': 7, 'and': 8, 'or': 9, 'but': 10,
            'in': 11, 'on': 12, 'at': 13, 'to': 14, 'for': 15, 'of': 16,
            'with': 17, 'is': 18, 'are': 19, 'was': 20, 'were': 21,
            'be': 22, 'been': 23, 'being': 24, 'have': 25, 'has': 26,
            'had': 27, 'do': 28, 'does': 29, 'did': 30, 'will': 31,
            'would': 32, 'could': 33, 'should': 34, 'may': 35, 'might': 36,
            'must': 37, 'can': 38, 'cant': 39, 'not': 40, 'no': 41, 'yes': 42,
            'i': 43, 'me': 44, 'my': 45, 'you': 46, 'your': 47, 'he': 48,
            'him': 49, 'his': 50, 'she': 51, 'her': 52, 'it': 53, 'its': 54,
            'we': 55, 'us': 56, 'our': 57, 'they': 58, 'them': 59, 'their': 60,
            // Palabras comunes en español
            'el': 61, 'la': 62, 'de': 63, 'que': 64, 'y': 65, 'en': 66,
            'un': 67, 'una': 68, 'es': 69, 'por': 70, 'con': 71, 'para': 72,
            'su': 73, 'al': 74, 'lo': 75, 'como': 76, 'más': 77, 'pero': 78,
            'sus': 79, 'le': 80, 'ya': 81, 'o': 82, 'este': 83, 'sí': 84,
            'porque': 85, 'esta': 86, 'entre': 87, 'cuando': 88, 'muy': 89,
            'sin': 90, 'sobre': 91, 'también': 92, 'hasta': 94, 'hay': 95,
            'donde': 96, 'quien': 97, 'desde': 98, 'todo': 99, 'nos': 100,
        };
    }

    /**
     * Codifica texto a IDs de tokens.
     * @param {string} text - Texto de entrada.
     * @returns {number[]} IDs de los tokens.
     */
    encode(text) {
        if (typeof text !== 'string') {
            return [];
        }
        
        // Simulación simplificada de tokenización SentencePiece.
        // Una implementación real usaría BPE o modelos unigram.
        const tokens = [];
        const normalizedText = text.toLowerCase().replace(/ /g, ' '); // Reemplaza espacios

        let i = 0;
        while (i < normalizedText.length) {
            let foundToken = false;
            // Busca el token más largo que coincida en el vocabulario
            for (let j = normalizedText.length; j > i; j--) {
                const sub = normalizedText.substring(i, j);
                if (this.vocab[sub] !== undefined) {
                    tokens.push(this.vocab[sub]);
                    i = j;
                    foundToken = true;
                    break;
                }
            }
            // Si no se encuentra un token, usa <unk> para el carácter
            if (!foundToken) {
                tokens.push(this.vocab['<unk>']);
                i++;
            }
        }
        return tokens;
    }

    /**
     * Decodifica IDs de tokens a texto.
     * @param {number[]} ids - IDs de los tokens.
     * @returns {string} Texto decodificado.
     */
    decode(ids) {
        if (!Array.isArray(ids)) {
            return '';
        }

        return ids.reduce((acc, id) => {
            const token = this.reverseVocab[id];
            if (token && !['<s>', '</s>', '<pad>'].includes(token)) {
                return acc + token;
            }
            return acc;
        }, '').replace(/ /g, ' ').trim();
    }

    /**
     * Obtiene el tamaño del vocabulario.
     * @returns {number} Tamaño del vocabulario.
     */
    getVocabSize() {
        return Object.keys(this.vocab).length;
    }

    /**
     * Simulación de carga de un modelo SentencePiece.
     * @param {string|ArrayBuffer} modelOrUrl - La URL o el buffer del modelo.
     * @returns {Promise<void>}
     */
    async load(modelOrUrl) {
        console.log(`Simulación: Cargando modelo SentencePiece desde ${typeof modelOrUrl === 'string' ? modelOrUrl : 'buffer'}`);
        // En una implementación real, esto analizaría el archivo del modelo.
        // Aquí solo simulamos un retraso de red.
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log('Simulación: Modelo cargado.');
    }
}

// Exporta para su uso en diferentes entornos (Node.js, Navegador).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SentencePieceTokenizer;
} else if (typeof window !== 'undefined') {
    window.SentencePieceTokenizer = SentencePieceTokenizer;
}