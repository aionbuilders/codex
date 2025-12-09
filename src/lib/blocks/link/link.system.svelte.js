import { System } from "../../states/system.svelte";
import { Text } from "../text/text.svelte";
import {Link} from "./link.svelte.js";


export class LinkSystem extends System {
    static manifest = {
        name: "@codex/link",
    };

    /** @param {import('..').Codex} codex */
    constructor(codex) {
        super(codex);
        console.log("Link system initialized", this);

        this.codex.events.on("paragraph:text:onkeydown", c => {
            const {block, event} =  /** @type {{block: import('..').Text, event: KeyboardEvent}} */ (c.event.data);
            if (event.code === 'Space' && (event.ctrlKey || event.metaKey)) {
                const paragraph = /** @type {import('..').Paragraph} */ (block.parent);
                const selection = paragraph.selection;
                if (!selection?.isCollapsed) return;
                c.event.stop();
                event.preventDefault();
                const textBeforeCaret = paragraph.text.slice(0, selection.start);
                const linkPattern = /\[([^\]]+)\]\(([^\s\)]+)(?:\s+"([^"]+)")?\)$/;
                const match = textBeforeCaret.match(linkPattern);
                if (!match) return;
                const index = match.index || 0;
                const fullMatch = match[0];
                const title = match[1];
                const href = match[2];
                const titleAttr = match[3] || "";
                
                const splittingData = paragraph.getSplittingData({
                    start: index,
                    end: index + fullMatch.length,
                });
                
                const ops = this.codex.ops();

                const truncateOps = paragraph.prepareTruncate({start: index, end: index + fullMatch.length});   
                
                const i = truncateOps.metadata.get("newBlockIndex");

                ops.push(...truncateOps);
                
                ops.push(...paragraph.prepare('insert', {
                    block: Link.data({
                        type: "json",
                        data: {
                            children: [
                                Text.data({
                                    text: title,
                                    styles: splittingData.startBlock instanceof Text ? splittingData.startBlock.styles : {}
                                })
                            ],
                            href: href,
                            title: titleAttr
                        }
                    }),
                    offset: i
                }, { newBlockLink: true }))

                this.codex.tx(ops).execute().then(tx => {
                    console.log("Link insertion TX executed:", tx);
                    let {result} = tx.results.find(r => r.operation.metadata.newBlockLink) || {result: null};
                    const LinkBlock = /** @type {Link} **/ (this.codex.registry.get(result[0].id));
                    tx.focus({start: LinkBlock.length, end: LinkBlock.length, block: LinkBlock});            
                });   
            }
        })
    }
}