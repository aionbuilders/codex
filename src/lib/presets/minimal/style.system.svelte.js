import { SvelteSet } from "svelte/reactivity";
import { System } from "../../states/system.svelte";
import { TextStyling } from "../../blocks/text/text.ops";
import { Text } from "../../blocks";
import { text } from "@sveltejs/kit";

/** @typedef {import('../../blocks/codex/codex.svelte').Codex} Codex */

export class StyleSystem extends System {
    static manifest = {
        name: '@codex/style',
        description: 'A system for managing text styles',
    }

    /** @param {Codex} codex */
    constructor(codex) {
        super(codex);
        this.pendingStyles = new SvelteSet();
        this.method('@codex/styling', this.applyStyling);
    }

    texts = $derived(this.codex.recursive.filter(b => b instanceof Text))


    /**
     * @param {TextStyling} op 
     */
    applyStyling = op => {
        const data = op.data;
        const texts = this.texts.filter(t => data.ids?.includes(t.id));
        texts.forEach(t => t.call("@codex/styling", op));
    }
}