import { System } from "../system.svelte";

/**
 * @typedef {Object} ClipboardData
 * @property {string[]} types - Available MIME types
 * @property {function(string): string} getData - Get data by MIME type
 */

/**
 * @typedef {Object} TransformedData
 * @property {'text'|'html'|'markdown'|'json'|'file'} type
 * @property {'plain'|'html'|'markdown'|'json'|'file'} format
 * @property {string|FileData} source
 * @property {Array<BlockData>} blocks
 * @property {Object} metadata
 */

/**
 * @typedef {Object} BlockData
 * @property {string} type
 * @property {string} [content]
 * @property {number} [level]
 * @property {any} [additionalData]
 */

/**
 * @typedef {Object} StructuredInput
 * @property {'text'|'html'|'markdown'|'json'|'file'} type
 * @property {string} content
 * @property {any} [additionalData]
 */

/**
 * @typedef {Object} FileData
 * @property {string} [mimeType]
 * @property {string} [name]
 * @property {number} [size]
 * @property {any} [additionalData]
 */

export class DataTransformSystem extends System {
    static manifest = {
        name: '@codex/data-transform',
        handlers: ['input']
    }

    constructor(priority = 0) {
        super(priority);

        this.handler('input', this.handleInput.bind(this));
    }

    /** 
     * @param {any} raw
     * @returns {TransformedData|null}
     */
    handleInput(raw) {
        if (!raw) return null;
        

        // Cas 1: Données du clipboard avec métadonnées (format moderne)
        if (typeof raw === 'object' && raw.clipboardData) {
            return this.handleClipboardData(raw.clipboardData);
        }

        // Cas 2: Données structurées avec type explicite
        if (typeof raw === 'object' && raw.type) {
            return this.handleStructuredData(raw);
        }

        // Cas 3: Texte brut (fallback pour anciens systèmes ou clipboard simple)
        if (typeof raw === 'string') {
            console.log('Data is a plain string, treating as text.', raw);
            
            return this.handleTextFallback(raw);
        }

        console.log('Unknown data format received in DataTransformSystem:', raw);
        
        // Cas final: convertir en string
        return this.handleTextFallback(String(raw));
    }

    /** @param {ClipboardData} clipboardData
     * @returns {TransformedData|null}
     */
    handleClipboardData(clipboardData) {
        // Ordre de priorité des formats : du plus riche au plus simple
        const formatPriority = [
            'application/json',
            'text/html',
            'text/markdown',
            'text/plain'
        ];

        // Trouver le format le plus riche disponible
        for (const format of formatPriority) {
            if (clipboardData.types.includes(format)) {
                const data = clipboardData.getData(format);

                switch (format) {
                    case 'application/json':
                        return this.transformJSON(data);
                    case 'text/html':
                        return this.transformHTML(data);
                    case 'text/markdown':
                        return this.transformMarkdown(data);
                    case 'text/plain':
                        return this.detectAndTransformText(data);
                }
            }
        }

        // Si aucun format connu, utiliser le premier disponible
        const firstFormat = clipboardData.types[0];
        if (firstFormat) {
            return this.handleTextFallback(clipboardData.getData(firstFormat));
        }

        return null;
    }

    /** @param {StructuredInput} data
     * @returns {TransformedData}
     */
    handleStructuredData(data) {
        switch (data.type) {
            case 'json': return this.transformJSON(data.content);
            case 'html': return this.transformHTML(data.content);
            case 'markdown': return this.transformMarkdown(data.content);
            case 'text': return this.transformText(data.content);
            case 'file': return this.handleFileData(data);
            default: return this.handleTextFallback(String(data.content));
        }
    }

    /** @param {string} text
     * @returns {TransformedData}
     */
    handleTextFallback(text) {
        // Essayer de détecter le format depuis le texte (comportement fallback)
        return this.detectAndTransformText(text);
    }

    /** @param {string} text
     * @returns {TransformedData}
     */
    detectAndTransformText(text) {
        const format = this.detectTextFormat(text);
        console.log('Detected text format:', format);
        

        switch (format) {
            case 'json': return this.transformJSON(text);
            case 'html': return this.transformHTML(text);
            case 'markdown': return this.transformMarkdown(text);
            default: return this.transformText(text);
        }
    }

