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
import { multiBlockBackspaceStrategy, codexStrategies } from './strategies/codex.strategies';
import { Transaction } from '$lib/utils/operations.utils';
import { History } from './history.svelte';
import { ParagraphSystem } from './systems/paragraph.system.svelte';
import { DataTransformSystem } from './systems/codex.system.svelte';
import { Focus } from '$lib/values/focus.values';

/** @typedef {import('$lib/values/focus.values').Focus} Focus */

export const initialComponents = {
    codex: CodexComponent,
    text: TextComponent,
    paragraph: ParagraphComponent,
    linebreak: LinebreakComponent
}

export const initialBlocks = [
    Paragraph,
]

export const initialSystems = [
    new ParagraphSystem(0),
    new DataTransformSystem(1),
]

export const initialStrategies = [
    ...codexStrategies
]

export class Codex extends MegaBlock {

    /** @type {import("./block.svelte").MegaBlockManifest} */
    static manifest = {
        type: 'codex',
        blocks: {
            paragraph: Paragraph
        },
        strategies: initialStrategies,
        systems: [
            ...initialSystems
        ],
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
        
        $effect.root(() => {
            $effect(() => {
                if (this.element) {
                    this.selection.observe(this.element);
                    this.enforceRequiredStyles();

                    const inits = this.systems.filter(s => s.handlers.has('init')).sort((a, b) => b.priority - a.priority).map(s => s.handlers.get('init'));
                    inits.forEach(init => init(this));
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

    /** @param {import('$lib/utils/operations.utils').Operation[]} ops  */
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

    /** @param {Focus} f */
    getFocusData(f) {
        const {start, end} = f;

        const startNode = this.children.find(b => b.start <= start && b.end >= start);
        const endNode = start === end ? startNode : this.children.find(b => b.start <= end && b.end >= end);

        if (startNode && endNode) {
            const startFocus = startNode.getFocusData(new Focus(start - startNode.start, startNode === endNode ? end - startNode.start : startNode.length));
            const endFocus = startNode === endNode ? startFocus : endNode.getFocusData(new Focus(0, end - endNode.start));
            if (!startFocus) throw new Error("Start focus data not found");
            if (!endFocus) throw new Error("End focus data not found");
            return { startElement: startFocus.startElement, startOffset: startFocus.startOffset, endElement: endFocus.endElement, endOffset: endFocus.endOffset };
        }
    }

    /**
     * @param {{
     *  start: { node: Node, offset: number },
     *  end?: { node: Node, offset: number }
     * }} focus
     */
    setRange = focus => this.selection.setRange(focus.start.node, focus.start.offset, focus.end?.node || focus.start.node, focus.end?.offset || focus.start.offset);

}