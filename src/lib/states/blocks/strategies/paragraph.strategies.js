import { Strategy } from "$lib/states/strategy.svelte";
import { Focus } from "$lib/values/focus.values";
import { Linebreak } from "../linebreak.svelte";
import { Text } from "../text.svelte";

/**
* @param {import('../paragraph.svelte').Paragraph} paragraph 
* @param {import('../paragraph.svelte').ParagraphContent} [content] 
*/
const replace = (paragraph, content) => {
    
    /** @type {import('../text.svelte').Text|import('../linebreak.svelte').Linebreak} */
    const start = paragraph.children.find(child => child.selected);
    /** @type {import('../text.svelte').Text|import('../linebreak.svelte').Linebreak} */
    const end = paragraph.children.findLast(child => child.selected);

    const between = paragraph.children.slice(paragraph.children.indexOf(start) + 1, paragraph.children.indexOf(end));

    const data = {
        startOffset: start.start + (start instanceof Text ? start.selection?.start : 0),
        endOffset: end.start + (end instanceof Text ? end.selection?.end : 0),
        startSelection: start.selection?.start || 0,
        endSelection: end.selection?.end || 0,
        startBlock: start,
        endBlock: end
    }

    const index = paragraph.children.indexOf(start);

    const ops = [];


    if (between.length) ops.push(...paragraph.prepareRemove({
        ids: between.map(b => b.id)
    }));
    ops.push(...(start instanceof Text ? start.prepareEdit({
        from: start.selection?.start || 0,
        to: start.text.length
    }) : paragraph.prepareRemove({ ids: [start.id] })));
    ops.push(...(end instanceof Text ? end.prepareEdit({
        from: 0,
        to: end.selection?.end || 0
    }) : paragraph.prepareRemove({ ids: [end.id] })));

    if (content?.length) ops.push(...paragraph.prepareInsert({
        blocks: content,
        offset: index + 1
    }));

    paragraph.log('Replacing content in paragraph:', paragraph.index);

    paragraph.codex?.tx(ops).execute();

    return data;
}

/**
* @typedef {Object} ParagraphKeydownContext
* @property {KeyboardEvent} event - The keyboard event that triggered the strategy.
* @property {import('../paragraph.svelte').Paragraph} block - The paragraph block that the strategy is applied to.
*/

export const paragraphDeleteStrategy = new Strategy(
    'paragraph-delete-strategy',
    /** @param {ParagraphKeydownContext} context */
    (codex, context) => {
        if (!['Delete', 'Backspace', 'Enter'].includes(context.event.key)) return false;
        if (!codex.selection.isMultiBlock) return false;
        return true;
    },
    /** @param {ParagraphKeydownContext} context */
    (codex, context) => {
        const paragraph = context.block;
        const data = replace(paragraph, context.event.key === 'Enter' ? [{ type: 'linebreak' }] : []);

        if (context.event.key === 'Enter') paragraph.focus(new Focus(data.startOffset + 1, data.startOffset + 1));
        else paragraph.focus(new Focus(data.startOffset, data.startOffset));
    }
).tag('paragraph').tag('keydown').tag('delete').tag('backspace').tag('enter');

/**
* @typedef {Object} ParagraphRefocusContext
* @property {import('../paragraph.svelte').Paragraph} paragraph - The paragraph block that the strategy is applied to.
* @property {import('../../block.svelte').Block} block - The block that the strategy is applied to.
*/
export const paragraphRefocusStrategy = new Strategy(
    'paragraph-refocus-strategy',
    /** @param {ParagraphRefocusContext} context */
    (codex, context) => {
        if (context.block instanceof Linebreak) {
            const before = context.block.before;
            if (before instanceof Text) {
                return true;
            }
        }
        return false;
    },
    /** @param {ParagraphRefocusContext} context */
    (codex, context) => {
        if (context.block instanceof Linebreak) {
            const before = context.block.before;
            if (before instanceof Text) {
                before.focus?.(-1, -1);
            }
        }
    }
).tag('refocus').tag('paragraph').tag('linebreak')

/**
 * @typedef {Object} ParagraphBeforeInputContext
 * @property {InputEvent} event - The input event that triggered the strategy.
 * @property {import('../paragraph.svelte').Paragraph} block - The paragraph block that the strategy is applied to.
 */
export const paragraphBeforeInputStrategy = new Strategy(
    'paragraph-beforeinput-strategy',
    (codex, context) => true,
    (codex, context) => {
        /** @type {ParagraphBeforeInputContext} */
        const { event, block } = context;
        event.preventDefault();
        if (event.inputType === 'insertText') {
            block.log('Before input event:', event);

            if (event.data) {
                const selection = block.selection;
                const data = replace(block, [{
                    type: 'text',
                    init: {
                        text: event.data || '',
                    }
                }])
                block.log('focus at:', selection.startOffset + event.data.length);
                block.focus(new Focus(selection.startOffset + event.data.length, selection.startOffset + event.data.length));
            }
        }
    }
).tag('beforeinput')


export const paragraphStrategies = [
    paragraphDeleteStrategy,
    paragraphRefocusStrategy,
    paragraphBeforeInputStrategy
];