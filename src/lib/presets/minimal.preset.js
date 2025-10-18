import { Paragraph } from "../blocks";
import { DataTransformSystem } from "../states/systems/codex.system.svelte";
import { ParagraphSystem } from "../states/systems/paragraph.system.svelte";
import { Preset } from "./preset";

import { textStyleStrategy } from "./strategies/minimal.strategies";
import { StyleSystem } from "./systems/style.system.svelte";

export const MinimalPreset = new Preset({
    name: '@codex/minimal',
    blocks: [Paragraph],
    systems: [ParagraphSystem, DataTransformSystem, StyleSystem],
    strategies: [textStyleStrategy],
})