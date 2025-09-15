import { Text as TextBlock } from '../blocks/text.svelte';

export class TextSystem {
    /** @param {import('../codex.svelte').Codex} codex */
    constructor(codex) {
        this.codex = codex;
    }

    /** @type {import('../blocks/text.svelte').Text[]} */
    texts = $derived(this.codex.recursive.filter(block => block instanceof TextBlock));
}