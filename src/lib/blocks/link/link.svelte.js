import { SMART } from "../../utils/operations.utils";
import { untrack } from "svelte";
import { MegaBlock } from "..";
import { Linebreak } from "../linebreak/linebreak.svelte";
import { Text } from "../text/text.svelte";
import LinkC from "./Link.svelte";

/**
* @typedef {import('..').Codex} Codex
* @typedef {import('../../types').Focus} Focus
* @typedef {import('../block.svelte').MegaBlockInit} MegaBlockInit
* @typedef {import('../text/text.svelte').TextInit} TextInit
* @typedef {import('../linebreak/linebreak.svelte').LinebreakInit} LinebreakInit
*/

/**
* @typedef {import('../block.svelte').MegaBlockInit & {
*  children?: (Array<TextInit|LinebreakInit>),
*  href?: string,
*  title?: string,
* }} LinkInit
*/

/**
* @extends {MegaBlock<Text|Linebreak>}
*/
export class Link extends MegaBlock {
    /** @type {import("../block.svelte").MegaBlockManifest} */
    static manifest = {
        type: "link",
        blocks: [Text, Linebreak],
        component: LinkC
    }
    
    /**
    * @param {Codex} codex
    * @param {LinkInit} [init={}]
    */
    constructor(codex, init = {}) {
        super(codex, init);
        
        this.$init();
        
        // this.href = init.href || "";
        // this.title = init.title || "";

        $effect.root(() => {
            $effect(() => {
                if (this.children) untrack(() => this.normalize());
                
            })
        })
    }

    /**
     * 
     * @param {{href: string, title?: string}} data 
     */
    $in(data) {
        super.$in(data);
        if (data.href) this.href = data.href;
        if (data.title) this.title = data.title;
    }
    
    element = $state(/** @type {HTMLAnchorElement|null} */ (null));
    
    href = $state("");
    title = $state("");
    
    // STATE OF CHILDREN :

    /** @type {Number} */
    length = $derived(this.children.reduce((acc, child) => {
        return acc + (child instanceof Text ? child.text.length : 1);
    }, 0));
    
    /** @type {Number} */
    start = $derived(this.before ? (this.before?.end ?? 0) : 0);
    
    /** @type {Number} */
    end = $derived(this.start + this.length);

    text = $derived(this.children.map(child => child instanceof Linebreak ? '\n' : child.text ? child.text : '').join(''));
    
    // SELECTION : 

    /**  @type {MegaBlock['getSelectionStart']} */
    getSelectionStart(firstChild) {
        return firstChild.start + (firstChild instanceof Text && firstChild.selection?.start ? firstChild.selection?.start : 0);
    }
    
    /** @type {MegaBlock['getSelectionEnd']} */
    getSelectionEnd(lastChild) {
        return lastChild.start + (lastChild instanceof Text && lastChild.selection?.end ? lastChild.selection?.end : this.codex?.selection.collapsed ? 0 : 1);
    }

    // EVENTS :

    /** @type {import('../../utils/block.utils').BlockListener<InputEvent>} */
    onbeforeinput = (e) => {
        if (e.inputType === "insertText" && e.data) {
            const selection = this.selection;
            if (!selection) return;
            if (
                this.selection?.isCollapsed &&
                this.children.find((child) => child.selected) instanceof
                    Linebreak
            ) {
                const selected = this.children.find((c) => c.selected);
                const index = this.children.findIndex((c) => c === selected);
                const tx = this.codex?.tx([
                    ...this.prepareInsert({
                        offset: index,
                        blocks: [{ type: "text", init: { text: e.data } }],
                    }),
                ]);
                tx?.execute().then((tx) => {
                    if (selection.start === undefined) return;
                    tx.focus({
                        start: selection.start + 1,
                        end: selection.start + 1,
                        block: this,
                    });
                });
            }
        }
    };

