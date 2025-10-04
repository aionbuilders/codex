import { Operation } from "../../../utils/operations.utils";


/**
 * @typedef {import('..').Text} TextBlock
 */

/**
 * @typedef {Object} TextInsertOperationData
 * @property {string} text - The insert text.
 * @property {number} offset - The offset where the text is inserted.
 */

/** @extends {Operation<TextBlock, TextInsertOperationData>} */
export class TextInsertOperation extends Operation {
    /**
     * @param {TextBlock} block
     * @param {TextInsertOperationData} data
     */
    constructor(block, data) {
        super(block, 'insert', data);
        this.text = data.text;
        this.offset = data.offset;
    }

    get debug() {
        return `Insert "${this.text}" at ${this.offset}`;
    }

    undo() {
        return [new TextDeleteOperation(this.block, { from: this.offset, to: this.offset + this.text.length })];
    }
}


/**
 * @typedef {Object} TextDeleteOperationData
 * @property {number} from - The starting offset of the deleted text.
 * @property {number} to - The ending offset of the deleted text.
 */

/** @extends {Operation<TextBlock, TextDeleteOperationData>} */
export class TextDeleteOperation extends Operation {
    /**
     * @param {TextBlock} block
     * @param {TextDeleteOperationData} data
     */
    constructor(block, data) {
        super(block, 'delete', data);
        this.from = data.from;
        this.to = data.to;

        if (this.from > this.to) throw new Error('Invalid delete operation: from is greater than to');
        this.text = block.text.slice(this.from, this.to);

    }
    
    get debug() {
        return `Delete from ${this.from} to ${this.to}`;
    }

    undo() {
        return [new TextInsertOperation(this.block, { text: this.text, offset: this.from })];
    }
}



/**
 * @typedef {Object} TextEditionData
 * @property {string} [text] - The edited text.
 * @property {number} from - The starting offset of the edited text.
 * @property {number} [to] - The ending offset of the edited text.
 */


/**
 * @extends {Operation<TextBlock, TextEditionData>}
 */
export class TextEdition extends Operation {
    /**
     * @param {TextBlock} block
     * @param {TextEditionData} data
     */
    constructor(block, data) {
        super(block, 'edit', data);

        this.metadata.op = !this.data.text ? 'delete' : (!this.data.to || this.data.to === this.data.from) ? 'insert' : 'replace';

        /** @type {string} */
        this.deleted = '';
        /** @type {string} */
        this.inserted = '';

        if (this.metadata.op === 'delete') {
            this.deleted = this.block.text.slice(this.data.from, this.data.to ?? this.data.from);
            this.inserted = '';
        } else if (this.metadata.op === 'insert') {
            this.deleted = '';
            this.inserted = this.data.text || '';
        } else {
            this.deleted = this.block.text.slice(this.data.from, this.data.to);
            this.inserted = this.data.text || '';
        }

    }

    get debug() {
        if (!this.data.text) return `Delete ${this.data.from} to ${this.data.to ?? this.data.from}`;
        if (!this.data.to || this.data.to === this.data.from) return `Insert "${this.data.text}" at ${this.data.from}`;
        return `Replace from ${this.data.from} to ${this.data.to} with "${this.data.text}"`;
    }

    undo() {
        if (this.metadata.op === 'delete') {
            return [new TextEdition(this.block, { text: this.deleted, from: this.data.from })];
        } else if (this.metadata.op === 'insert') {
            return [new TextEdition(this.block, { from: this.data.from, to: this.data.from + this.inserted.length })];
        } else {
            return [new TextEdition(this.block, { text: this.deleted, from: this.data.from, to: this.data.from + this.inserted.length })];
        }
    }
}