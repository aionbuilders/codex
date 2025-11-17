import { MinimalPreset } from "../minimal/minimal.preset.js";

export const PlainPreset = MinimalPreset.extend({
    name: '@codex/plain',
    config: {
        styles: false,
    }
})