    /** @type {import('../../utils/block.utils').BlockListener<KeyboardEvent>} */
    onkeydown = (e, data) => {
        console.clear();
        if (!this.selection) return;
        
        // NOUVEAU : Gestion de la sortie du Link
        if (e.key === "Escape" && !this.hasModifiers(e)) {
            e.preventDefault();
            return this.transformOut();
        }
        
        if (e.ctrlKey && e.shiftKey && e.key === " ") {
            e.preventDefault();
            return this.transformOut();
        }
        
        if ((e.key === "Enter" && e.shiftKey) && data?.action === "split") {
            e.preventDefault();
            const { block, editData, newTextData} = /** @type {import("../text/text.svelte").SplitData} */ (data);
            const blockIndex = $state.snapshot(block.i);
            const ops = this.ops();
            const offset = this.selection.start || 0;
            if (editData) ops.push(...block.prepare("edit", editData));
            ops.push(...this.prepare('insert', {
                block: Linebreak.data(),
                offset: blockIndex + 1
            }))
            if (newTextData) ops.push(...this.prepare("insert", {
                block: Text.data(newTextData),
                offset: blockIndex + 2
            }));
            this.codex?.tx(ops).execute().then(tx => {
                this.log(offset);
                tx.focus({
                    start: offset + 1,
                    end: offset + 1,
                    block: this,
                })
            })
        } else if (data?.action === "nibble") {
            const { block, what } = /** @type {{block: Text, what: 'previous'|'next'}} */ (data);
            const previous = what === "previous";
            const offset = previous ? block.start - 1 : block.end;
            const blockIndex = block.i;
            const target = previous ? this.selection.start === 0 ? this.before : this.children[blockIndex - 1] : this.children[blockIndex + 1];
            this.log("Nibble target:", target);
            if (this.selection.start === 0 && what === "previous") return this.ascend(e, {
                action: "nibble",
                block: this,
                what: "previous"
            }); else if (this.selection.end === this.length && what === "next") return this.ascend(e, {
                action: "nibble",
                block: this,
                what: "next"
            });
            const ops = this.ops();
            if (!target) return;
            if (target instanceof Text) ops.push(...target.prepare("edit", {
                from: previous ? -2 : 0,
                to: previous ? -1 : 1,
            })) 
            else if (target instanceof Linebreak) ops.push(...target.prepareDestroy());
            this.codex?.tx(ops).execute().then(tx => tx.focus({ start: offset, end: offset, block: this }));

                

        } else if (data?.action === "delete") {
            const { block, key = e.key } = /** @type {{block: Text, key: String}} */ (data);
            const selection = this.selection;
            const ops = this.ops();
            ops.push(...block.prepareDestroy());
            this.codex?.tx(ops).execute().then(tx => {
                tx.focus({start: selection.start, end: selection.start, block: this})
            })
        } else if (e.key === "Enter" && !e.shiftKey) return this.ascend(e);
        }
        
        /**
         * Transforme le Link en Text avec format markdown
         */
        transformOut = () => {
            if (!this.parent || !this.codex) return;
            const selection = this.selection;
            const {start, end} = this;
            
            const tx = this.codex?.tx(this.prepareTransformOut());
            tx?.execute().then(tx => {
                const op = tx.operations.find(op => op.metadata?.replace === true);
                if (!op) return;
                const newBlock = /** @type {Text} */ (op.results[0]);
                console.log(newBlock.element);
                if (newBlock) {

                    tx.focus({
                        start: op.metadata.offset,
                        end: op.metadata.offset,
                        block: newBlock.parent
                    });
                }
            });
        };
    
        /**
         * Prépare les opérations pour transformer le Link en Text
         */
        prepareTransformOut = () => {
            const ops = this.ops();
            const markdownText = this.toMarkdown();
            this.log("Transforming Link to Text with markdown:", markdownText);
            const currentIndex = this.i;
            if (!this.parent) return ops;
            

            ops.add(this.prepare('destroy'));
            ops.add(this.parent.prepare('insert', {
                block: {
                    type: "text",
                    text: markdownText,
                },
                offset: currentIndex,
            }, {
                replace: true,
                selection: $state.snapshot(this.selection),
                offset: $state.snapshot(this.start) + ($state.snapshot(this.selection?.start) || 0) + 1,
            }));
            
            return ops;
        };
    
        /**
         * Génère le markdown du Link
         */
        toMarkdown = () => {
            const text = this.text;
            const href = this.href;
            const title = this.title;
            
            // Cas spécial : Link sans URL valide
            if (!href || href.trim() === '') {
                return text;
            }
            
            // Format markdown standard
            if (title && title.trim() !== '') {
                return `[${text}](${href} "${title}")`;
            } else {
                return `[${text}](${href})`;
            }
        };
    
        /**
         * Hérite les styles du contexte parent
         */
        inheritStylesFromContext = () => {
            // Si le Link est dans un Paragraph, hériter des styles environnants
            if (this.parent) {
                const previousText = this.children[this.i - 1];
                const nextText = this.children[this.i + 1];
                
                // Stratégie : hériter du Text le plus proche avec styles
                if (previousText instanceof Text && this.textHasStyles(previousText)) {
                    return previousText.styles;
                }
                if (nextText instanceof Text && this.textHasStyles(nextText)) {
                    return nextText.styles;
                }
            }
            return {};
        };
    
