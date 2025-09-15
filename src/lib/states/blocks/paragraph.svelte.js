import { Block, MegaBlock } from "../block.svelte";
import { Linebreak } from "./linebreak.svelte";
import { Text } from "./text.svelte";
import { paragraphStrategies } from "./strategies/paragraph.strategies";
import { Focus } from "$lib/values/focus.values";
import { ParagraphBlockInsertion } from "./operations/paragraph.ops";
import { BlocksRemoval } from "./operations/block.ops";
import { SMART, Operation, GETDELTA } from "$lib/utils/operations.utils";
import { EDITABLE, INPUTABLE, MERGEABLE, TRANSFORMS_TEXT } from "$lib/utils/capabilities";

/** 
* @typedef {(import('./text.svelte').TextObject|import('./linebreak.svelte').LinebreakObject)[]} ParagraphContent
*/

/**
* @typedef {import('../block.svelte').BlockObject & {
*  type: 'paragraph',
*  children: ParagraphContent
* }} ParagraphObject
*/


/**
 * @typedef {import("../block.svelte").BlockInit & {
 *  children?: ParagraphContent
 * }} ParagraphInit
 */

/**
 * @typedef {import('./text.svelte').TextInit|import('./linebreak.svelte').LinebreakInit} ParagraphChildInit
 * @typedef {ParagraphChildInit[]} ParagraphChildrenInit
 */


/**
 * @extends {MegaBlock<Text|Linebreak>}
 */
export class Paragraph extends MegaBlock {
    /** @type {import("../block.svelte").MegaBlockManifest} */
    static manifest = {
        type: 'paragraph',
        blocks: {
            linebreak: Linebreak,
            text: Text,
        },
        strategies: paragraphStrategies,
        capabilities: [ MERGEABLE, INPUTABLE ]
    }

    /**
    * @param {import('../codex.svelte').Codex} codex
    * @param {ParagraphInit} [init]
    */
    constructor(codex, init = {}) {
        super(codex, {
            id: init.id,
            metadata: init.metadata,
        });

        if (init.children?.length) {
            this.children = init.children.map((b) => {
                const { type, init = {} } = b;

                const B = this.blocks[type];
                if (!B) throw new Error(`Block type "${type}" not found in paragraph.`);
                return new B(this.codex, init);
            }).filter(b => b instanceof Linebreak || b instanceof Text);
        }

        $effect.root(() => {
            $effect(() => {
                if (this.codex && this.element) {
                    const lastChild = this.children[this.children.length - 1];
                    if (!lastChild ) {
                        const tx = this.codex?.tx([
                            new ParagraphBlockInsertion(this, {
                                blocks: [
                                    {
                                        type: 'linebreak',
                                        init: {}
                                    }
                                ],
                                offset: -1
                            })
                        ]);
                        tx?.execute();
                    }
                }
            })
            
            $effect(() => {
                if (this.element && this.children) {
                    const styles = this.children.map(child => child instanceof Text ? child.style : null).filter(style => style);
                    if (styles) this.normalize();
                }
            })

            $effect(() => {
                if (this.element && this.children) {
                    const empties = this.children.filter(child => child instanceof Text && !child.text);
                    if (empties.length === 0) return;
                    const ops = [ new BlocksRemoval(this, {ids: empties.map(empty => empty.id)}) ];
                    const selection = this.selection;
                    this.codex?.effect(ops);
                    if (selection?.isInParagraph) this.focus(new Focus(selection.start, selection.end));
                }
            })
        });

        this.preparator('merge', this.prepareMerge.bind(this));
        this.preparator('split', this.prepareSplit.bind(this));
        this.preparator('transform', this.prepareTransform.bind(this));
        this.preparator('input', this.prepareInput.bind(this));
    }
    
    /** @type {HTMLParagraphElement?} */
    element = $state(null);
    
