import { MinimalPreset } from "../minimal/minimal.preset";
import { preset } from "../preset";
import { textareaStrategy } from "./textarea.strategies";
import { TextareaSystem } from "./textarea.system";

export const TextareaPreset = preset('@codex/textarea')
    .extends(MinimalPreset)
    .withSystems(TextareaSystem)