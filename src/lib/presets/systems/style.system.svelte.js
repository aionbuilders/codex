import { SvelteSet } from "svelte/reactivity";
import { System } from "../../states/system.svelte";
import { applier } from "$lib/utils/operations.utils";

export class StyleSystem extends System {
    static manifest = {
        name: '@codex/style',
        description: 'A system for managing text styles',
    }

    constructor(priority = 0) {
        super(priority);

        this.pendingStyles = new SvelteSet();

        this.executor('@codex/styling', this.applyStyling);
    }


    /**
     * 
     * @param {*} data 
     */
    applyStyling = data => {
        console.log('Applying styling with data:', data);
        const { styles, ids, disable } = data;
        
    }
}