import { INPUTABLE, MERGEABLE } from "$lib/utils/capabilities";
import { Focus } from "$lib/values/focus.values";
import { MegaBlock } from "../block.svelte";
import { Strategy } from "../strategy.svelte";


/**
 * 
 * @param {import('../codex.svelte').Codex} codex 
 * @param {{
 *  content: any,
 *  format: string
 * }} data 
 */
const replace = (codex, data) => {


    const startBlock = codex.children.find(child => child.selected);
    const endBlock = codex.children.findLast(child => child.selected && child !== startBlock);
    const betweenBlocks = ((startBlock && endBlock) && codex.children.slice(codex.children.indexOf(startBlock) + 1, codex.children.indexOf(endBlock))) || []; 

    const isThereSelectedBlocksBeforeEnd = betweenBlocks.length || (startBlock && endBlock && startBlock !== endBlock);

    /** @type {import('$lib/utils/operations.utils').Operation[]} */
    const ops = [];
    if (endBlock && endBlock !== startBlock) ops.push(...(endBlock ? (endBlock.prepare('remove')): []));
    if (betweenBlocks.length) betweenBlocks.forEach(b => {
        ops.push(...b.prepareDestroy());
    })
    ops.push(...(startBlock ? (startBlock.prepare('remove')): []));

    if (startBlock) {
        if (data?.content) {
            if (startBlock.capabilities.has(INPUTABLE)) {
                const inputOps = startBlock?.prepare('input', { content: data.content, type: data.format });
                if (inputOps?.length) ops.push(...inputOps);
                codex.log('Preparing input with ops:', inputOps);


                

                // return;
            }
        } else ops.push(...startBlock.prepare('remove'));
    }

    const startPosition = startBlock?.getRelativePosition();

    if (ops.length) {
        codex.tx(ops).after(() => {
            if (endBlock && endBlock.capabilities.has(MERGEABLE) && isThereSelectedBlocksBeforeEnd) {
                if (startBlock?.capabilities.has(MERGEABLE)) {
                    console.log(startBlock.children);
                    const ops = startBlock.prepare('merge', endBlock);
                    codex.log('Merging blocks with ops:', ops);
                    return ops;
                }
            }
            return [];
        }).execute();
    }

    requestAnimationFrame(() => {
        const coordinates = startBlock?.toDOM(startPosition);
        codex.log('Coordinates to set selection:', coordinates);
        if (coordinates?.start) codex.setRange({start: coordinates.start});
    });

}

/**
 * @typedef {Object} CodexKeydownContext
 * @property {KeyboardEvent} event - The keyboard event that triggered the strategy.
 */

export const multiBlockBackspaceStrategy = new Strategy(
    'codex-delete-strategy',
    /** @param {CodexKeydownContext} context */
    (codex, context) => {
        if (!['Delete', 'Backspace', 'Enter'].includes(context.event.key)) return false;
        if (!codex.selection.isMultiBlock) return false;
        return true;
    },
    /** @param {CodexKeydownContext} context */
    (codex, context) => {
        codex.log('Executing multi-block backspace strategy');
        replace(codex, null);
    },
).tag('backspace').tag('multi-block').tag('keydown')


/**
 * @typedef {Object} CodexBeforeInputContext
 * @property {InputEvent} event - The input event that triggered the strategy.
 * @property {import('../codex.svelte').Codex} block - The codex block that the strategy is applied to.
 */

export const beforeInputStrategy = new Strategy(
    'codex-beforeinput-strategy',
    () => true,
    (codex, context) => {
        /** @type {CodexBeforeInputContext} */
        const { event, block } = context;
        if (event.inputType === 'insertText' && event.data) {
            event.preventDefault();
            codex.log('Inserting text in multi-block selection:', event.data);
            replace(codex, { content: event.data, format: 'text' });
        }
    }
).tag('beforeinput').tag('codex');

export const codexStrategies = [
    multiBlockBackspaceStrategy,
    beforeInputStrategy
];