    selection = $derived.by(() => {
        const firstChild = this.children.find(child => child.selected);
        const lastChild = this.children.findLast(child => child.selected);

        const firstOffset = firstChild && firstChild.start + (firstChild instanceof Text ? firstChild.selection?.start : 0);
        const lastOffset = lastChild && lastChild.start + (lastChild instanceof Text ? lastChild.selection?.end : 1);


        if (this.selected) return {
            start: firstOffset,
            end: lastOffset,
            isCollapsed: this.codex?.selection.collapsed,
            isInParagraph: !!firstChild
        };
    });
    
    /** @type {Number} */
    length = $derived(this.children.reduce((acc, child) => {
        return acc + (child instanceof Text ? child.text.length : 1);
    }, 0));
    
    /** @type {Number} */
    start = $derived(this.before ? (this.before?.end ?? 0) + 1 : 0);
    
    /** @type {Number} */
    end = $derived(this.start + this.length);


    /** @type {import('$lib/utils/block.utils').BlockListener<InputEvent>} */
    onbeforeinput = e => {
        if (e.inputType === 'insertText' && e.data) {
            const selection = this.selection;
            if (this.selection.isCollapsed && this.children.find(child => child.selected) instanceof Linebreak) {
                const selected = this.children.find(c => c.selected);
                const index = this.children.findIndex(c => c === selected);
                const tx = this.codex?.tx([
                    new ParagraphBlockInsertion(this, {
                        blocks: [
                            {
                                type: 'text',
                                init: {
                                    text: e.data
                                },
                            }
                        ],
                        offset: index
                    })
                ]);
                tx?.execute().then(r => {
                    this.focus(new Focus(selection.start + 1, selection.start + 1));

                });
            }
        }
    }
    
    /** @type {import('$lib/utils/block.utils').BlockListener<KeyboardEvent>} */
    onkeydown = (e, ascend, data) => {
        if (!this.codex) return;
        const selected = this.children?.filter(c => c.selected);
        const first = selected[0];
        const last = selected[selected.length - 1];
        const selection = this.selection;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.codex?.tx(this.prepareSplit()).execute().then(ops => {
                
                const op = ops?.find(o => o.operation.metadata?.key === 'new-paragraph');
                const newParagraph = op?.result?.[0];
                if (newParagraph) {
                    newParagraph.focus(new Focus(0, 0));
                } else {
                    console.error('No new paragraph found in operations:', ops);
                }
            })
            return;
        }

        if (e.key === 'Backspace' && selection.isCollapsed && selection.start === 0) {
            e.preventDefault();

            /** @type {Paragraph|null} */
            const previousMergeable = this.codex.recursive.findLast(b => b.capabilities.has(MERGEABLE) && b.index < this.index);

            const obj = this.toInit();
            
            if (previousMergeable && previousMergeable !== this) {
                previousMergeable.merge(this)?.then(() => {
                    console.log('Merged paragraph into previous block:', previousMergeable);
                })
            }

            

            return;
        }

