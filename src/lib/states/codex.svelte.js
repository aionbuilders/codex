/**
* @typedef {Object} CodexInit
* @property {import('../presets/preset').Preset?} [preset] - Preset to be applied to the codex.
* @property {Object<string, import('svelte').Component>} [components] - Initial blocks to be added to the codex.
* @property {Array<typeof import('./block.svelte').Block>} [blocks] - Initial blocks to be added to the codex.
* @property {import('./strategy.svelte').Strategy[]} [strategies] - Initial strategies to be added to the codex.
* @property {typeof import('./system.svelte').System[]} [systems] - Initial systems to be added to the codex.
* @property {Record<string, any>} [config] - Configuration options for the codex and its preset.
* @property {string[]} [omit] - List of block, strategies, systems to omit from the codex.
*/

import CodexComponent from '../components/Codex.svelte';
import { Block, MegaBlock } from './block.svelte';
import { CodexSelection } from './selection.svelte';
import { codexStrategies } from './strategies/codex.strategies';
import { Transaction } from '../utils/operations.utils';
import { History } from './history.svelte';
import { browser } from '$app/environment';
import { untrack } from 'svelte';
import { PlainPreset } from '../presets';
import { SvelteMap } from 'svelte/reactivity';

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
    * @param {CodexInit & import('./block.svelte').BlockInit} [init] - Initial configuration for the codex.
    */
    constructor(init = {}) {
        super(null, init);

        /** @type {CodexInit} */
        this.init = init;

        /** @type {import('../presets/preset').Preset | null} */
        this.preset = init.preset || init.preset === null ? init.preset : PlainPreset;

        /** @type {Object<string, import('svelte').Component>} */
        this.components = init.components || {}
        this.selection = new CodexSelection(this);
        this.history = new History();

        /** @type {Map<string, Block>} */
        this.registry = new SvelteMap();

        this.omited = {
            blocks: init.omit?.filter(name => name.startsWith('block:')).map(name => name.replace('block:', '')) || [],
            strategies: init.omit?.filter(name => name.startsWith('strategy:')).map(name => name.replace('strategy:', '')) || [],
            systems: init.omit?.filter(name => name.startsWith('system:')).map(name => name.replace('system:', '')) || [],
        }

        $effect.root(() => {
            $effect(() => {
                if (this.element) {
                    untrack(() => {
                        if (!this.element) return;
                        this.selection.observe(this.element);
                        this.enforceRequiredStyles();

                        
                        const Systems =  [...(this.preset?.systems.filter(s => !this.omited.systems.includes(s.manifest.name) && !(this.init.systems || []).find(s2 => s2.manifest.name === s.manifest.name)) || []), ...(this.init?.systems || [])];
                        this.systems = Systems.map(SystemClass => new SystemClass(this));

                        const inits = this.systems.filter(s => s.handlers.has('init')).map(s => s.handlers.get('init'));
                        inits.forEach(init => init(this));
                    });
                }
            })

            $effect(() => {
                this.recursive;
                untrack(() => { 
                    this.registry.clear();
                    this.recursive.forEach((b, i) => {
                        b.index = i;
                        this.registry.set(b.id, b);
                    });
                })
            });
        })

        this.$init();
    }

    get blocks() {
        return [...(this.preset?.blocks.filter(b => !this.omited.blocks.includes(b.manifest.type) && !(this.init.blocks || []).find(b2 => b2.manifest.type === b.manifest.type)) || []), ...(this.init?.blocks || [])];
    }

    // Dans codex.svelte.js
    get strategies() {
        return [
            // Strategies du preset (filtrées par omit)
            ...(this.preset?.strategies?.filter(s => 
                !this.omited.strategies.includes(s.name)
            ) || []),
            // Strategies de l'init
            ...(this.init?.strategies || []),
            // Strategies du manifest (base)
            ...(super.strategies || [])
        ];
    }


    /** @type {import('./system.svelte').System[]} */
    systems = $state([]);

    get config() {
        return {
            ...(this.preset?.config || {}),
            ...(this.init?.config || {})
        };
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
        try {
            const context = {event: e};

            // First check codex-level strategies (tagged with "@codex")
            const codexStrategy = this.strategies?.filter(s => s.tags.includes('@codex') && s.tags.includes(strategyTag)).find(s => s.canHandle(this, context));
            if (codexStrategy) {
                e.preventDefault();
                codexStrategy.execute(this, {...context, block: this});
                return;
            }

            let currentParent = this.selection?.parent;

            if (currentParent && currentParent instanceof MegaBlock) {
                if (eventType === 'beforeinput' && currentParent === this) e.preventDefault();
                
                while (currentParent) {
                    if (!(currentParent instanceof MegaBlock)) break;
                    const strategy = currentParent.strategies?.filter(s => s.tags.includes(strategyTag)).find(s => s.canHandle(this, context));
                    if (strategy) {
                        e.preventDefault();
                        strategy.execute(this, {...context, block: currentParent});

                        return;
                    }
                    currentParent = currentParent.parent || (currentParent === this ? null : this);
                }

            } else if (currentParent) {
                // @ts-ignore
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
        } catch (error) {

        }
        

        
    }

    /** @param {InputEvent} e */
    onbeforeinput = e => this.handleEvent(e, 'onbeforeinput', 'beforeinput');

    /** @param {InputEvent} e */
    oninput = e => this.handleEvent(e, 'oninput', 'input');
    
    /** @param {KeyboardEvent} e */
    onkeydown = e => {
        
        this.handleEvent(e, 'onkeydown', 'keydown');
    }

    /** @param {import('../utils/operations.utils').Operation[]} ops  */
    tx = (ops) => new Transaction(ops, this)

    /** @param {import('../utils/operations.utils').Operation[]} ops  */
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
     * Calls a method on the block.
     * @param {String} name
     * @param {...any} args
     * @returns {any}
     */
    call(name, ...args) {
        console.log(this.systems);
        const method = this.systems.find(s => s.methods.has(name))?.methods.get(name);
        console.log('Calling method:', name, 'with args:', args, 'found method:', method);
        if (!method) return super.call(name, ...args);
        return method(...args);
    }

    /**
     * @param {{
     *  start?: number,
     *  end?: number,
     *  offset?: number,
     *  block?: import('./block.svelte').Block|string
     * }} focus
     * @param {{tx?: Transaction|boolean}} options
     */
    focus = (focus, options = {}) => queueMicrotask(() =>{
        
        const {start = focus.offset || 0, end = focus.offset || focus.start || 0} = focus;

        const blockId = typeof focus.block === 'string' ? focus.block : focus.block?.id;

        if (options.tx) {
            const tx = options.tx instanceof Transaction ? options.tx : this.history.current || this.history.transactions[this.history.index] || null;
            if (!tx) throw new Error("No transaction available for focus operation");
            tx.selectionAfter = {...focus, start, end, ...(focus.block ? { block: blockId } : {})};
        }

        const block = typeof focus.block === 'string' ? this.recursive.find(b => b.id === focus.block) : focus.block || this;
        if (!block) throw new Error("Block not found for focus operation");
        const data = block.getFocusData({ start, end });
        if (data) this.setRange({
            start: {node: data.startElement, offset: data.startOffset},
            end: {node: data.endElement, offset: data.endOffset}
        });
        
    });

    /**
     * @param {{start: number, end: number}} f
     */
    getFocusData(f) {
        const {start, end} = f;

        const startBlock = this.children.find(b => b.start <= start && b.end >= start);
        const endBlock = start === end ? startBlock : this.children.find(b => b.start <= end && b.end >= end);

        if (startBlock && endBlock) {
            const startFocus = startBlock.getFocusData({
                start: start - startBlock.start,
                end: startBlock === endBlock ? end - startBlock.start : startBlock.length
            })
            const endFocus = startBlock === endBlock ? startFocus : endBlock.getFocusData({
                start: 0,
                end: end - endBlock.start
            });
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
    setRange = focus => requestAnimationFrame(() => this.selection.setRange(focus.start.node, focus.start.offset, focus.end?.node || focus.start.node, focus.end?.offset || focus.start.offset));

    getSelection = () => {
        const startBlock = this.children.find(b => b.selected);
        const endBlock = this.children.findLast(b => b.selected);
        return {
            start: startBlock && startBlock.start + (startBlock.selection ? startBlock.selection.start : 0) || 0,
            end: endBlock && endBlock.start + (endBlock.selection ? endBlock.selection.end : 0) || 0,
        }
    }

    /** @param {Omit<CodexInit, 'preset'>} init */
    static blank(init = {}) {
        return new Codex({
            preset: null,
            ...init
        })
    }

    values = $derived({
        text: this.children.map(c => c.values.text).join('\n\n'),
        json: { type: 'codex', children: this.children.map(c => c.values.json), root: true }
    })


    /**
     * Helper to create input data for codex
     * @param {Array<any>} children - Array of child blocks or data
     * 
     */
    static data(children = [], rest = {}) {
        return {
            ...super.data(children, rest),
            root: true,
        }
    }
}