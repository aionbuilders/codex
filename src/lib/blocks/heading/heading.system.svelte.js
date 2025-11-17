import { Operations } from "$lib/utils/operations.utils";
import { Paragraph } from "..";
import { System } from "../../states/system.svelte";

export class HeadingSystem extends System {
    static manifest = {
        name: "@codex/heading",
    };

    /** @param {import('..').Codex} codex */
    constructor(codex) {
        super(codex);
        console.log("Heading system initialized", this);

        this.codex.events.on("paragraph:text:onbeforeinput", (c) => {
            const data = c.event.data;
            /** @type {{block: import('..').Text, event: InputEvent}} */
            const { block, event } = data;
            const paragraph =
                block.parent instanceof Paragraph ? block.parent : null;
            if (!paragraph) return;
            if (block !== paragraph.children[0]) return; // only transform if first text block
            if (data.event.inputType !== "insertText") return;
            if (data.event.data !== " ") return;
            const textContent = block.text;
            const startPosition = block.selection?.start || 0;
            const prefix = textContent.slice(0, startPosition);
            const match = prefix.match(/^(#{1,6})$/);
            console.log(
                "HeadingSystem:oninput detected prefix:",
                prefix,
                "match:",
                match,
            );
            if (match) {
                const level = match[1].length;
                console.log(`Transforming paragraph to heading level ${level}`);

                const ops = new Operations();
                ops.push(
                    ...(paragraph.prepareDestroy() || []),
                    ...(this.codex.prepare('insert',{
                        block: {
                            type: "heading",
                            level: level,
                            id: paragraph.id,
                            children: [
                                {
                                    type: "text",
                                    data: textContent.slice(
                                        match[1].length + 1,
                                    ), // remove prefix and space
                                },
                            ],
                        },
                        offset: paragraph.i,
                    }) || []),
                );

                this.codex
                    .tx(ops)
                    .execute()
                    .then((tx) => {
                        const heading = this.codex.registry.get(paragraph.id);
                        tx.focus({ start: 0, end: 0, block: heading });
                    });
            }
        });
    }
}
