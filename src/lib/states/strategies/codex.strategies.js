import { INPUTABLE, MERGEABLE } from "$lib/utils/capabilities";
import { Focus } from "$lib/values/focus.values";
import { Strategy } from "../strategy.svelte";
import { until } from "$lib/utils/utils";
import { GETDELTA } from "$lib/utils/operations.utils";


/**
 * 
 * @param {import('../codex.svelte').Codex} codex 
 * @param {any} data 
 */
const replace = (codex, data) => {
    const $REFOCUS = Symbol('refocus');

    const startBlock = codex.children.find(child => child.selected);
    const startPosition = startBlock && (startBlock.start + (startBlock.selection ? startBlock.selection.start : 0)) || 0;
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

    if (data) {
        const translator = codex.systems.find(s => s.handlers.has('input'));
        if (translator) {
            
            /** @type {import('../systems/codex.system.svelte').TransformedData} */
            const transformData = translator.handle('input', data);

            if (transformData && transformData.blocks && transformData.blocks.length) {
                const blocks = transformData.blocks;

                const [startBlocks, next] = until(blocks, b => {
                    return !!(startBlock?.dataTypes.has(b.type) && startBlock?.capabilities.has(INPUTABLE));
                });

                if (startBlocks.length) ops.push(...(startBlock?.prepare('input', { content: startBlocks }, {
                    [$REFOCUS]: true
                }) || []));
                
                //TODO: implement next block input if next is not null and startBlock cannot accept all blocks
            }
        }
    }

    if (ops.length) {
        codex.tx(ops).after(() => {
            if (endBlock && endBlock.capabilities.has(MERGEABLE) && isThereSelectedBlocksBeforeEnd) {
                if (startBlock?.capabilities.has(MERGEABLE)) {
                    const ops = startBlock.prepare('merge', endBlock);
                    return ops;
                }
            }
            return [];
        }).execute().then(results => {
            const hinter = results.map(r => r.operation).filter(op => op.metadata?.[$REFOCUS] && op.metadata?.[GETDELTA]);
            const refocus = startPosition + (hinter.reduce((acc, op) => acc + (op.metadata?.[GETDELTA]?.() || 0), 0));
            const data = codex.getFocusData(new Focus(refocus, refocus));
            if (data) codex.focus({
                start: { node: data.startElement, offset: data.startOffset },
                end: { node: data.endElement, offset: data.endOffset },
            });

        })
    }
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
            replace(codex, event.data);
        }
    }
).tag('beforeinput').tag('codex');

export const codexStrategies = [
    multiBlockBackspaceStrategy,
    beforeInputStrategy
];