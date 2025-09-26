import { Paragraph } from "../blocks";
import { System } from "../system.svelte";

export class ParagraphSystem extends System {
    static manifest = {
        name: '@codex/paragraph',
    }

    /**
     * @param {number} priority 
     */
    constructor(priority = 0) {
        super(priority);

        this.handler('init', this.handleInit.bind(this));
        this.handler('export', this.handleExport.bind(this));
    }

    /** @param {import('../codex.svelte').Codex} codex */
    handleInit(codex) {
        codex.log('Paragraph system initialized', this);

        const lastChild = codex.children[codex.children.length - 1];
        if (!lastChild || !(lastChild instanceof Paragraph)) {
            codex.children = [...codex.children, new Paragraph(codex)];
        }
    }

    /** @param {import('../codex.svelte').Codex} codex */
    handleExport(codex) {
        codex.log('Paragraph system exported', this);
        //TODO: delete empty last paragraph on export
    }
}