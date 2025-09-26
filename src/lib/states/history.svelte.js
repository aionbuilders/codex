import { SvelteSet } from "svelte/reactivity";


/**
 * @extends SvelteSet<import('../utils/operations.utils').Transaction>
 */
export class History extends SvelteSet {
    constructor() {
        super();
    }

    /** @type {import('../utils/operations.utils').Transaction?} */
    current = $state(null);
    
}