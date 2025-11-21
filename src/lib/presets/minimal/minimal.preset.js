import { LinkSystem } from "$lib/blocks/link/link.system.svelte";
import { Paragraph } from "../../blocks";
import { DataTransformSystem } from "../../blocks/codex/codex.system.svelte";
import { ParagraphSystem } from "../../blocks/paragraph/paragraph.system.svelte";
import { Preset } from "../preset";

import { textStyleStrategy } from "./minimal.strategies";
import { StyleSystem } from "./style.system.svelte";

export const MinimalPreset = new Preset({
    name: '@codex/minimal',
    blocks: [Paragraph],
    systems: [ParagraphSystem, DataTransformSystem, StyleSystem, LinkSystem],
    strategies: [textStyleStrategy],
})