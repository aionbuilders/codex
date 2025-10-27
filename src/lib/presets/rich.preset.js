import { HeadingSystem } from "../states/systems/heading.system.svelte";
import { Heading } from "../states/blocks/heading.svelte";
import { MinimalPreset } from "./minimal.preset";
import { List } from "../states/blocks/list.svelte";
import { ListSystem } from "../states/systems/list.system.svelte";

export const RichPreset = MinimalPreset.extend({
    name: '@codex/rich',
    blocks: [Heading, List],
    systems: [HeadingSystem, ListSystem]
})