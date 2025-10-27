/**
 * @typedef {Object} CodexTextStyleContext
 * @property {KeyboardEvent} event - The keyboard event that triggered the strategy.
 */

import { text } from "@sveltejs/kit";
import { Text } from "../../blocks";
import { Strategy } from "../../states/strategy.svelte";
import { TextStyling } from "../../states/blocks/operations/text.ops";
import { Operations } from "$lib/utils/operations.utils";

export const textStyleStrategy = new Strategy(
    '@codex/text-style',
    (codex, /** @type {CodexTextStyleContext} */ context) => {
        const {event} = context;
        if (!((event.ctrlKey || event.metaKey) && !event.shiftKey)) return false;
        const key = event.key.toLowerCase();
        const istyleKey = ['b', 'i', 'u', 's'].includes(key);
        if (istyleKey) event.preventDefault();
        if (codex.config?.styles === false) return false;
        return istyleKey;
    },
    (codex, /** @type {CodexTextStyleContext} */ context) => {
        if (codex.config?.styles === false) return false;
        context.event?.preventDefault();
        const key = context.event.key.toLowerCase();
        const styleMap = {
            b: 'bold',
            i: 'italic',
            u: 'underline',
            s: 'strikethrough'
        };
        /** @type {keyof Text['styles']} */
        const style = styleMap[key];
        if (!style) return;
        codex.log('Toggling text style:', style);

        /** @type {Text[]} */
        const texts = codex.recursive.filter(b => b instanceof Text && b.selected);

        const ops = new Operations();

        if (texts.every(t => t.styles[style])) {
            const enabled = texts.filter(t => t.styles[style]);
            
            const first = enabled[0];
            const last = enabled.at(-1) !== first ? enabled.at(-1) : null;
            const between = enabled.slice(1, -1).filter(t => t !== first && t !== last);
            if (last) ops.push(...last.prepareStyling({ styles: { [style]: false } }));
            if (between.length) ops.push(new TextStyling(codex, { disable: [style], ids: between.map(t => t.id) }));
            if (first) ops.push(...first.prepareStyling({ styles: { [style]: false } }));




            // enabled.forEach(t => t.toggleStyle(style));
        } else {
            const disabled = texts.filter(t => !t.styles[style]);

            const first = disabled[0];
            const last = disabled.at(-1) !== first ? disabled.at(-1) : null;
            const between = disabled.slice(1, -1).filter(t => t !== first && t !== last);
            if (last) ops.push(...last.prepareStyling({ styles: { [style]: true } }));
            if (between.length) ops.push(new TextStyling(codex, { enable: [style], ids: between.map(t => t.id) }));
            if (first) ops.push(...first.prepareStyling({ styles: { [style]: true } }));
        }

        console.log({ops});

        codex.tx(ops).execute().then(tx => {
            if (tx.selectionBefore) tx.focus(tx.selectionBefore);
            
        })
        





    }
).tag('@codex').tag('text-style').tag('keydown')