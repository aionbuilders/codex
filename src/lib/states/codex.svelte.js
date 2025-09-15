/**
* @typedef {Object} CodexInit
* @property {Object<string, import('svelte').Component>} [components] - Initial blocks to be added to the codex.
* @property {(codex: Codex) => void} [onInit] - Callback function to be called when the codex is initialized.
* @property {import('./strategy.svelte').Strategy[]} [strategies] - Initial strategies to be added to the codex.
*/

import CodexComponent from '$lib/components/Codex.svelte';
import TextComponent from '$lib/components/Text.svelte';
import ParagraphComponent from '$lib/components/Paragraph.svelte';
import { MegaBlock } from './block.svelte';
import { Paragraph } from './blocks/paragraph.svelte';
import { CodexSelection } from './selection.svelte';
import LinebreakComponent from '$lib/components/Linebreak.svelte';
import { TextSystem } from './systems/textSystem.svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { multiBlockBackspaceStrategy, codexStrategies } from './strategies/codex.strategies';
import { Transaction } from '$lib/utils/operations.utils';
import { History } from './history.svelte';

export const initialComponents = {
    codex: CodexComponent,
    text: TextComponent,
    paragraph: ParagraphComponent,
    linebreak: LinebreakComponent
}

export const initialBlocks = [
    Paragraph,
]

export const initialSystems = {
    text: TextSystem,
}

export const initialStrategies = [
    ...codexStrategies
]

/**
* @param {Codex} codex
*/
export const onInit = codex => {
    const lastChild = codex.children[codex.children.length - 1];
    if (!lastChild || !(lastChild instanceof Paragraph)) {
        codex.children = [...codex.children, new Paragraph(codex)];
    }
}

export class Codex extends MegaBlock {

    static manifest = {
        type: 'codex',
        blocks: {
            paragraph: Paragraph
        },
        strategies: initialStrategies
    }

    /**
    * Creates an instance of Codex.
    * @param {CodexInit} [init] - Initial configuration for the codex.
    */
    constructor(init = {}) {
        super(null);
        
        /** @type {Object<string, import('svelte').Component>} */
        this.components = init.components || initialComponents;
        
        this.selection = new CodexSelection(this);

        this.history = new History();
        
        this.systems = new SvelteMap();
        for (const [name, System] of Object.entries(initialSystems)) {
            try {
                this.systems.set(name, new System(this));
                console.log(`Initialized system "${name}"`);
            } catch (error) {
                console.error(`Failed to initialize system "${name}":`, error);
            }
        }
        
        $effect.root(() => {
            $effect(() => {
                if (this.element) {
                    this.selection.observe(this.element);
                    this.enforceRequiredStyles();
                    init.onInit?.(this) || onInit(this);
                }
            })
        })
    }
    
    /** @type {HTMLDivElement?} */
    element = $state(null);
    
    /**
     * Enforce required CSS styles on the element
     * Forces user-select: text, white-space: pre-wrap, word-break: break-word
     */
    enforceRequiredStyles() {
        if (!this.element) return;
        
        const computedStyle = getComputedStyle(this.element);
        const requiredStyles = {
            'user-select': 'text',
            'white-space': 'pre-wrap', 
            'word-break': 'break-word'
        };
        
        for (const [property, value] of Object.entries(requiredStyles)) {
            if (computedStyle.getPropertyValue(property) !== value) {
                this.element.style.setProperty(property, value, 'important');
            }
        }
    }
    
    // debug = $derived({
    //     elements: this.children.map(child => child.debug || {}),
    // });
    
    debug = $derived(`codex |\n${this.children.map(child => child.debug || {}).join(' + ')}`);
    
    
    /**
     * Generic event handler with ascension logic
     * @param {Event} e - The event object
     * @param {string} eventType - The event type (e.g., 'keydown', 'input', 'beforeinput')
     * @param {string} strategyTag - The strategy tag to look for
     * @param {function(any): void} [ascendCallback] - Callback for handling ascended data
     */
    handleEvent = (e, eventType, strategyTag, ascendCallback) => {
        const context = {event: e};
        let currentParent = this.selection?.parent;

        if (currentParent && currentParent instanceof MegaBlock) {
            if (eventType === 'beforeinput' && currentParent === this) e.preventDefault();
            
            while (currentParent) {
                const strategy = currentParent.strategies?.filter(s => s.tags.includes(strategyTag)).find(s => s.canHandle(this, context));
                if (strategy) {
                    e.preventDefault();
                    strategy.execute(this, {...context, block: currentParent});
                    return;
                }
                currentParent = currentParent.parent || (currentParent === this ? null : this);
            }
        } else if (currentParent) {
            const handlers = this.selection?.anchoredBlocks.map(block => block[eventType]).filter(handler => typeof handler === 'function');
            if (handlers.length === 0) return;
            
            let handler = handlers.at(-1);
            /** @param {any} data */
            const ascend = (data) => {
                const hIndex = handlers.indexOf(handler);
                if (hIndex > 0) {
                    handler = handlers[hIndex - 1];
                    handler(e, ascend, data);
                } else if (ascendCallback && data) {
                    // Event has ascended to codex level - use callback instead of full dispatch
                    ascendCallback(data);
                }
            };
            handler(e, ascend);
        } else if (eventType === 'beforeinput') {
            e.preventDefault();
        }
    }

    /** @param {InputEvent} e */
    onbeforeinput = e => this.handleEvent(e, 'onbeforeinput', 'beforeinput');

    /** @param {InputEvent} e */
    oninput = e => this.handleEvent(e, 'oninput', 'input');
    
    /** @param {KeyboardEvent} e */
    onkeydown = e => this.handleEvent(e, 'onkeydown', 'keydown');

    /** @param {import('$lib/utils/operations.utils').Operation[]} ops */
    tx = (ops) => new Transaction(ops, this)

    /** @param {import('$lib/utils/operations.utils').Operation[]} ops  */
    effect = (ops) => {
        const current = this.history.current;

        if (!current) return console.warn("No current transaction in history for effect");
        if (!ops?.length) return console.warn("No operations provided for effect");

        /** @type {any[]} */
        const results = [];

        ops.forEach(op => {
            current.operations.add(op);
            try {
                const r = op.execute(current);
                results.push(r);
            } catch (error) {
                console.error("Error executing operation:", error);
                current.operations.delete(op);
                return;
            }
        });

        return results;
    }


    /**
     * @param {{
     *  start: { node: Node, offset: number },
     *  end?: { node: Node, offset: number }
     * }} focus
     */
    focus = (focus) => requestAnimationFrame(() => this.selection.setRange(focus.start.node, focus.start.offset, focus.end?.node || focus.start.node, focus.end?.offset || focus.start.offset));

    /**
     * @param {{
     *  start: { node: Node, offset: number },
     *  end?: { node: Node, offset: number }
     * }} focus
     */
    setRange = focus => this.selection.setRange(focus.start.node, focus.start.offset, focus.end?.node || focus.start.node, focus.end?.offset || focus.start.offset);

}