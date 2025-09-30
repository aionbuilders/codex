import LinebreakC from "../../components/Linebreak.svelte";
import { Focus } from "../../values/focus.values";
import { Block, MegaBlock } from "../block.svelte";
import { Text } from "./text.svelte";


/**
 * @typedef {import('../block.svelte').BlockInit & {
 *  type: 'linebreak'
 * }} LinebreakObject
 * 
 * @typedef {LinebreakObject} LinebreakInit
 */


export class Linebreak extends Block {

    /** @type {import("../block.svelte").BlockManifest} */    
    static manifest = {
        type: 'linebreak',
        dataTypes: ['text/linebreak'],
        component: LinebreakC
    }

    /** @param {import('../codex.svelte').Codex} codex @param {import("../block.svelte").BlockInit} [init] */
    constructor(codex, init) {
        super(codex, init);

        this.$init();
    }
    
    /** @type {HTMLBRElement?} */
    element = $state(null);
    
    start = $derived(this.before ? (this.before.end ?? 0) : 0);
    end = $derived(this.start + 1);
    
    /** 
     * The offset of the linebreak within its parent block. (Not reactive)
     * @type {Number}
     */
    get offset() {
        return this.element ? Array.from(this.element?.parentNode?.childNodes || []).indexOf(this.element) || 0 : 0;
    }
    
    debug = $derived(`(${this.start} - ${this.end}) [${this.offset}]`);

    /** @type {Boolean} */
    selected = $derived.by(() => {
        // @ts-ignore - TypeScript doesn't understand super.selected for derived properties
        if (super.selected) return true;
        if (this.codex?.selection?.isCollapsed && this.codex?.selection?.range) {
            const { startContainer, startOffset } = this.codex.selection.range;
            const nodeAtCursor = startContainer.childNodes[startOffset];
            const nodeBefore = startContainer.childNodes[startOffset - 1];
            return (nodeAtCursor === this.element) || (nodeBefore === this.element);
        }
        return false;
    });
    
    /** @type {import('../../utils/block.utils').BlockListener<KeyboardEvent>} */
    onkeydown = (e, ascend) => ascend({
        block: this,
        action: e.key === 'Backspace' ? 'delete' : undefined
    });

    /** @type {import('../../utils/block.utils').BlockListener<InputEvent>} */
    onbeforeinput = (e, ascend) => {
        e.preventDefault();
        ascend({
            block: this,
        });
    }

    onfocus = () => {
        
    }

    delete = () => this.rm();

    /** @param {Focus} [f] */
    focus = (f) => requestAnimationFrame(() => {
        if (this.element && this.codex) {
            const strategy = this.parent?.strategies?.find(s => s.tags.includes('refocus'));
            if (strategy && strategy.canHandle(this.codex, { block: this })) {
                strategy.execute(this.codex, { block: this });
                return;
            }
            const data = this.getFocusData();
            if (data) this.codex?.selection?.setRange(data.startElement, data.startOffset, data.endElement, data.endOffset);
        }
    });

    /** Returns the focus data for the linebreak element */
    getFocusData = () => {
        if (this.element) {
            const parentElement = this.element.parentElement;
            if (!parentElement) return;
            const blockOffset = Array.from(parentElement?.childNodes).indexOf(this.element);
            return {
                startElement: parentElement,
                endElement: parentElement,
                startOffset: blockOffset,
                endOffset: blockOffset,
            };
        }
    }

    values = $derived({
        json: { type: 'linebreak' },
        text: '\n'
    })


    /** 
     * Handle input data
     * @param {any} data 
     */
    $in(data) {
        console.warn('Linebreak input handler not implemented:', data);
    }
}