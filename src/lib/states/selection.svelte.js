import { SvelteSelection } from "../utils/selection.svelte";
import { findClosestParentIndex } from "../utils/coordinates.utils";

export class CodexSelection extends SvelteSelection {
    /** @param {import('../blocks').Codex} codex */
    constructor(codex) {
        super();
        this.codex = codex;
    }

    /** @type {Node?} */
    startNode = $derived(this.range?.startContainer || null);

    /** @type {Node?} */
    endNode = $derived(this.range?.endContainer || null);

    anchoredBlocks = $derived.by(() => {
        this.range;
        const blocks =
            (this.startNode &&
                this.codex.recursive.filter((block) => {
                    if (!block.element || !this.startNode) return false;
                    return block.element.contains(this.startNode);
                })) ||
            [];

        if (this.anchorOffset > 0) {
            const child = this.startNode?.childNodes?.[this.anchorOffset];
            if (!child) return blocks;
            const block = this.codex.recursive
                .filter(
                    (block) =>
                        block.element === child ||
                        block.element?.contains(child),
                )
                .at(-1);
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
        const blocks =
            (this.startNode &&
                this.codex.recursive.filter((block) => {
                    if (!block.element || !this.startNode) return false;
                    return block.element.contains(this.startNode);
                })) ||
            [];
        if (this.focusOffset > 0) {
            const child = this.startNode?.childNodes?.[this.focusOffset];
            if (!child) return blocks;
            const block = this.codex.recursive
                .filter(
                    (block) =>
                        block.element === child ||
                        block.element?.contains(child),
                )
                .at(-1);
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
        const blocks =
            (this.startNode &&
                this.codex.recursive.filter((block) => {
                    if (!block.element || !this.startNode) return false;
                    return block.element.contains(this.startNode);
                })) ||
            [];
        if (this.anchorOffset > 0) {
            const child = this.startNode?.childNodes?.[this.anchorOffset];
            if (!child) return blocks;
            const block = this.codex.recursive
                .filter(
                    (block) =>
                        block.element === child ||
                        block.element?.contains(child),
                )
                .at(-1);
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
        const blocks =
            (this.endNode &&
                this.codex.recursive.filter((block) => {
                    if (!block.element || !this.endNode) return false;
                    return block.element.contains(this.endNode);
                })) ||
            [];
        if (this.focusOffset > 0) {
            const child = this.endNode?.childNodes?.[this.focusOffset];
            if (!child) return blocks;
            const block = this.codex.recursive
                .filter(
                    (block) =>
                        block.element === child ||
                        block.element?.contains(child),
                )
                .at(-1);
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

    /** @type {import('../blocks/block.svelte').Block[]} */
    blocks = $derived(this.codex?.recursive?.filter((block) => block.selected));

    length = $derived(this.blocks.length);

    depth = $derived(
        this.blocks.sort((a, b) => a.depth - b.depth).at(-1)?.depth || 0,
    );

    isMultiBlock = $derived(this.startBlock !== this.endBlock);

    parent = $derived.by(() => {
        const start = this.startBlock?.path || [];
        const end = this.endBlock?.path || [];
        const commonIndex = findClosestParentIndex(
            start.join("."),
            end.join("."),
        );
        const parent =
            commonIndex === -1
                ? this.codex
                : this.codex.recursive.find(
                      (block) => block.index === commonIndex,
                  );
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

        this.removeAllRanges();
        this.addRange(range);
    };

    isInside = $derived(this.codex.element?.contains(this.startNode));

    start = $derived.by(() => {
        const startBlock = this.codex.children.find((b) => b.selected);
        return (startBlock?.selection && startBlock.start + (startBlock.selection.start || 0)) || 0
    });

    end = $derived.by(() => {
        const endBlock = this.codex.children.findLast((b) => b.selected);
        return (endBlock?.selection && endBlock.start + (endBlock.selection.end || 0)) || 0
    });
}
