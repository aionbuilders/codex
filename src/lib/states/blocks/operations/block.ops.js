import { Operation } from "../../../utils/operations.utils";

/** @typedef {import('..').MegaBlock} MegaBlock */

/**
 * @typedef {Object} BlocksInsertionData
 * @property {import('../../../states/block.svelte').BlockData[]} [blocks]
 * @property {number} [offset]
 */

/**
 * @template {MegaBlock} T
 * @extends {Operation<T, BlocksInsertionData>}
 */
export class BlocksInsertion extends Operation {
    /**
     * @param {T} block
     * @param {BlocksInsertionData} data
     */
    constructor(block, data) {
        data = {
            blocks: [],
            offset: 0,
            ...data
        }
        super(block, 'insert', data);
        
        
    }

    /** @type {import('../../../states/block.svelte').Block[]} */
    results = [];

    get debug() {
        return `Insert blocks ${this.data.blocks?.map(b => b.type).join(', ')} at ${this.data.offset}`;
    }

    undo() {
        return this.ops(new BlocksRemoval(this.block, {ids: this.results.map(b => b.id)}));
    }

}

/**
 * Represents a block removal operation.
 * @typedef {Object} BlocksRemovalData
 * @property {string[]} [ids] - The IDs of the blocks to be removed.
 */

/**
 * @template {MegaBlock} T
 * @extends {Operation<T, BlocksRemovalData & Object<string, any>>}
 */
export class BlocksRemoval extends Operation {
    /**
     * @param {T} block
     * @param {BlocksRemovalData} data
     */
    constructor(block, data) {
        super(block, 'remove', data)

        const blocks = block.children.filter(b => data.ids?.includes(b.id));
        this.data.blocks = blocks.map(b => ({...b.data(), i: b.i, index: b.index}));
    }

    get debug() {
        return `Remove ${this.data.ids?.length} blocks`;
    }

    undo() {
        return this.ops(new BlocksInsertion(this.block, {blocks: this.data.blocks || [], offset: this.data.blocks?.[0]?.i || 0}));
    }

}


/**
 * @typedef {Object} BlocksReplacementData
 * @property {number} from - The starting offset of the replacement.
 * @property {number} to - The ending offset of the replacement.
 * @property {import('../../../states/block.svelte').BlockData[]} [blocks] - The blocks to replace.
 */

/**
 * @template {MegaBlock} T
 * @extends {Operation<T, BlocksReplacementData & Object<string, any>>}
 */
export class BlocksReplacement extends Operation {
    /**
     * @param {T} block
     * @param {BlocksReplacementData} data
     */
    constructor(block, data) {
        data = {
            blocks: [],
            ...data
        }
        super(block, 'replace', data)

        const blocks = block.children.filter(b => b.i >= data.from && b.i < data.to);
        this.data.oldBlocks = blocks.map(b => ({...b.data(), i: b.i, index: b.index}));

    }

    get debug() {
        return `Replace blocks ${this.data.blocks?.map(b => b.type).join(', ')} at ${this.data.from}-${this.data.to}`;
    }
    
    undo() {
        return this.ops(new BlocksReplacement(this.block, {from: this.data.from, to: this.data.from + (this.data.blocks?.length || 0), blocks: this.data.oldBlocks || []}));
    }

}
