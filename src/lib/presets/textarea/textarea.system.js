
import { System } from "$lib/states/system.svelte";

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
        codex.events.on("codex:onkeydown", ({event}) => {
            const e = event.data.event;
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                event.stop();
                return false;
            }
        })
    }

}