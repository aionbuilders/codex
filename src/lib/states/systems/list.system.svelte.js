import { Operations } from "$lib/utils/operations.utils";
import { Paragraph, List, ListItem } from "../blocks";
import { System } from "../system.svelte";

export class ListSystem extends System {
    static manifest = {
        name: '@codex/list',
    }

    /**
     * @param {import('../codex.svelte').Codex} codex
     */
    constructor(codex) {
        super(codex);


        codex.events.on('**:list_item:paragraph:**:onkeydown', c => {
            console.log('ListSystem detected keydown in list item paragraph:', c);

            const ops = new Operations();
            /**
             * @type {{block: import('../blocks/text.svelte').Text|import('../blocks/linebreak.svelte').Linebreak, event: KeyboardEvent}}
             */
            const {block, event} = c.event.data;
            const paragraph = block.parent instanceof Paragraph ? block.parent : null;
            const item = paragraph?.parent instanceof ListItem ? paragraph.parent : null;
            const list = item?.parent instanceof List ? item.parent : null;
            if (!list) return;
            const key = (event.ctrlKey ? 'Control+' : '') + (event.altKey ? 'Alt+' : '') + (event.shiftKey ? 'Shift+' : '') + event.key;

            /** @param {(...args: any[]) => any} callback */
            const transfer = (callback) => {
                c.event.set('stopped', true);
                event.preventDefault();
                return callback();
            }
            

            if (key === 'Enter') return transfer(() => list.onkeydown(event, {
                key,
                item,
                paragraph,
                list
            }));

            if (['Backspace', 'Tab'].includes(key) && paragraph?.selection?.isCollapsed && paragraph.selection.start === 0) return transfer(() => list.onkeydown(event, {
                key,
                item,
                paragraph,
                list,
                collapsedAtStart: true
            }));



            

            if (!(paragraph && item && list)) return;
            if (event.key === 'Enter' && !event.shiftKey) {
                c.event.set('stopped', true);
                console.log("STOPPEEDD");
                
                event.preventDefault();

                const splittingData = paragraph.getSplittingData();
                console.log("Splitting:", splittingData);
                

                ops.push(...list.prepareInsert({
                    block: {
                        type: 'list_item',
                    },
                    offset: item.i + 1
                }));

                this.codex.tx(ops).execute().then(tx => {
                    
                });
            }
        })


        this.codex.events.on('paragraph:text:onbeforeinput', (c) => {
            const data = c.event.data;
            /** @type {{block: import('../blocks/text.svelte').Text, event: InputEvent}} */
            const {block, event} = data;
            const paragraph = block.parent instanceof Paragraph ? block.parent : null;
            if (!paragraph) return;

            if (data.event.inputType !== 'insertText') return;
            if (data.event.data !== ' ') return;
            const textContent = block.text;
            const startPosition = block.selection?.start || 0;
            const prefix = textContent.slice(0, startPosition);
            const match = prefix.match(/^([-*+]|\d+\.)$/);
            console.log('ListSystem:oninput detected prefix:', prefix, 'match:', match);
            if (match) {
                console.log(`Transforming paragraph to list item`);

                const ops = new Operations();
                ops.add(paragraph.prepareDestroy());

                const pid = paragraph.id;

                const isParagraphAfterList = paragraph.before && paragraph.before.type === 'list';
                const isParagraphBeforeList = paragraph.after && paragraph.after.type === 'list';
                /** @type {import('../blocks/list.svelte').List|null} */
                const list = isParagraphAfterList ? paragraph.before : isParagraphBeforeList ? paragraph.after : null;

                const paragraphValue = { ...paragraph.values.json };
                if (paragraphValue.children?.[0]?.type === 'text' && paragraphValue.children[0].text.startsWith(match[1])) paragraphValue.children[0].text = paragraphValue.children[0].text.slice(match[1].length + 1);
                
                if (isParagraphAfterList && list) {
                    ops.add(
                        list.prepareInsert({
                            block: {
                                type: 'list_item',
                                children: [
                                    {
                                        ...paragraphValue,
                                        id: paragraph.id,
                                    }
                                ]
                            },
                            offset: list.children.length
                        })
                    );
                } else if (isParagraphBeforeList && list) {
                    ops.add(
                        list.prepareInsert({
                            block: {
                                type: 'list_item',
                                children: [
                                    {
                                        ...paragraphValue,
                                        id: paragraph.id,
                                    }
                                ]
                            },
                            offset: 0
                        })
                    );
                } else {
                    ops.add(
                        paragraph.parent.prepareInsert({
                            block: {
                                type: 'list',
                                ordered: /^\d+\.$/.test(match[1]),
                                children: [
                                    {
                                        type: 'list_item',
                                        children: [
                                            {
                                                ...paragraphValue,
                                                id: paragraph.id,
                                            }
                                        ]
                                    }
                                ]
                            },
                            offset: paragraph.i
                        })
                    );
                }
                
                this.codex.tx(ops).execute().then(tx => {
                    if (!tx?.codex) return;
                    const paragraph = tx.codex.registry.get(pid);
                    tx.focus({start: 0, end: 0, block: paragraph});
                });
            }
        });
    }
}