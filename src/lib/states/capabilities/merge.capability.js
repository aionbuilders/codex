import { Capability } from "../capability.svelte";

export const MERGEABLE = new Capability('merge', {

})


export class MergeData {
    /**
     * @param {import('../block.svelte').Block[]} blocks
     * @param {Number} at
     */
    constructor(blocks, at) {
        this.blocks = blocks;
        this.at = at;
    }
}