        /**
         * Vérifie si un Text a des styles appliqués
         */
        textHasStyles = (text) => {
            if (!text || !text.styles) return false;
            return Object.values(text.styles).some(style => style === true);
        };
    
        /**
         * Échappe les caractères spéciaux pour markdown
         */
        escapeMarkdownUrl = (url) => {
            if (!url) return '';
            return url
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/ /g, '%20')
                .replace(/"/g, '\\"');
        };
    
        /**
         * Vérifie la présence de modificateurs clavier
         */
        hasModifiers = (e) => {
            if (!e) return false;
            return e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
        };

    // METHODS :

    normalize = () => {
        if (!this.codex) return;
        Text.normalizeConsecutiveTexts(this);
    }

    /**
    * Récupère les données brutes de découpage du paragraphe aux positions spécifiées
    * @param {{start?: number, end?: number, offset?: number} | SMART} [data=SMART]
    */
    getSplittingData = (data) => {
        // === 1.  Normalisation des paramètres ===
        if (!data) data = SMART;
        if (data === SMART) data = { start: this.selection?.start || 0, end: this.selection?.end || this.selection?.start || 0 };
        else if (data?.offset && (data.start || data.end)) throw new Error("Cannot specify both offset and start/end for split operation.");
        else if (data?.offset) data = { start: data.offset, end: data.offset };
        else if (!data?.start && !data?.end) data = { start: 0, end: 0 };
        const { start = 0, end = 0 } = data;
        
        // Trouver les blocks concernés
        const startBlock = this.children.find((child) => start >= child.start && start <= child.end) || null;
        const endBlock = this.children.find((child) => end >= child.start && end <= child.end) || null;
        
        // Calculer les indices
        const startBlockIndex = startBlock ? this.children.indexOf(startBlock) : -1;
        const endBlockIndex = endBlock ? this.children.indexOf(endBlock) : -1;
        
        // Déterminer les groupes de blocks
        const beforeBlocks = startBlock ? this.children.slice(0, startBlockIndex) : [];
        const middleBlocks = startBlock && endBlock && startBlockIndex < endBlockIndex ? this.children.slice(startBlockIndex + 1, endBlockIndex) : [];
        const afterBlocks = endBlock ? this.children.slice(endBlockIndex + 1).filter((b) => !(b instanceof Linebreak && this.children.at(-1) === b)) : [];
        
        // Récupérer les données de découpage des blocks textuels
        const startSplittingData = startBlock instanceof Text ? startBlock.getSplittingData({
            from: start - startBlock.start, 
            to: endBlock === startBlock ? end - startBlock.start : startBlock.text.length 
        }) : null;
        
        const endSplittingData = endBlock instanceof Text ? endBlock.getSplittingData({
            from: startBlock === endBlock ? start - endBlock.start : 0,
            to: end - endBlock.start,
        }) : null;
        
        return {
            type: /** @type {"link"} */ ("link"),
            start,
            end,
            startBlock,
            endBlock,
            beforeBlocks,
            middleBlocks,
            afterBlocks,
            startSplittingData,
            endSplittingData,
            totalLength: this.length,
        };
    };


    /**
    * @param {Focus} f
    */
    focus = (f) => {
        if (this.element) {
            const data = this.getFocusData(f);
            if (data)
                this.codex?.selection?.setRange(
                data.startElement,
                data.startOffset,
                data.endElement,
                data.endOffset,
            );
            else
                console.warn(
                "Could not get focus data for paragraph:",
                this,
            );
        }
    }

    /**
    * @param {Focus} f
    * @returns
    */
    getFocusData = (f) => {
        let { start, end } = f;
        start ??= 0;
        end ??= start;
        if (start && start < 0) start = this.end + (start + 1);
        if (end && end < 0) end = this.end + (end + 1);
        
        if (start < 0 || end < 0 || start > this.end || end > this.end) {
            console.warn(
                `Invalid focus range: start=${start}, end=${end} for paragraph ${this.index}. Resetting to 0.`,
            );
            start = 0;
            end = 0;
        }
        const startCandidates = this.children.filter(
            (child) => start >= child.start && start <= child.end,
        );
        let startBlock =
        startCandidates.find(
            (child) => child.start === start && child instanceof Text,
        ) || startCandidates[0];
        let endBlock =
        start === end
        ? startBlock
        : this.children.find(
            (child) => end >= child.start && end <= child.end,
        );
        if (
            start === end &&
            startBlock instanceof Linebreak &&
            start === startBlock.end &&
            this.children.find((child) => child.start === start)
        )
        startBlock = endBlock = this.children.find(
            (child) => child.start === start,
        ) || startBlock;
        
        const startData = startBlock
        ? startBlock.getFocusData({
            start: start - startBlock.start,
            end:
            startBlock === endBlock
            ? end - startBlock.start
            : startBlock.length,
        })
        : null;
        const endData = endBlock
        ? endBlock.getFocusData({
            start: end - endBlock.start,
            end: end - endBlock.start,
        })
        : null;
        
        if (startData && endData) {
            return {
                startElement: startData.startElement,
                startOffset: startData.startOffset,
                endElement: endData.endElement,
                endOffset: endData.endOffset,
            };
        } else {
            console.warn(
                "Could not get focus data for blocks:",
                startBlock,
                endBlock,
            );
            return null;
        }
    };

