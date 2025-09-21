import { Paragraph } from "$lib/blocks";
import { DataTransformSystem } from "$lib/states/systems/codex.system.svelte";
import { ParagraphSystem } from "$lib/states/systems/paragraph.system.svelte";
import { Preset } from "./preset";

export const MinimalPreset = new Preset({
    name: '@codex/minimal',
    blocks: [Paragraph],
    systems: [ParagraphSystem, DataTransformSystem],
})