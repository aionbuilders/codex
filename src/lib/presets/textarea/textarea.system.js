
import { System } from "../../states/system.svelte";

/** @typedef {import('../../blocks').Codex} Codex */

export class TextareaSystem extends System {
    static manifest = {
        name: "@codex/textarea",
    };

    /** @param {Codex} codex */
    constructor(codex) {
        super(codex);
        this.handler("init", this.handleInit.bind(this));
    }

    /** @param {Codex} codex */
    handleInit(codex) {
        codex.events.on("paragraph:onkeydown", ({event}) => {
            const {event: e, block} = /** @type {{event: KeyboardEvent, block: import('../../blocks').Paragraph}} */ (event.data);
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                event.stop();
                const selection = block.selection;
                const start = (selection?.start || 0) + 1
                codex.tx(block.prepareSoftbreak()).execute().then(tx => tx.focus({ offset: start, block }));
            }
        })
    }

}