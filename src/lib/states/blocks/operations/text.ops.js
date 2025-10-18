import { Operation } from "../../../utils/operations.utils";

/**
 * @typedef {import('..').Text} TextBlock
 * @typedef {import('../../codex.svelte').Codex} CodexBlock
 */

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

/**
 * @typedef {Object} TextStylingData
 * @property {(keyof TextBlock['styles'])[]} [enable] - The style to enable.
 * @property {(keyof TextBlock['styles'])[]} [disable] - The style to disable.
 * @property {string[]} [ids] - The IDs of the text blocks to apply the style to.
 */

/**
 * @extends {Operation<TextBlock|CodexBlock, TextStylingData>}
 */
export class TextStyling extends Operation {
    /**
     * @param {TextBlock|CodexBlock} block
     * @param {TextStylingData} data
     */
    constructor(block, data) {
        super(block, '@codex/styling', data);
    }
}