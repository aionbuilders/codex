import { HeadingSystem } from "../../blocks/heading/heading.system.svelte";
import { Heading } from "../../blocks/heading/heading.svelte";
import { MinimalPreset } from "../minimal/minimal.preset.js";
import { List } from "../../blocks/list/list.svelte";
import { ListSystem } from "../../blocks/list/list.system.svelte";

export const RichPreset = MinimalPreset.extend({
    name: '@codex/rich',
    blocks: [Heading, List],
    systems: [HeadingSystem, ListSystem]
})