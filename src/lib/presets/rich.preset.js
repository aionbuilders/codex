import { HeadingSystem } from "../states/systems/heading.system.svelte";
import { Heading } from "../states/blocks/heading.svelte";
import { MinimalPreset } from "./minimal.preset";

export const RichPreset = MinimalPreset.extend({
    name: '@codex/rich',
    blocks: [Heading],
    systems: [HeadingSystem]
})