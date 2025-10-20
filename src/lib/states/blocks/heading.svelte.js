import HeadingC from "../../components/Heading.svelte";
import { Linebreak, Paragraph } from ".";

/**
 * @typedef {import('./paragraph.svelte').ParagraphInit & {
 *   level?: 1|2|3|4|5|6
 * }} HeadingInit
 */

/**
 * @extends {Paragraph}
 */
export class Heading extends Paragraph {
    static manifest = {
        ...Paragraph.manifest,
        type: 'heading',
        component: HeadingC,
    }

    /**
     * @param {import('../codex.svelte').Codex} codex 
     * @param {HeadingInit} init 
     */
    constructor(codex, init = {}) {
        super(codex, init);

        this.level = $state(init.level || 1);
    }

    /** @type {import('../../utils/block.utils').BlockListener<KeyboardEvent>} */
    onkeydown(e, data) {
        this.log('Heading onkeydown event', e, 'with data:', data);
        if (e.key === 'Backspace') {
            this.log(this.selection);
            if (this.selection?.start === 0 && this.selection?.end === 0) {
                e.preventDefault();
                const ops = [];
                const children = this.childrenWithoutTrailingLinebreak;
                ops.push(
                    ...(this.prepareDestroy() || []),
                    ...(this.parent?.prepareInsert({
                        block: {
                            type: 'paragraph',
                            id: this.id,
                            children: children.length > 0 ? children.map(child => child.values.json) : [Linebreak.data()],
                        },
                        offset: this.i
                    }) || []),
                )
                this.log('Transforming heading to paragraph with ops:', ops);
                this.codex?.tx(ops).execute().then(tx => {
                    const paragraph = this.codex?.registry.get(this.id);
                    tx.focus({start: 0, end: 0, block: paragraph});
                })
                return;
            }
        }

        return super.onkeydown(e, data);
    }


    values = $derived({
        ...super.values,
        json: {
            ...super.values.json,
            level: this.level,
        }
    });


    /**
     * @typedef {{ type: 'text', data: string }|string} TextDataType
     * @typedef {{ type: 'json'|'children', data: Array<any>, level: number }|Array<any>} JsonDataType
     * @param {TextDataType|JsonDataType} data
     * @param {*} rest
     */
    static data(data, rest = {}) {
        if (typeof data === "string") data = { type: 'text', data };
        if (Array.isArray(data)) data = { type: 'children', data, level: 1 };
        if (data.type === 'text') {
            const regex = /^(#{0,6})\s*(.*)$/;
            const match = data.data.match(regex);
            return super.data(match ? match[2] : data.data, rest);
        }
        return {
            ...super.data(data.data, rest),
            level: data.level || 1,
        };
    }
}