    /** @param {string} text
     * @returns {'json'|'html'|'markdown'|'plain'}
     */
    detectTextFormat(text) {
        const trimmed = text.trim();

        // Détecter JSON de manière robuste
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                JSON.parse(trimmed);
                return 'json';
            } catch (e) {
                // JSON invalide, continuer les tests
            }
        }

        // Détecter HTML par des patterns communs
        if (trimmed.includes('<') && trimmed.includes('>')) {
            // Vérifier si ça ressemble à du HTML valide
            const htmlPatterns = [
                /<[a-z][\s\S]*>/i,  // balises ouvrantes
                /<\/[a-z][\s\S]*>/i, // balises fermantes
                /<[a-z][^>]*\/>/i    // balises auto-fermantes
            ];

            if (htmlPatterns.some(pattern => pattern.test(trimmed))) {
                return 'html';
            }
        }

        // Détecter markdown par patterns caractéristiques
        const markdownPatterns = [
            /^#{1,6}\s+/m,           // titres
            /^\* /m,                 // listes à puces
            /^\- /m,                 // listes à puces alternatives
            /^1\. /m,                // listes numérotées
            /\*\*.*?\*\*/,          // gras
            /\*.*?\*/,              // italique
            /`.*?`/,                // code inline
            /^```[\s\S]*```$/m       // code blocks
        ];

        if (markdownPatterns.some(pattern => pattern.test(trimmed))) {
            return 'markdown';
        }

        return 'plain';
    }

    /** @param {string} text
     * @returns {TransformedData}
     */
    transformText(text) {
        console.log('Transforming plain text', text);
        
        // Nettoyer le texte et détecter les structures simples
        const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = cleaned.split('\n');
        
        

        const blocks = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed === '') {
                return { type: 'paragraph', content: '' };
            }
            return { type: 'text', content: line };
        });

        return {
            type: 'text',
            format: 'plain',
            source: cleaned,
            blocks: blocks,
            metadata: {
                lineCount: lines.length,
                hasComplexStructure: blocks.some(b => b.type !== 'text')
            }
        };
    }

    /** @param {string} html
     * @returns {TransformedData}
     */
    transformHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        /** @type {BlockData[]} */
        const blocks = [];

        /** 
         *  @param {Node} node
         *  @param {BlockData|null} currentBlock
         */
        const walk = (node, currentBlock = null) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim() || '';
                if (text) {
                    if (!currentBlock) {
                        currentBlock = { type: 'text', content: text };
                        blocks.push(currentBlock);
                    } else {
                        currentBlock.content += ' ' + text;
                    }
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const element = /** @type {Element} */ (node);
                const tagName = element.tagName.toLowerCase();

                if (['p', 'div', 'span'].includes(tagName)) {
                    const newBlock = { type: 'text', content: '' };
                    blocks.push(newBlock);
                    Array.from(node.childNodes).forEach(child => walk(child, newBlock));
                } else if (tagName === 'br') {
                    blocks.push({ type: 'linebreak' });
                } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    const level = parseInt(tagName.substring(1));
                    blocks.push({ type: 'heading', content: element.textContent?.trim() || '', level });
                } else if (tagName === 'ul' || tagName === 'ol') {
                    Array.from(element.children).forEach(li => {
                        if (li.tagName.toLowerCase() === 'li') {
                            blocks.push({ type: 'list-item', content: li.textContent?.trim() || '' });
                        }
                    });
                } else {
                    Array.from(node.childNodes).forEach(child => walk(child, currentBlock));
                }
            }
        };

        walk(doc.body);

        return {
            type: 'html',
            format: 'html',
            source: html,
            blocks: blocks.filter(block => block.content || block.type === 'linebreak'),
            metadata: {
                blockCount: blocks.length,
                hasComplexHTML: true
            }
        };
    }

    /** @param {string} markdown
     * @returns {TransformedData}
     */
    transformMarkdown(markdown) {
        return this.transformText(markdown);
    }

    /** @param {string} json
     * @returns {TransformedData}
     */
    transformJSON(json) {
        try {
            const parsed = JSON.parse(json);
            return {
                type: 'json',
                format: 'json',
                source: json,
                blocks: Array.isArray(parsed) ? parsed : [parsed],
                metadata: { isValid: true }
            };
        } catch (e) {
            return this.transformText(json);
        }
    }

    /** 
     * @param {FileData} fileData
     * @returns {TransformedData}
     */
    handleFileData(fileData) {
        return {
            type: 'file',
            format: 'file',
            source: fileData,
            blocks: [{ type: 'file', ...fileData }],
            metadata: { fileType: fileData.mimeType || 'unknown' }
        };
    }
}