        if (data) {
            if (data?.action === 'delete') {
                /** @type {{block: Text, key: String}} */
                const {block, key = e.key} = data;
                if (block) {
                    const selection = this.selection;
                    e.preventDefault();
                    this.codex.tx([
                        ...this.prepareRemove({ ids: [block.id] }),
                    ]).execute();
                    const offset = key === 'Backspace' ? selection.start - 1 : selection.start;
                    
                    this.focus(new Focus(offset, offset));
                    return;
                }
            } else if (data?.action === 'split') {
                /** @type {import("./text.svelte").SplitData} */
                const {block, editData, newTextData} = data;
                if (block) {
                    const blockIndex = this.children.findIndex(c => c === block);
                    const ops = [];
                    if (e.shiftKey) {
                        const offset = this.selection.start;
                        if (editData) ops.push(...block.prepareEdit(editData));
                        ops.push(...this.prepareInsert({
                            block: {type: 'linebreak'},
                            offset: blockIndex + 1
                        }));
                        if (newTextData) ops.push(...this.prepareInsert({
                            block: {type: 'text', init: {
                                text: newTextData.text,
                                ...newTextData.styles
                            }},
                            offset: blockIndex + 2
                        }));
                        this.codex.tx(ops).execute();
                        this.focus(new Focus(offset + 1, offset + 1));
                    }
                }
                return;
            } else if (data?.action === 'nibble') {
                /** @type {{block: Text, what: 'previous'|'next'}} */
                const {block, what} = data;
                if (block) {
                    const offset = what === 'previous' ? block.start - 1 : block.end;
                    const blockIndex = this.children.findIndex(c => c === block);
                    const target = what === 'previous' ? this.children[blockIndex - 1] : this.children[blockIndex + 1];
                    const ops = [];
                    if (!target) return;
                    if (target instanceof Linebreak) ops.push(...this.prepareRemove({ ids: [target.id] }));
                    else if (target instanceof Text) ops.push(...target.prepareEdit({
                        from: -2,
                        to: -1
                    }));
                    this.codex.tx(ops).execute();
                    this.focus(new Focus(offset, offset));

                }

            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                const ops = [];
                const offset = first && first.start + (first instanceof Text ? first.selection?.start : 0);
                if (first === last) {
                    const index = this.children.findIndex(c => c === first);
                    if (first instanceof Text) {
                        const data = first.getSplittingData(SMART);

                        if (data) {
                            ops.push(...first.prepareEdit({
                                from: first.selection?.start || 0,
                                to: first.text.length
                            }));
                            ops.push(...this.prepareInsert({
                                block: {
                                    type: 'linebreak'
                                },
                                offset: index + 1
                            }));
                            if (data.after) {
                                ops.push(...this.prepareInsert({
                                    block: {
                                        type: 'text',
                                        init: data.after
                                    },
                                    offset: index + 2
                                }));
                            }
                        }
                    } else if (first instanceof Linebreak) {
                        ops.push(...this.prepareInsert({
                            block: {
                                type: 'linebreak'
                            },
                            offset: index + 1
                        }));
                    }
                }

                this.codex?.tx(ops).execute().then(r => {
                    this.focus(new Focus(offset + 1, offset + 1));
                });
            }
        }
    }
    
    normalize = () => {
        if (!this.codex) return;

        /** @type {Number[][]} */
        const groups = findConsecutiveTextGroupsByStyle(this.children);

        if (groups.length) {
            /** @type {Operation[]} */
            const ops = [];
            groups.forEach(group => {
                const texts = group.map(i => this.children[i]).filter(c => c instanceof Text);
                if (texts.length < 2) return;
                const first = texts[0];
                const merging = texts.slice(1).reduce((acc, t) => acc + t.text, "");
                ops.push(...first.prepareEdit({
                    from: -1,
                    to: -1,
                    text: merging
                }));
                ops.push(...this.prepareRemove({ ids: texts.slice(1).map(t => t.id) }));
            });
            const selection = this.selection;
            this.codex.effect(ops);
        }

        if (this.children.length === 0) {
            this.children = [new Linebreak(this.codex)];
        }

        if (!(this.children.at(-1) instanceof Linebreak)) {
            console.log('Adding linebreak to end of paragraph:', this);
            this.children.push(new Linebreak(this.codex));
        }
    }

    /** @param {Focus} f @param {Number} attempts */
    focus = (f, attempts = 0) => requestAnimationFrame(() => {
        if (this.element) {
            const data = this.getFocusData(f);
            if (data) this.codex?.selection?.setRange(data.startElement, data.startOffset, data.endElement, data.endOffset);
            else console.warn('Could not get focus data for paragraph:', this);
        } else {
            attempts ??= 0;
            if (attempts < 10) this.focus(f, attempts + 1);
            else console.error(`Failed to focus paragraph ${this.index} after 10 attempts.`);
        }
    });

    /**
     * @param {Focus} f
     * @returns
     */
    getFocusData = (f) => {
        let { start, end } = f;
        start ??= 0;
        end ??= start;
        if (start && start < 0) start = this.end + (start + 1);
        if (end && end < 0) end = this.end + (end + 1);
        
        
        if (start < 0 || end < 0 || start > this.end || end > this.end) {
            console.warn(`Invalid focus range: start=${start}, end=${end} for paragraph ${this.index}. Resetting to 0.`);
            start = 0;
            end = 0;
        }
        
        let startBlock = this.children.find(child => start >= child.start && start <= child.end)
        let endBlock = this.children.find(child => end >= child.start && end <= child.end);
        if (start === end && startBlock instanceof Linebreak && start === startBlock.end && this.children.find(child => child.start === start)) startBlock = endBlock = this.children.find(child => child.start === start);

        const startData = startBlock ? startBlock.getFocusData(new Focus(start - startBlock.start, start - startBlock.start)) : null;
        const endData = endBlock ? endBlock.getFocusData(new Focus(end - endBlock.start, end - endBlock.start)) : null;

        if (startData && endData) {
            return {
                startElement: startData.startElement,
                startOffset: startData.startOffset,
                endElement: endData.endElement,
                endOffset: endData.endOffset,
            };
        } else {
            console.warn('Could not get focus data for blocks:', startBlock, endBlock);
            return null;
        }
    }

    debug = $derived(`${this.selection?.start} - ${this.selection?.end} [length: ${this.length}]`);

    /**
     * Merges the paragraph with the given data.
     * @param {import('$lib/states/block.svelte').Block} source 
     * @returns 
     */
    merge = source => {
        if (!this.codex) return;
        const offset = (this.end - this.start) - 1;
        return this.codex.tx(this.prepareMerge(source)).execute().then(() => {
            this.focus(new Focus(offset, offset));
        })
    }
    /** @param {import('$lib/states/block.svelte').Block} source */
    prepareMerge = source => {
        const ops = [];
        const children = source?.toInit?.().init?.children || [];

        if (!(this.children.at(-1) instanceof Linebreak)) {
            this.children.push(new Linebreak(this.codex));
        }

        if (children?.length) {
            ops.push(...this.prepareInsert({
                blocks: children,
                offset: -2
            }));
        } 

        if (source) ops.push(...source.prepareDestroy());

        return ops || [];
    }

    /**
     * Splits the paragraph at the given offsets.
     * @param {{start?: number, end?: number, offset?: number} | SMART} [data=SMART]
     * @return {Operation[]}
     */
    prepareSplit = data => {
        if (!this.codex) return [];
        if (!data) data = SMART;
        if (data === SMART) (data = { start: this.selection.start || 0, end: this.selection.end || this.selection.start || 0 });
        else if (data?.offset && (data.start || data.end)) throw new Error('Cannot specify both offset and start/end for split operation.');
        else if (data?.offset) data = { start: data.offset, end: data.offset };
        else if (!data?.start && !data?.end) data = { start: 0, end: 0 };
        const { start = 0, end = 0 } = data;


        const startBlock = this.children.find(child => start >= child.start && start <= child.end);
        const endBlock = this.children.find(child => end >= child.start && end <= child.end);
        const middleBlocks = this.children.slice(this.children.indexOf(startBlock) + 1, this.children.indexOf(endBlock));
        const afterBlocks = this.children.slice(this.children.indexOf(endBlock) + 1).filter(b => !(b instanceof Linebreak && this.children.at(-1) === b))

        const ops = [];

        const startSplittingData = startBlock instanceof Text ? startBlock.getSplittingData() : null;
        const endSplittingData = endBlock instanceof Text ? endBlock.getSplittingData() : null;
        if (startBlock instanceof Text) ops.push(...startBlock.prepareEdit({
            from: startSplittingData?.from || 0,
            to: startBlock.text.length
        }))
        if (afterBlocks.length) ops.push(...this.prepareRemove({ ids: afterBlocks.map(b => b.id) }));

        // /** @type {ParagraphInit} */
        const newParagraphInit = {
            type: 'paragraph',
            init: {
                children: [
                    ...(endSplittingData?.after ? [{type: 'text', init: endSplittingData.after}] : []),
                    ...(afterBlocks.length ? afterBlocks.map(c => c.toInit?.()) : []),
                ]
            }   
        }

        const index = this.codex.children.indexOf(this);

        const insertion = this.parent?.prepare('insert', {
            block: newParagraphInit,
            offset: index + 1
        }, {key: 'new-paragraph'});
        
        if (insertion) ops.push(...insertion);

        

        

        
        return ops;
    }

    /**
     * @param {(import('$lib/states/blocks/operations/block.ops').BlocksRemovalData & {
     *  id?: String
     * })|import('$lib/utils/operations.utils').SMART} data 
     * @returns {import('$lib/utils/operations.utils').Operation[]}
     */
    prepareRemove(data = SMART) {
        if (!(data === SMART)) return super.prepareRemove(data);
        
        /** @type {import('$lib/utils/operations.utils').Operation[]} */
        const ops = [];

        console.log(this);
        if (this.parent) {
            const startBlock = this.children.find(child => child.selected);
            const endBlock = this.children.findLast(child => child.selected && child !== startBlock);
            const betweenBlocks = (startBlock && endBlock) && this.children.slice(this.children.indexOf(startBlock) + 1, this.children.indexOf(endBlock)) || [];

            if (endBlock?.capabilities.has(EDITABLE) && endBlock !== startBlock) ops.push(...endBlock.prepare('edit', null, {key: 'clear-selection'})); else ops.push(...((endBlock && !(endBlock instanceof Linebreak && this.children.at(-1) === endBlock)) ? this.prepareRemove({ id: endBlock.id }) : []));

            if (betweenBlocks.length) ops.push(...this.prepareRemove({
                ids: betweenBlocks.filter(b => !(b instanceof Linebreak && this.children.at(-1) === b)).map(b => b.id)
            }));

            if (startBlock?.capabilities.has(EDITABLE)) ops.push(...startBlock.prepare('edit', null, {key: 'clear-selection'})); else ops.push(...(startBlock ? this.prepareRemove({ id: startBlock.id }) : []));
        } 

        return ops;
    }

    /**
     * @param {{
     *  content: String,
     *  format: 'text'|'markdown',
     *  position: {
     *    start?: Number,
     *    end?: Number,
     *    offset?: Number
     *  }
     * }} data 
     */
    prepareTransform(data) {
        const position = this.normalizePosition(data.position || { offset: 0 });
        this.log('Preparing transform of paragraph:', this.index, 'with data:', data);
        if (!this.codex) return [];
        if (data.format === 'text') {
            this.log('Transforming from plain text:', data.content);

            const ops = [];


            return ops;
        }


        return false;
    }


    /**
     * @param {{
     *  position?: ({start?: number, end?: number, offset?: number})|SMART,
     *  content: any[],
     * }} data 
     */
    prepareInput(data) {
        data.position ??= SMART;
        if (!data.content) return [];
        const position = this.normalizePosition(data.position === SMART || !data.position ? { start: this.selection.start, end: this.selection.end } : data.position);
        if (!this.codex) return [];
        const ops = [];

        const content = data.content.map(c => {
            const BestBlock = c.type === 'text' ? Text : Linebreak;

            if (BestBlock === Text) {
                if (!c.content || typeof c.content !== 'string') throw new Error('Text block must have a content string.');
                return {
                    type: 'text',
                    init: {
                        text: c.content || '',
                    }
                }
            } else if (BestBlock === Linebreak) {
                return {
                    type: 'linebreak',
                }
            } else {
                throw new Error(`Unsupported block type "${c.type}" for input operation in paragraph.`);
            }
        });

        if (content.length) ops.push(...this.prepareEdit({ content }));

        console.log('Prepared input ops:', ops);



        return ops;

    }

    /**
     * @param {{
     *  content: ParagraphContent
     * }} data 
     */
    prepareEdit = data => {
        const startBlock = this.children.find(child => child.selected);
        const endBlock = this.children.findLast(child => child.selected && child !== startBlock);
        const betweenBlocks = (startBlock && endBlock) && this.children.slice(this.children.indexOf(startBlock) + 1, this.children.indexOf(endBlock)) || [];

        const startIndex = this.children.indexOf(startBlock);
        const ops = [];

        if (betweenBlocks.length) ops.push(...this.prepareRemove({
            ids: betweenBlocks.map(b => b.id)
        }));
        ops.push(...(startBlock ? (startBlock instanceof Text ? startBlock.prepareEdit({
            from: startBlock.selection?.start || 0,
            to: startBlock.text.length
        }) : this.prepareRemove({ id: startBlock.id })) : []));
        ops.push(...(endBlock ? (endBlock instanceof Text ? endBlock.prepareEdit({
            from: 0,
            to: endBlock.selection?.end || 0,
        }) : this.prepareRemove({ id: endBlock.id })) : []));

        if (data?.content?.length) ops.push(...this.prepare('insert', {
            blocks: data.content,
            offset: startIndex + 1,
        }, {
            [GETDELTA]: () => data.content.map(c => c.type === 'text' ? (c.init?.text?.length || 0) : 1).reduce((a, b) => a + b, 0)
        }));

        this.log('Preparing edit in paragraph:', this.index, 'with ops:', ops);

        return ops;
    }

    

    toObject() {
        return {
            ...super.toObject(),
            children: this.children.map(child => child.toObject()),
        }
    }

    toInit() {
        return {
            ...super.toInit(),
            init: {
                children: this.children.filter(child => !(child instanceof Linebreak && this.children.at(-1) === child)).map(child => child.toInit()),
            }
        }
    }

    getRelativePosition() {
        return {
            start: this.selection.start,
            end: this.selection.end
        }
    }

    /**
     * @param {{start: number, end: number}} hint 
     */
    toDOM(hint) {
        let { start, end } = hint;
        
        if (start < 0) start = 0;
        if (end > this.length) end = this.length;
        const data = this.getFocusData(new Focus(start, end));
        return {
            start: {
                node: data?.startElement || this.element,
                offset: data?.start || 0
            },
            end: {
                node: data?.endElement || this.element,
                offset: data?.end || 0
            }
        };

    }

    /** 
     * @param {{start?: number, end?: number, offset?: number}} position
     * @return {{start: number, end: number}}
     */
    normalizePosition = position => {
        if (position.offset) position = {...position, start: position.offset, end: position.offset};
        position.start = Math.max(0, Math.min(this.length, position.start || 0));
        position.end = Math.max(0, Math.min(this.length, position.end || 0));
        if (position.start < 0) position.start = this.length + (position.start + 1);
        if (position.end < 0) position.end = this.length + (position.end + 1);
        if (position.start > position.end) position.start = position.end;
        return {
            start: position.start,
            end: position.end
        };
    }



    snapshot() {
        const startBlock = this.children.find(child => child.selected);
        const endBlock = this.children.findLast(child => child.selected && child !== startBlock);
        return super.snapshot({
            selection: {
                startOffset: this.selection.start,
                endOffset: this.selection.end,
                startBlock,
                endBlock
            }
        });
    }

}


