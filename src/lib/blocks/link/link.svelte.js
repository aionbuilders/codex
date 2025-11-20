import { text } from "@sveltejs/kit";
import { MegaBlock } from "..";
import { Linebreak } from "../linebreak/linebreak.svelte";
import { Text } from "../text/text.svelte";
import LinkC from "./Link.svelte";

/**
* @typedef {import('..').Codex} Codex
* @typedef {import('../../types').Focus} Focus
* @typedef {import('../block.svelte').MegaBlockInit} MegaBlockInit
* @typedef {import('../text/text.svelte').TextInit} TextInit
* @typedef {import('../linebreak/linebreak.svelte').LinebreakInit} LinebreakInit
*/

/**
* @typedef {import('../block.svelte').MegaBlockInit & {
*  children?: (Array<TextInit|LinebreakInit>),
*  href?: string,
*  title?: string,
* }} LinkInit
*/

/**
* @extends {MegaBlock<Text|Linebreak>}
*/
export class Link extends MegaBlock {
    /** @type {import("../block.svelte").MegaBlockManifest} */
    static manifest = {
        type: "link",
        blocks: [Text, Linebreak],
        component: LinkC
    }
    
    /**
    * @param {Codex} codex
    * @param {LinkInit} [init={}]
    */
    constructor(codex, init = {}) {
        super(codex, init);
        
        this.$init();
        this.log("Creating Link block with init:", init, this.children);
        
        this.href = init.href || "";
        this.title = init.title || "";
    }
    
    element = $state(/** @type {HTMLAnchorElement|null} */ (null));
    
    href = $state("");
    title = $state("");
    
    // STATE OF CHILDREN :

    /** @type {Number} */
    length = $derived(this.children.reduce((acc, child) => {
        return acc + (child instanceof Text ? child.text.length : 1);
    }, 0));
    
    /** @type {Number} */
    start = $derived(this.before ? (this.before?.end ?? 0) + 1 : 0);
    
    /** @type {Number} */
    end = $derived(this.start + this.length);
    
    // SELECTION : 

    /**  @type {MegaBlock['getSelectionStart']} */
    getSelectionStart(firstChild) {
        return firstChild.start + (firstChild instanceof Text && firstChild.selection?.start ? firstChild.selection?.start : 0);
    }
    
    /** @type {MegaBlock['getSelectionEnd']} */
    getSelectionEnd(lastChild) {
        return lastChild.start + (lastChild instanceof Text && lastChild.selection?.end ? lastChild.selection?.end : this.codex?.selection.collapsed ? 0 : 1);
    }

    // EVENTS :

    onbeforeinput = e => {

    }

    onkeydown = (e, data) => {
        if (!this.selection) return;
        if ((e.key === "Enter" && e.shiftKey) && data?.action === "split") {
            e.preventDefault();
            const { block, editData, newTextData} = /** @type {import("../text/text.svelte").SplitData} */ (data);
            const blockIndex = $state.snapshot(block.i);
            const ops = this.ops();
            const offset = this.selection.start || 0;
            if (editData) ops.push(...block.prepare("edit", editData));
            ops.push(...this.prepare('insert', {
                block: Linebreak.data(),
                offset: blockIndex + 1
            }))
            if (newTextData) ops.push(...this.prepare("insert", {
                block: Text.data(newTextData),
                offset: blockIndex + 2
            }));
            this.codex?.tx(ops).execute().then(tx => {
                this.log(offset);
                tx.focus({
                    start: offset + 1,
                    end: offset + 1,
                    block: this,
                })
            })
        } else if (data?.action === "nibble") {
            const { block, what } = /** @type {{block: Text, what: 'previous'|'next'}} */ (data);
            const offset = what === "previous" ? block.start - 1 : block.end;
            const blockIndex = $state.snapshot(block.i);
            const target = what === "previous" ? this.codex?.selection.start === 0 ? this.before : this.children[blockIndex - 1] : this.children[blockIndex + 1];
            const ops = this.ops();
            if (!target) return;
            if (target instanceof Text) ops.push(...target.prepare("edit", {
                from: -2,
                to: -1,
            })) 
            else if (target instanceof Linebreak) ops.push(...target.prepareDestroy());
            this.codex?.tx(ops).execute().then(tx => tx.focus({ start: offset, end: offset, block: this }));

                

        } else if (data?.action === "delete") {
            const { block, key = e.key } = /** @type {{block: Text, key: String}} */ (data);
            const selection = this.selection;
            const ops = this.ops();
            ops.push(...block.prepareDestroy());
            this.codex?.tx(ops).execute().then(tx => {
                tx.focus({start: selection.start, end: selection.start, block: this})
            })
        } else {
            console.log("Keydown in Link block:", e.key, data);
        }
    }


