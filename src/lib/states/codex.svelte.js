/**
 * @typedef {Object} CodexInit
* @property {import('../presets/preset').Preset?} [preset] - Preset to be applied to the codex.
* @property {Object<string, import('svelte').Component>} [components] - Initial blocks to be added to the codex.
* @property {Array<typeof import('./block.svelte').Block>} [blocks] - Initial blocks to be added to the codex.
* @property {import('./strategy.svelte').Strategy[]} [strategies] - Initial strategies to be added to the codex.
* @property {import('./system.svelte').System[]} [systems] - Initial systems to be added to the codex.
* @property {string[]} [omit] - List of block, strategies, systems to omit from the codex.
*/

import CodexComponent from '$lib/components/Codex.svelte';
import { MegaBlock } from './block.svelte';
import { CodexSelection } from './selection.svelte';
import { codexStrategies } from './strategies/codex.strategies';
import { Transaction } from '$lib/utils/operations.utils';
import { History } from './history.svelte';
import { Focus } from '$lib/values/focus.values';
import { MinimalPreset } from '$lib/presets';

export const initialStrategies = [
    ...codexStrategies
]

export class Codex extends MegaBlock {

    /** @type {import("./block.svelte").MegaBlockManifest} */
    static manifest = {
        type: 'codex',
        blocks: [],
        strategies: initialStrategies,
        systems: [],
        component: CodexComponent
    }

    /**
    * Creates an instance of Codex.
    * @param {CodexInit} [init] - Initial configuration for the codex.
    */
    constructor(init = {}) {
        super(null);
        
        /** @type {CodexInit} */
        this.init = init;

        /** @type {import('../presets/preset').Preset | null} */
        this.preset = init.preset || init.preset === null ? init.preset : MinimalPreset;

        /** @type {Object<string, import('svelte').Component>} */
        this.components = init.components || {}
        this.selection = new CodexSelection(this);
        this.history = new History();

        this.omited = {
            blocks: init.omit?.filter(name => name.startsWith('block:')).map(name => name.replace('block:', '')) || [],
            strategies: init.omit?.filter(name => name.startsWith('strategy:')).map(name => name.replace('strategy:', '')) || [],
            systems: init.omit?.filter(name => name.startsWith('system:')).map(name => name.replace('system:', '')) || [],
        }
        
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

        this.preset?.debug();
    }

    get blocks() {
        return [...(this.preset?.blocks.filter(b => !this.omited.blocks.includes(b.manifest.type) && !(this.init.blocks || []).find(b2 => b2.manifest.type === b.manifest.type)) || []), ...(this.init?.blocks || [])];
    }

    get strategies() {
        return this.init.strategies || super.strategies;
    }

    get systems() {
        return [...(this.preset?.systems.filter(s => !this.omited.systems.includes(s.manifest.type) && !(this.init.systems || []).find(s2 => s2.manifest.type === s.manifest.type)) || []).map(S => new S()), ...(this.init?.systems || [])];
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

    /** @param {Omit<CodexInit, 'preset'>} init */
    static blank(init = {}) {
        return new Codex({
            preset: null,
            ...init
        })
    }
}