/**
 * Finds consecutive text elements with the same style.
 * @param {(Text|Linebreak)[]} elements 
 * @returns {Number[][]} - Array of arrays, each containing the indices of consecutive Text elements with the same style.
 */
function findConsecutiveTextGroupsByStyle(elements) {
    const groups = [];
    let currentGroup = [];
    let currentStyle = null;
    
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // Si c'est un Text
        if (element instanceof Text) {
            const elementStyle = element.style;
            
            // Si c'est le premier Text ou si le style est différent du précédent
            if (currentStyle === null || elementStyle !== currentStyle) {
                // Sauvegarder le groupe précédent s'il contient au moins 2 éléments
                if (currentGroup.length >= 2) {
                    groups.push([...currentGroup]);
                }
                
                // Commencer un nouveau groupe
                currentGroup = [i];
                currentStyle = elementStyle;
            }
            // Si le style est le même que le précédent
            else if (elementStyle === currentStyle) {
                currentGroup.push(i);
            }
        }
        // Si c'est un Linebreak ou autre chose
        else {
            // Sauvegarder le groupe actuel s'il contient au moins 2 éléments
            if (currentGroup.length >= 2) {
                groups.push([...currentGroup]);
            }
            
            // Réinitialiser pour le prochain groupe
            currentGroup = [];
            currentStyle = null;
        }
    }
    
    // Ne pas oublier le dernier groupe
    if (currentGroup.length >= 2) {
        groups.push(currentGroup);
    }
    
    return groups;
}