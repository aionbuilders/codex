import { Paragraph } from "../paragraph/paragraph.svelte";
import { System } from "../../states/system.svelte";


/** @typedef {import('../codex/codex.svelte').Codex} Codex */

export class ParagraphSystem extends System {
    static manifest = {
        name: "@codex/paragraph",
    };

    /** @param {Codex} codex */
    constructor(codex) {
        super(codex);
        this.handler("init", this.handleInit.bind(this));
        this.handler("export", this.handleExport.bind(this));
    }

    /** @param {Codex} codex */
    handleInit(codex) {
        const lastChild = codex.children[codex.children.length - 1];
        if (!lastChild || !(lastChild instanceof Paragraph)) {
            codex.children = [...codex.children, new Paragraph(codex)];
        }
    }

    /** @param {Codex} codex */
    handleExport(codex) {
        codex.log("Paragraph system exported", this);
        //TODO: delete empty last paragraph on export
    }
}
