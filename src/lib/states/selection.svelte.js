import { untrack } from 'svelte';
import { SvelteSelection } from '$lib/utils/selection.svelte';
import { findClosestParentIndex } from '$lib/utils/coordinates.utils';
import { Children } from 'hono/jsx';
import { MegaBlock } from './block.svelte';

export class CodexSelection extends SvelteSelection {
    /** @param {import('./codex.svelte').Codex} codex */
    constructor(codex) {
        super();
        this.codex = codex;
    }
    
    /** @type {Node?} */
    start = $derived(this.range?.startContainer || null);
    
    /** @type {Node?} */
    end = $derived(this.range?.endContainer || null);
    
    anchoredBlocks = $derived.by(() => {
        this.range;
        const blocks = this.start && this.codex.recursive.filter(block => {
            if (!block.element || !this.start) return false;
            return block.element.contains(this.start);
        }) || [];
        
        if (this.anchorOffset > 0) {
            const child = this.start?.childNodes?.[this.anchorOffset];
            if (!child) return blocks;
            const block = this.codex.recursive.filter(block => (block.element === child) || (block.element?.contains(child))).at(-1);
            if (block && !blocks.includes(block)) {
                return [...blocks, block];
            }
        }
        return blocks;
    });
    
    /**
    * Latest anchored block in the selection.
    */
    anchoredBlock = $derived(this.anchoredBlocks.at(-1) || null);
    
    focusedBlocks = $derived.by(() => {
        this.range;
        const blocks = this.start && this.codex.recursive.filter(block => {
            if (!block.element || !this.start) return false;
            return block.element.contains(this.start);
        }) || [];
        if (this.focusOffset > 0) {
            const child = this.start?.childNodes?.[this.focusOffset];
            if (!child) return blocks;
            const block = this.codex.recursive.filter(block => (block.element === child) || (block.element?.contains(child))).at(-1);
            if (block && !blocks.includes(block)) {
                return [...blocks, block];
            }
        }
        return blocks;
    });
    
    /** 
    * Latest focused block in the selection.
    * 
    */
    focusedBlock = $derived(this.focusedBlocks.at(-1) || null);
    
    
    startBlocks = $derived.by(() => {
        this.range;
        const blocks = this.start && this.codex.recursive.filter(block => {
            if (!block.element || !this.start) return false;
            return block.element.contains(this.start);
        }) || [];
        if (this.anchorOffset > 0) {
            const child = this.start?.childNodes?.[this.anchorOffset];
            if (!child) return blocks;
            const block = this.codex.recursive.filter(block => (block.element === child) || (block.element?.contains(child))).at(-1);
            if (block && !blocks.includes(block)) {
                return [...blocks, block];
            }
        }
        return blocks;
    });
    
    /**
    * Endpoint start block in the selection.
    */
    startBlock = $derived(this.startBlocks.at(-1) || null);
    
    endBlocks = $derived.by(() => {
        this.range;
        const blocks = this.end && this.codex.recursive.filter(block => {
            if (!block.element || !this.end) return false;
            return block.element.contains(this.end);
        }) || [];
        if (this.focusOffset > 0) {
            const child = this.end?.childNodes?.[this.focusOffset];
            if (!child) return blocks;
            const block = this.codex.recursive.filter(block => (block.element === child) ||
            (block.element?.contains(child))).at(-1);
            if (block && !blocks.includes(block)) {
                return [...blocks, block];
            }
        }
        return blocks;
    });
    
    /**     
    * Endpoint end block in the selection.
    */
    endBlock = $derived(this.endBlocks.at(-1) || null);
    
    /** @type {import('./block.svelte').Block[]} */
    blocks = $derived(this.codex?.recursive?.filter(block => block.selected));
    
    length = $derived(this.blocks.length);
    
    depth = $derived(this.blocks.sort((a, b) => a.depth - b.depth).at(-1)?.depth || 0);
    
    isMultiBlock = $derived(this.startBlock !== this.endBlock);
    
    parent = $derived.by(() => {
        const start = this.startBlock?.path
        const end = this.endBlock?.path;
        const commonIndex = findClosestParentIndex(start?.join('.'), end?.join('.'));
        const parent = commonIndex === -1 ? this.codex : this.codex.recursive.find(block => block.index === commonIndex);
        if (!parent) {
            return null;
        }
        return parent;
    });
    
    /** @type {boolean} */
    collapsed = $derived(this.range ? this.range.collapsed : true);
    
    /** Sets the selection range using start and end nodes and offsets.
    * @param {Node} startNode - The node where the selection starts.
    * @param {number} startOffset - The offset within the start node.
    * @param {Node} endNode - The node where the selection ends.
    * @param {number} endOffset - The offset within the end node.
    */
    setRange = (startNode, startOffset, endNode, endOffset) => {
        if (!this.codex.element) return;
        if (!this.is) return;
        
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);

        // console.log('RANGE', range);
        // console.trace();
        
        this.removeAllRanges();
        this.addRange(range);
    }
    
    isInside = $derived(this.codex.element?.contains(this.start));
    
}

