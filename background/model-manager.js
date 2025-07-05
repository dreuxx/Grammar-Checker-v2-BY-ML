export class ModelManager {
    constructor() {
        this.encoder = null;
        this.decoder = null;
        this.decoderWithPast = null;
        this.tokenizer = null;
        this.ready = false;
        this.loading = false;
        this.cache = new Map();
    }
    
    async initialize() {
        if (this.ready || this.loading) return;
        
        this.loading = true;
        
        try {
            // Cargar ONNX Runtime
            const ort = await import(chrome.runtime.getURL('lib/onnxruntime-web.min.js'));
            
            // Configurar WASM
            ort.env.wasm.wasmPaths = chrome.runtime.getURL('lib/');
            
            // Cargar modelos en paralelo
            const [encoder, decoder, decoderWithPast] = await Promise.all([
                ort.InferenceSession.create(
                    chrome.runtime.getURL('models/encoder_model_int8.onnx'),
                    { executionProviders: ['wasm'] }
                ),
                ort.InferenceSession.create(
                    chrome.runtime.getURL('models/decoder_model_int8.onnx'),
                    { executionProviders: ['wasm'] }
                ),
                ort.InferenceSession.create(
                    chrome.runtime.getURL('models/decoder_with_past_model_int8.onnx'),
                    { executionProviders: ['wasm'] }
                )
            ]);
            
            this.encoder = encoder;
            this.decoder = decoder;
            this.decoderWithPast = decoderWithPast;
            
            // Cargar tokenizer
            await this.loadTokenizer();
            
            this.ready = true;
            this.loading = false;
            
            console.log('✅ Model loaded successfully');
            
        } catch (error) {
            console.error('Error loading model:', error);
            this.loading = false;
            throw error;
        }
    }
    
    async loadTokenizer() {
        // Cargar configuración del tokenizer
        const configResponse = await fetch(
            chrome.runtime.getURL('models/tokenizer_config.json')
        );
        const config = await configResponse.json();
        
        // Cargar SentencePiece model
        const spmResponse = await fetch(
            chrome.runtime.getURL('models/spiece.model')
        );
        const spmBuffer = await spmResponse.arrayBuffer();
        
        // Inicializar tokenizer (simplificado - usar librería real en producción)
        this.tokenizer = {
            config: config,
            encode: (text) => this.tokenizeText(text),
            decode: (ids) => this.detokenizeIds(ids)
        };
    }
    
    tokenizeText(text) {
        // Implementación simplificada
        // En producción, usar SentencePiece.js
        const tokens = text.toLowerCase().split(/\s+/);
        const vocab = this.tokenizer.config.vocab || {};
        const ids = tokens.map(token => vocab[token] || vocab['<unk>']);
        return ids;
    }
    
    detokenizeIds(ids) {
        const vocab = this.tokenizer.config.vocab || {};
        const reverseVocab = Object.fromEntries(
            Object.entries(vocab).map(([k, v]) => [v, k])
        );
        return ids.map(id => reverseVocab[id] || '').join(' ').trim();
    }
    
    async correct(text, language) {
        if (!this.ready) {
            throw new Error('Model not ready');
        }
        
        // Check cache
        const cacheKey = `${language}:${text}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Preparar input
        const langMap = {
            'en': 'inglés',
            'es': 'español',
            'fr': 'francés',
            'de': 'alemán',
            'ru': 'ruso'
        };
        
        const prefix = `corregir ${langMap[language] || 'español'}: `;
        const fullText = prefix + text;
        
        // Tokenizar
        const inputIds = this.tokenizer.encode(fullText);
        const attentionMask = new Array(inputIds.length).fill(1);
        
        // Crear tensores
        const ort = await import(chrome.runtime.getURL('lib/onnxruntime-web.min.js'));
        const inputTensor = new ort.Tensor('int64', inputIds, [1, inputIds.length]);
        const maskTensor = new ort.Tensor('int64', attentionMask, [1, attentionMask.length]);
        
        // Encoder
        const encoderOutputs = await this.encoder.run({
            input_ids: inputTensor,
            attention_mask: maskTensor
        });
        
        // Decoder (generación autoregresiva simplificada)
        const correctedIds = await this.generate(
            encoderOutputs,
            maskTensor,
            ort
        );
        
        // Detokenizar
        const correctedText = this.tokenizer.decode(correctedIds);
        
        // Cache result
        this.cache.set(cacheKey, correctedText);
        
        // Limpiar cache si es muy grande
        if (this.cache.size > 1000) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        return correctedText;
    }
    
    async generate(encoderOutputs, encoderAttentionMask, ort) {
        const maxLength = 256;
        const outputIds = [0]; // Start token
        
        for (let i = 0; i < maxLength; i++) {
            const decoderInputIds = new ort.Tensor(
                'int64', 
                outputIds, 
                [1, outputIds.length]
            );
            
            const decoderOutputs = await this.decoder.run({
                input_ids: decoderInputIds,
                encoder_hidden_states: encoderOutputs.last_hidden_state,
                encoder_attention_mask: encoderAttentionMask
            });
            
            // Get next token (simplified - real implementation would use beam search)
            const logits = decoderOutputs.logits;
            const nextTokenId = this.argmax(logits.data.slice(-this.tokenizer.config.vocab_size));
            
            if (nextTokenId === 1) { // End token
                break;
            }
            
            outputIds.push(nextTokenId);
        }
        
        return outputIds.slice(1); // Remove start token
    }
    
    argmax(array) {
        let maxIndex = 0;
        let maxValue = array[0];
        
        for (let i = 1; i < array.length; i++) {
            if (array[i] > maxValue) {
                maxValue = array[i];
                maxIndex = i;
            }
        }
        
        return maxIndex;
    }
    
    isReady() {
        return this.ready;
    }
    
    isLoading() {
        return this.loading;
    }
}