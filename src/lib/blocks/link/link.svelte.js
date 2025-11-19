import { MegaBlock } from "..";
import { Linebreak } from "../linebreak/linebreak.svelte";
import { Text } from "../text/text.svelte";

/**
 * @extends {MegaBlock<Text|Linebreak>}
 */
export class Link extends MegaBlock {
    /** @type {import("../block.svelte").MegaBlockManifest} */
    static manifest = {
        type: "link",
        blocks: [Text, Linebreak],

    }

}