import { Operation } from "$lib/utils/operations.utils";


/**
 * @typedef {Object} TextInsertOperationData
 * @property {string} text - The insert text.
 * @property {number} offset - The offset where the text is inserted.
 */

export class TextInsertOperation extends Operation {
    /**
     * @param {import('$lib/states/block.svelte').Block} block
     * @param {TextInsertOperationData} data
     * @param {Operation} [undo]
     */
    constructor(block, data, undo) {
        super(block, 'insert', data);
        this.text = data.text;
        this.offset = data.offset;

        this.undo = undo || new TextDeleteOperation(block, {
            from: data.offset,
            to: data.offset + data.text.length
        }, this);
    }

    get debug() {
        return `Insert "${this.text}" at ${this.offset}`;
    }
}


/**
 * @typedef {Object} TextDeleteOperationData
 * @property {number} from - The starting offset of the deleted text.
 * @property {number} to - The ending offset of the deleted text.
 */

export class TextDeleteOperation extends Operation {
    /**
     * @param {import('$lib/states/blocks/text.svelte').Text} block
     * @param {TextDeleteOperationData} data
     * @param {Operation} [undo]
     */
    constructor(block, data, undo) {
        super(block, 'delete', data);
        this.from = data.from;
        this.to = data.to;

        this.undo = undo || new TextInsertOperation(block, {
            text: '',
            offset: this.from
        }, this);
    }
    // test
    get debug() {
        return `Delete from ${this.from} to ${this.to}`;
    }
}



/**
 * @typedef {Object} TextEditionData
 * @property {string} [text] - The edited text.
 * @property {number} from - The starting offset of the edited text.
 * @property {number} [to] - The ending offset of the edited text.
 */


export class TextEdition extends Operation {
    /**
     * @param {import('$lib/states/blocks/text.svelte').Text} block
     * @param {TextEditionData} data
     */
    constructor(block, data) {
        super(block, 'edit', data);
    }

    get debug() {
        if (!this.data.text) return `Delete ${this.data.from} to ${this.data.to ?? this.data.from}`;
        if (!this.data.to || this.data.to === this.data.from) return `Insert "${this.data.text}" at ${this.data.from}`;
        return `Replace from ${this.data.from} to ${this.data.to} with "${this.data.text}"`;
    }
}