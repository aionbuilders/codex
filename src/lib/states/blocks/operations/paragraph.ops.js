import { Operation } from "$lib/utils/operations.utils";

/** @typedef {import('$lib/states/block.svelte').Block} Block */


/**
 * @typedef {Object} ParagraphBlockInsertionData
 * @property {{
 * type: string,
 * init?: import("../text.svelte").TextInit,
 * }[]} blocks
 * @property {number} offset - The position at which to insert the new block.
 */

export class ParagraphBlockInsertion extends Operation {
    /**
     * @param {Block} block
     * @param {ParagraphBlockInsertionData} data
     */
    constructor(block, data) {
        super(block, 'insert', data);
    }

    get debug() {
        return `Insert ${this.data.blocks.length} blocks at ${this.data.offset}`;
    }
}

/**
 * @typedef {Object} ParagraphBlockDeletionData
 * @property {string[]} ids - The IDs of the blocks to be deleted.
 */

export class ParagraphBlockDeletion extends Operation {
    /**
     * @param {Block} block
     * @param {ParagraphBlockDeletionData} data
     */
    constructor(block, data) {
        super(block, 'delete', data);
    }

    get debug() {
        return `Delete ${this.data.ids.length} blocks`;
    }
}
