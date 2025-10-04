import { MinimalPreset } from "./minimal.preset";

export const PlainPreset = MinimalPreset.extend({
    name: '@codex/plain',
    config: {
        styles: false,
    }
})