    debug = $derived(
        `${this.selection?.start} - ${this.selection?.end} [s: ${this.start}, e: ${this.end}, length: ${this.length}]`,
    );

    values = $derived({
        json: {
            type: "link",
            children: this.children.map(child => child.values.json),
            href: this.href,
            title: this.title,
        }
    })


    data() {
        return {
            ...super.data(),
            type: /** @type {"link"} */ ("link"),
            href: this.href,
            title: this.title,
        };
    }

    /**
    * @typedef {{ type: 'text', data: string }|string} TextDataType
    * @typedef {{ type: 'json', data: {children: Array<any>, href?: string, title?: string} }} JsonDataType
    * @param {TextDataType|JsonDataType} data
    * @param {import('../block.svelte').BlockDataType} rest
    */
    static data(data, rest = {}) {
        data ??= { type: "json", data: { children: [] }};
        if (typeof data === "string") data = { type: "text", data };
        if (Array.isArray(data)) throw new Error("Invalid data format for Link block.");
        
        if (data.type === "text") {
            // Regex Markdown standard: [text](url) ou [text](url "title")
            const linkRegex = /^\[(.*?)\]\((.*?)(?:\s+["'](.*?)["'])?\)$/s;
            const match = data.data.match(linkRegex);
            
            if (match) {
                const [, text, href, title = ""] = match;
                
                // Parser le texte pour créer les children (Text + Linebreak si \n)
                const texts = text.split("\n").map((t, i, arr) => {
                    const blocks = [];
                    if (t) blocks.push(Text.data({ text: t }));
                    if (i < arr.length - 1) blocks.push(Linebreak.data());
                    return blocks;
                });
                
                return {
                    ...super.data(texts.flat(), rest),
                    href: href.trim(),
                    title: title.trim(),
                };
            }
            
            // Pas de format markdown détecté : fallback texte simple sans lien
            const texts = data.data.split("\n").map((t, i, arr) => {
                const blocks = [];
                if (t) blocks.push(Text.data({ text: t }));
                if (i < arr.length - 1) blocks.push(Linebreak.data());
                return blocks;
            });
            
            return {
                ...super.data(texts.flat(), rest),
                href: "",
                title: "",
            };
        } else if (data.type === "json") {
            return {
                ...super.data(data.data.children, rest),
                href: data.data.href || "",
                title: data.data.title || "",
            };
        }
        
        return super.data([], rest);
    }


    /** @param {import('../block.svelte').MegaBlock} parent */
    static prepareConsecutiveLinksNormalization(parent) {
        const ops = parent.ops();
        const groups = parent.children.reduce((acc, child, i) => {
            const previous = parent.children[i - 1];
            const lastGroup = acc[acc.length - 1] || [];
            if (child instanceof Link && previous instanceof Link && child.href === previous.href && child.title === previous.title) {
                if (lastGroup.includes(previous)) lastGroup.push(child);
                else acc.push([previous, child]);
            }
            return acc;
        }, /** @type {Array<Array<Link>>} */ ([]));

        groups.forEach(group => {
            if (group.length < 2) return;
            const [first, ...rest] = group;
            ops.add(first.prepare("insert", {
                offset: -1,
                blocks: rest.flatMap(link => link.children.map(child => child.values.json))
            }));
            ops.add(...parent.prepareRemove({
                ids: rest.map(link => link.id)
            }));
        });
        return ops;
    }

    /** @param {import('../block.svelte').MegaBlock} parent */
    static normalizeConsecutiveLinks(parent) {
        const ops = Link.prepareConsecutiveLinksNormalization(parent);
        if (ops.length) parent.codex?.effect(ops);
    }
}