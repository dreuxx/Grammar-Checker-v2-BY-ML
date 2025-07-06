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
 * A mock sentence piece tokenizer for testing.
 *
 * This class is a mock implementation of the SentencePiece tokenizer. It is
 * intended for testing purposes only and does not represent the full

 * functionality of the real SentencePiece library.
 */
class SentencePieceTokenizer {
    /**
     * Constructor for SentencePieceTokenizer.
     *
     * @param {Object} [config] - Optional configuration.
     * @param {Object} [config.vocab] - A mock vocabulary mapping tokens to IDs.
     */
    constructor(config = {}) {
        // Mock vocabulary - in a real scenario, this would be loaded from a model file.
        this.vocab = config.vocab || {
            '<pad>': 0,
            '<s>': 1,
            '</s>': 2,
            '<unk>': 3,
            ' ': 4, // Note:  is the sentence piece space character.
            // Common English words
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
            // Common Spanish words
            'el': 61, 'la': 62, 'de': 63, 'que': 64, 'y': 65, 'en': 66,
            'un': 67, 'una': 68, 'es': 69, 'por': 70, 'con': 71, 'para': 72,
            'su': 73, 'al': 74, 'lo': 75, 'como': 76, 'más': 77, 'pero': 78,
            'sus': 79, 'le': 80, 'ya': 81, 'o': 82, 'este': 83, 'sí': 84,
            'porque': 85, 'esta': 86, 'entre': 87, 'cuando': 88, 'muy': 89,
            'sin': 90, 'sobre': 91, 'también': 92, /* 'me': 93, */ 'hasta': 94, 'hay': 95,
            'donde': 96, 'quien': 97, 'desde': 98, 'todo': 99, 'nos': 100,
        };

        // Reverse vocabulary for decoding.
        this.reverseVocab = {};
        for (const [word, id] of Object.entries(this.vocab)) {
            this.reverseVocab[id] = word;
        }
    }

    /**
     * Encode text to token IDs.
     * @param {string} text - Input text.
     * @returns {number[]} Token IDs.
     */
    encode(text) {
        // This is a simplified mock of SentencePiece tokenization.
        // A real implementation uses BPE or unigram models.
        const tokens = [];
        const normalizedText = text.toLowerCase().replace(/ /g, ' '); // Replace space with sentence piece space

        // Simple greedy tokenization based on the vocabulary
        let i = 0;
        while (i < normalizedText.length) {
            let foundToken = false;
            // Find the longest matching token in the vocab
            for (let j = normalizedText.length; j > i; j--) {
                const sub = normalizedText.substring(i, j);
                if (this.vocab[sub] !== undefined) {
                    tokens.push(this.vocab[sub]);
                    i = j;
                    foundToken = true;
                    break;
                }
            }
            // If no token is found, use <unk> for the character
            if (!foundToken) {
                tokens.push(this.vocab['<unk>']);
                i++;
            }
        }

        return tokens;
    }

    /**
     * Decode token IDs to text.
     * @param {number[]} ids - Token IDs.
     * @returns {string} Decoded text.
     */
    decode(ids) {
        if (!ids || !Array.isArray(ids)) {
            return '';
        }

        const tokens = ids
            .map(id => this.reverseVocab[id] || '')
            .filter(token => !['<s>', '</s>', '<pad>'].includes(token));

        // Join tokens and replace sentence piece space with a regular space.
        return tokens.join('').replace(/ /g, ' ').trim();
    }

    /**
     * Get vocabulary size.
     * @returns {number} Vocabulary size.
     */
    getVocabSize() {
        return Object.keys(this.vocab).length;
    }

    /**
     * Mock loading of a SentencePiece model.
     * @param {string|ArrayBuffer} modelOrUrl - The model URL or buffer.
     * @returns {Promise<void>}
     */
    async load(modelOrUrl) {
        console.log(`Mock: Loading SentencePiece model from ${typeof modelOrUrl === 'string' ? modelOrUrl : 'buffer'}`);
        // In a real implementation, this would parse the model file.
        // Here we just simulate a network delay.
        await new Promise(resolve => setTimeout(resolve, 50));
        console.log('Mock: Model loaded.');
    }
}

// Export for use in different environments (Node.js, Browser).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SentencePieceTokenizer;
} else if (typeof window !== 'undefined') {
    window.SentencePieceTokenizer = SentencePieceTokenizer;
}