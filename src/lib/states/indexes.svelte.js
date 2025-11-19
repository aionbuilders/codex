import { SvelteMap } from 'svelte/reactivity';

export class Indexes {
    /** @param {import('../blocks/codex/codex.svelte').Codex} codex */
    constructor(codex) {
        this.codex = codex;

        this.parents = new SvelteMap();
    }


}