    /**
    * @param {Focus} f
    */
    focus = (f) => {
        if (this.element) {
            const data = this.getFocusData(f);
            if (data)
                this.codex?.selection?.setRange(
                data.startElement,
                data.startOffset,
                data.endElement,
                data.endOffset,
            );
            else
                console.warn(
                "Could not get focus data for paragraph:",
                this,
            );
        }
    }

    /**
    * @param {Focus} f
    * @returns
    */
    getFocusData = (f) => {
        let { start, end } = f;
        start ??= 0;
        end ??= start;
        if (start && start < 0) start = this.end + (start + 1);
        if (end && end < 0) end = this.end + (end + 1);
        
        if (start < 0 || end < 0 || start > this.end || end > this.end) {
            console.warn(
                `Invalid focus range: start=${start}, end=${end} for paragraph ${this.index}. Resetting to 0.`,
            );
            start = 0;
            end = 0;
        }
        const startCandidates = this.children.filter(
            (child) => start >= child.start && start <= child.end,
        );
        let startBlock =
        startCandidates.find(
            (child) => child.start === start && child instanceof Text,
        ) || startCandidates[0];
        let endBlock =
        start === end
        ? startBlock
        : this.children.find(
            (child) => end >= child.start && end <= child.end,
        );
        if (
            start === end &&
            startBlock instanceof Linebreak &&
            start === startBlock.end &&
            this.children.find((child) => child.start === start)
        )
        startBlock = endBlock = this.children.find(
            (child) => child.start === start,
        ) || startBlock;
        
        const startData = startBlock
        ? startBlock.getFocusData({
            start: start - startBlock.start,
            end:
            startBlock === endBlock
            ? end - startBlock.start
            : startBlock.length,
        })
        : null;
        const endData = endBlock
        ? endBlock.getFocusData({
            start: end - endBlock.start,
            end: end - endBlock.start,
        })
        : null;
        
        if (startData && endData) {
            return {
                startElement: startData.startElement,
                startOffset: startData.startOffset,
                endElement: endData.endElement,
                endOffset: endData.endOffset,
            };
        } else {
            console.warn(
                "Could not get focus data for blocks:",
                startBlock,
                endBlock,
            );
            return null;
        }
    };

    /**
    * @typedef {{ type: 'text', data: string }|string} TextDataType
    * @typedef {{ type: 'json', data: {children: Array<any>, href?: string, title?: string} }} JsonDataType
    * @param {TextDataType|JsonDataType} data
    * @param {import('../block.svelte').BlockDataType} rest
    */
    static data(data, rest = {}) {
        data ??= { type: "json", data: { children: [] }};
        if (typeof data === "string") data = { type: "text", data };
        if (Array.isArray(data)) throw new Error("Invalid data format for Link block.");
        
        if (data.type === "text") {
            // Regex Markdown standard: [text](url) ou [text](url "title")
            const linkRegex = /^\[(.*?)\]\((.*?)(?:\s+["'](.*?)["'])?\)$/s;
            const match = data.data.match(linkRegex);
            
            if (match) {
                const [, text, href, title = ""] = match;
                
                // Parser le texte pour créer les children (Text + Linebreak si \n)
                const texts = text.split("\n").map((t, i, arr) => {
                    const blocks = [];
                    if (t) blocks.push(Text.data({ text: t }));
                    if (i < arr.length - 1) blocks.push(Linebreak.data());
                    return blocks;
                });
                
                return {
                    ...super.data(texts.flat(), rest),
                    href: href.trim(),
                    title: title.trim(),
                };
            }
            
            // Pas de format markdown détecté : fallback texte simple sans lien
            const texts = data.data.split("\n").map((t, i, arr) => {
                const blocks = [];
                if (t) blocks.push(Text.data({ text: t }));
                if (i < arr.length - 1) blocks.push(Linebreak.data());
                return blocks;
            });
            
            return {
                ...super.data(texts.flat(), rest),
                href: "",
                title: "",
            };
        } else if (data.type === "json") {
            return {
                ...super.data(data.data.children, rest),
                href: data.data.href || "",
                title: data.data.title || "",
            };
        }
        
        return super.data([], rest);
    }
}