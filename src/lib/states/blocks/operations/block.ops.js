import { Operation } from "$lib/utils/operations.utils";

/**
 * @typedef {Object} BlocksInsertionData
 * @property {import('$lib/states/block.svelte').BlockData[]} [blocks]
 * @property {number} [offset]
 */

export class BlocksInsertion extends Operation {
    /**
     * @param {import('$lib/states/block.svelte').Block} block
     * @param {BlocksInsertionData} data
     */
    constructor(block, data) {
        data = {
            blocks: [],
            offset: 0,
            ...data
        }
        super(block, 'insert', data)
    }

    get debug() {
        return `Insert blocks ${this.data.blocks.map(b => b.type).join(', ')} at ${this.data.offset}`;
    }

}

/**
 * Represents a block removal operation.
 * @typedef {Object} BlocksRemovalData
 * @property {string[]} [ids] - The IDs of the blocks to be removed.
 */

export class BlocksRemoval extends Operation {
    /**
     * @param {import('$lib/states/block.svelte').Block} block
     * @param {BlocksRemovalData} data
     */
    constructor(block, data) {
        super(block, 'remove', data)
    }

    get debug() {
        return `Remove ${this.data.ids?.length} blocks`;
    }

}


/**
 * @typedef {Object} BlocksReplacementData
 * @property {number} from - The starting offset of the replacement.
 * @property {number} to - The ending offset of the replacement.
 * @property {import('$lib/states/block.svelte').BlockData[]} [blocks] - The blocks to replace.
 */

export class BlocksReplacement extends Operation {
    /**
     * @param {import('$lib/states/block.svelte').Block} block
     * @param {BlocksReplacementData} data
     */
    constructor(block, data) {
        data = {
            blocks: [],
            ...data
        }
        super(block, 'replace', data)
    }

    get debug() {
        return `Replace blocks ${this.data.blocks?.map(b => b.type).join(', ')} at ${this.data.from}-${this.data.to}`;
    }

}
