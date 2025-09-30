import { Paragraph } from '$lib/blocks';

/**
 * Générateur de données de paragraphes aléatoires pour tester Codex
 * @param {Object} options - Options de génération
 * @param {number} [options.count=10] - Nombre de paragraphes à générer
 * @param {number} [options.minWords=20] - Nombre minimum de mots par paragraphe
 * @param {number} [options.maxWords=150] - Nombre maximum de mots par paragraphe
 * @param {number} [options.linebreakProbability=0.15] - Probabilité d'insérer un linebreak (0-1)
 * @param {number} [options.minLinebreaks=0] - Nombre minimum de linebreaks par paragraphe
 * @param {number} [options.maxLinebreaks=5] - Nombre maximum de linebreaks par paragraphe
 * @returns {Array<import('./states/blocks/paragraph.svelte').ParagraphInit>}
 */
export function generateMockParagraphs(options = {}) {
    const {
        count = 10,
        minWords = 20,
        maxWords = 150,
        linebreakProbability = 0.15,
        minLinebreaks = 0,
        maxLinebreaks = 5
    } = options;

    // Vocabulaire lorem ipsum étendu
    const words = [
        'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
        'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
        'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
        'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
        'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
        'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
        'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
        'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'vitae', 'mauris',
        'pellentesque', 'habitant', 'morbi', 'tristique', 'senectus', 'netus', 'fames',
        'turpis', 'egestas', 'integer', 'malesuada', 'cursus', 'faucibus', 'ornare',
        'suspendisse', 'ultrices', 'gravida', 'dictum', 'fusce', 'placerat', 'lectus',
        'vestibulum', 'mattis', 'ullamcorper', 'posuere', 'cubilia', 'curae', 'donec',
        'pretium', 'vulputate', 'sapien', 'nec', 'sagittis', 'aliquam', 'eleifend',
        'mi', 'quis', 'eros', 'donec', 'ac', 'odio', 'tempus', 'quam', 'scelerisque',
        'venenatis', 'lacus', 'laoreet', 'non', 'curabitur', 'gravida', 'arcu', 'ac'
    ];

    /**
     * Génère un nombre aléatoire entre min et max (inclus)
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    /**
     * Choisit un élément aléatoire dans un array
     * @template T
     * @param {T[]} arr
     * @returns {T}
     */
    const randomChoice = (arr) => arr[random(0, arr.length - 1)];

    /**
     * Génère un texte avec des linebreaks aléatoires
     * @param {number} wordCount
     * @returns {string}
     */
    const generateParagraphText = (wordCount) => {
        const paragraphWords = [];
        const targetLinebreaks = random(minLinebreaks, maxLinebreaks);
        
        // Positions où on va insérer des linebreaks
        const linebreakPositions = new Set();
        if (targetLinebreaks > 0 && wordCount > 2) {
            while (linebreakPositions.size < targetLinebreaks) {
                // Ne pas mettre de linebreak au tout début ou à la toute fin
                const position = random(1, wordCount - 2);
                linebreakPositions.add(position);
            }
        }

        for (let i = 0; i < wordCount; i++) {
            const word = randomChoice(words);
            
            // Première lettre en majuscule parfois (début de phrase)
            const shouldCapitalize = i === 0 || Math.random() < 0.1;
            const finalWord = shouldCapitalize 
                ? word.charAt(0).toUpperCase() + word.slice(1)
                : word;
            
            paragraphWords.push(finalWord);
            
            // Ajouter de la ponctuation aléatoirement
            if (Math.random() < 0.15 && i < wordCount - 1) {
                const punctuation = randomChoice([',', '.', ';']);
                paragraphWords[paragraphWords.length - 1] += punctuation;
            }
            
            // Insérer un linebreak si on est à une position prévue
            if (linebreakPositions.has(i)) {
                paragraphWords.push('\n');
            }
        }

        // Point final
        const lastWord = paragraphWords[paragraphWords.length - 1];
        if (!lastWord.match(/[.!?]$/)) {
            paragraphWords[paragraphWords.length - 1] += '.';
        }

        return paragraphWords.join(' ').replace(' \n ', '\n');
    };

    // Générer les paragraphes
    const paragraphs = [];
    for (let i = 0; i < count; i++) {
        const wordCount = random(minWords, maxWords);
        const text = generateParagraphText(wordCount);
        paragraphs.push(text);
    }

    return paragraphs;
}

/**
 * Wrapper pour générer directement des données Codex
 * @param {Object} options - Options de génération (voir generateMockParagraphs)
 */
export function generateMockCodexData(options = {}) {
    const paragraphs = generateMockParagraphs(options);
    return paragraphs.map(text => Paragraph.data(text));
}