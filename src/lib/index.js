// Reexport your entry components here
export {Codex} from './blocks/codex/codex.svelte';
export {Block, MegaBlock} from './blocks/block.svelte';
export {Strategy, strategy} from './states/strategy.svelte';

export { Operation, SMART, ITSELF } from './utils/operations.utils.js';

export { Preset } from './presets/preset.js';


import * as Presets from "./presets";
export {Presets};