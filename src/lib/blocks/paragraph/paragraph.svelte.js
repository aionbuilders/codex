import { MegaBlock } from "../block.svelte";
import { Linebreak } from "../linebreak/linebreak.svelte";
import { Text } from "../text/text.svelte";
import { Link } from "../link/link.svelte";
import { paragraphStrategies } from "./paragraph.strategies";
import { BlocksRemoval } from "../block.ops";
import { SMART, Operation, GETDELTA } from "../../utils/operations.utils";
import {
    EDITABLE,
    INPUTABLE,
    MERGEABLE,
    TRANSFORMS_TEXT,
} from "../../utils/capabilities";
import ParagraphC from "./Paragraph.svelte";

/** @typedef {import('../../types').Focus} Focus */

/**
 * @typedef {(import('../text/text.svelte').TextObject|import('../linebreak/linebreak.svelte').LinebreakObject)[]} ParagraphContent
 */

/**
 * @typedef {import('../block.svelte').BlockObject & {
 *  type: 'paragraph',
 *  children: ParagraphContent
 * }} ParagraphObject
 */

/**
 * @typedef {import("../block.svelte").BlockInit & {
 *  children?: ParagraphContent
 * }} ParagraphInit
 */

/**
 * @typedef {import('../text/text.svelte').TextInit|import('../linebreak/linebreak.svelte').LinebreakInit} ParagraphChildInit
 * @typedef {ParagraphChildInit[]} ParagraphChildrenInit
 */

/**
 * @augments MegaBlock<Text|Linebreak|Link>
 */
export class Paragraph extends MegaBlock {
    /** @type {import("../block.svelte").MegaBlockManifest} */
    static manifest = {
        type: "paragraph",
        blocks: [Text, Linebreak, Link],
        strategies: paragraphStrategies,
        capabilities: [MERGEABLE, INPUTABLE],
        component: ParagraphC,
    };

    /**
     * @param {import('../codex/codex.svelte').Codex} codex
     * @param {ParagraphInit} [init]
     */
    constructor(codex, init = {}) {
        super(codex, init);

        this.preparator("merge", this.prepareMerge.bind(this));
        this.preparator("split", this.prepareSplit.bind(this));
        this.preparator("truncate", this.prepareTruncate.bind(this));
        this.preparator("transform", this.prepareTransform.bind(this));
        this.preparator("input", this.prepareInput.bind(this));
        this.preparator("softbreak", this.prepareSoftbreak.bind(this));

        this.$init();

        $effect.root(() => {
            $effect(() => {
                if (this.codex && this.element) {
                    const lastChild = this.children[this.children.length - 1];
                    if (!lastChild || !(lastChild instanceof Linebreak)) {
                        this.children.push(new Linebreak(this.codex));
                    }
                }
            });

            $effect(() => {
                if (this.element && this.children) {
                    const signatures = this.children.map((child) =>
                        child instanceof Text ? child.signature : null,
                    );
                    if (signatures) this.normalize();
                }
            });

            $effect(() => {
                if (this.element && this.children) {
                    const empties = this.children.filter(
                        (child) => child instanceof Text && !child.text,
                    );
                    if (empties.length === 0) return;
                    const ops = this.ops(
                        new BlocksRemoval(this, {
                            ids: empties.map((empty) => empty.id),
                        }),
                    );
                    const selection = this.selection;
                    this.codex?.effect(ops);
                    if (selection?.isInside) this.codex?.focus({
                        start: selection.start,
                        end: selection.end,
                        block: this,
                    });
                }
            });
        });

        this.onkeydown = this.onkeydown.bind(this);
    }

    /** @type {HTMLParagraphElement?} */
    element = $state(null);

    /**  @type {MegaBlock['getSelectionStart']} */
    getSelectionStart(firstChild) {
        return firstChild.start + (firstChild instanceof Linebreak ? 0 : firstChild.selection?.start || 0);
    }

    /** @type {MegaBlock['getSelectionEnd']} */
    getSelectionEnd(lastChild) {
        if (lastChild instanceof Linebreak) return lastChild.start + (this.codex?.selection.collapsed  ? 0 : 1);
        else return lastChild.start + (lastChild.selection?.end || 0);
    }

    /** @type {Number} */
    start = $derived(this.before ? (this.before?.end ?? 0) + 1 : 0);

    /** @type {Number} */
    end = $derived(this.start + this.length);

    text = $derived(this.children.map(child => child instanceof Linebreak ? '\n' : child.text ? child.text : '').join(''));

    /** @type {import('../../utils/block.utils').BlockListener<InputEvent>} */
    onbeforeinput = (e) => {
        if (e.inputType === "insertText" && e.data) {
            const selection = this.selection;
            if (!selection) return;
            if (
                this.selection?.isCollapsed &&
                this.children.find((child) => child.selected) instanceof
                    Linebreak
            ) {
                const selected = this.children.find((c) => c.selected);
                const index = this.children.findIndex((c) => c === selected);
                const tx = this.codex?.tx([
                    ...this.prepareInsert({
                        offset: index,
                        blocks: [{ type: "text", init: { text: e.data } }],
                    }),
                ]);
                tx?.execute().then((tx) => {
                    if (selection.start === undefined) return;
                    tx.focus({
                        start: selection.start + 1,
                        end: selection.start + 1,
                        block: this,
                    });
                });
            }
        }
    };

    /** @type {import('../../utils/block.utils').BlockListener<KeyboardEvent>} */
    onkeydown(e, data) {
        if (!this.codex) return;
        const selected = this.children?.filter((c) => c.selected);
        const first = selected[0];
        const last = selected[selected.length - 1];
        const selection = this.selection;

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const ops = this.ops(...this.prepareSplit())
            const tx = this.codex?.tx(ops);
            tx.execute().then((tx) => {
                const ops = tx.results;
                const op = ops?.find(o => o.operation.metadata?.key === "new-paragraph");
                const newParagraph = op?.result?.[0];
                if (newParagraph) tx.focus({ start: 0, end: 0, block: newParagraph });
                else console.error("No new paragraph found in operations:", ops);
            });
            return;
        }

        if (e.key === "Backspace" && selection?.isCollapsed && selection.start === 0) {
            e.preventDefault();

            /** @type {Paragraph|null}  */
            // @ts-ignore
            const previousMergeable = this.codex.recursive.findLast((b) => b.capabilities.has(MERGEABLE) && b.index < this.index ) || null;
            if (previousMergeable && previousMergeable !== this) previousMergeable.merge(this);
            return;
        }

        if (data) {
            if (!this.selection) return;
            if (data?.action === "delete") {
                const { block, key = e.key } = /** @type {{block: Text, key: String}} */ (data);
                if (block) {
                    const selection = this.selection;
                    if (!selection) return;
                    e.preventDefault();
                    const tx = this.codex.tx(this.prepareRemove({ ids: [block.id] }));
                    tx.execute().then(() => {
                        const offset = key === "Backspace" ? selection.start : selection.start;
                        tx.focus({ start: offset, end: offset, block: this });
                    });
                    return;
                }
            } else if (data?.action === "split") {
                const { block } = /** @type {import("../text/text.svelte").SplitData} */ (data);
                if (block) {
                    if (e.shiftKey) {
                        const offset = this.selection?.start || 0;
                        const tx = this.codex.tx(this.prepareSoftbreak());
                        tx.execute().then(() => {
                            tx.focus({
                                start: offset + 1,
                                end: offset + 1,
                                block: this,
                            });
                        });
                    }
                }
                return;
            } else if (data?.action === "nibble") {
                const { block, what } = /** @type {{block: Text, what: 'previous'|'next'}} */ (data);
                if (block) {
                    const previous = what === "previous";
                    const next = what === "next";
                    const offset = previous ? block.start - 1 : block.end;
                    const blockIndex = block.i;
                    const target = previous ? this.children[blockIndex - 1] : this.children[blockIndex + 1];
                    const ops = this.ops();
                    if (!target) return;
                    else if (target instanceof Linebreak) ops.push(...this.prepareRemove({ ids: [target.id] }));
                    else if (target instanceof Text) ops.push(...target.prepareEdit({
                        from: previous ? -2 : 0,
                        to: previous ? -1 : 1,
                    }));
                    const tx = this.codex.tx(ops);
                    tx.execute().then(() => {
                        tx.focus({ start: offset, end: offset, block: this });
                    });
                }
            }
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
                const offset = this.selection?.start || 0;
                const tx = this.codex?.tx(this.prepareSoftbreak());
                tx?.execute().then(() => tx.focus({
                    start: offset + 1,
                    end: offset + 1,
                    block: this,
                }));
            }
        }
    }

    normalize = () => {
        if (!this.codex) return;
        Text.normalizeConsecutiveTexts(this);
        Link.normalizeConsecutiveLinks(this);
        if (this.children.length === 0) this.children = [new Linebreak(this.codex)];
    };

    /** @param {Focus} f */
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

    debug = $derived(`${this.selection?.start} - ${this.selection?.end} [length: ${this.length}]`);

    /**
     * Merges the paragraph with the given data.
     * @param {import('../block.svelte').Block} source
     * @returns
     */
    merge = (source) => {
        if (!this.codex) return;
        const offset = this.end - this.start - 1;
        const tx = this.codex.tx(this.prepareMerge(source));
        return tx.execute().then(() => {
            tx.focus({
                start: offset,
                end: offset,
                block: this,
            });
        });
    };

    /** @param {import('../block.svelte').Block} source */
    prepareMerge = (source) => {
        if (!this.codex) return [];
        const ops = this.ops();
        const children = source?.values?.json.children || [];

        if (!(this.children.at(-1) instanceof Linebreak)) {
            this.children.push(new Linebreak(this.codex));
        }

        if (children?.length) {
            ops.push(
                ...this.prepareInsert({
                    blocks: children,
                    offset: -2,
                }),
            );
        }

        if (source) ops.push(...source.prepareDestroy());

        return ops || [];
    };

    /**
     * Splits the paragraph at the given offsets.
     * @param {{start?: number, end?: number, offset?: number} | SMART} [data=SMART]
     * @return {Operation[]}
     */
    prepareSplit = (data) => {
        const ops = this.ops();
        if (!this.selection) return ops;
        if (!this.codex) return ops;
        const s = this.getSplittingData(data);
        const splitting = this.getSplitting();
        const parts = this.slice({splitting});
        const {
            startBlock,
            startSplittingData,
            afterBlocks,
            endSplittingData,
        } = s;
        if (startSplittingData?.type === "text" && startBlock instanceof Text) ops.push(...startBlock.prepareEdit({
            from: startSplittingData?.from || 0,
            to: startBlock.text.length,
        }));

        if (afterBlocks.length) ops.push( ...this.prepareRemove({
            ids: [...splitting.after, splitting.between].flat().map(b => b.id)
        }));

        ops.add(startBlock?.prepare("remove", {
            from: startBlock.selection?.start || 0,
            to: startBlock.length,
        }) || []);
        const index = this.codex.children.indexOf(this);

        const insertion = this.parent?.prepare(
            "insert",
            {
                // block: newParagraphInit,
                block: parts.after,
                offset: index + 1,
            },
            { key: "new-paragraph" },
        );

        if (insertion) ops.push(...insertion);
        console.groupEnd();

        // return this.ops();
        return ops;
    };

    /**
     * @param {{start?: number, end?: number, offset?: number} | SMART} [data=SMART]
     */
    prepareTruncate = (data) => {
        const ops = this.ops();
        const splitting = this.getSplittingData(data);
        ops.metadata.set("splitting", splitting);
        if (splitting) {
            if (splitting.startBlock instanceof Text)
                ops.push(
                    ...splitting.startBlock.prepareEdit({
                        from: splitting.startSplittingData?.from || 0,
                        to: splitting.startSplittingData?.limit || 0,
                    }),
                );
            const toDelete = new Set([
                ...splitting.middleBlocks.map((b) => b.id),
                splitting.endBlock &&
                splitting.endBlock !== splitting.startBlock
                    ? splitting.endBlock.id
                    : null,
                ...splitting.afterBlocks.map((b) => b.id),
            ]);
            ops.push(
                ...this.prepareRemove({
                    ids: Array.from(toDelete).filter((id) => id !== null),
                }),
            );
            if (splitting.start !== splitting.end) ops.push(
                ...this.prepareInsert({
                    blocks: [
                        ...(splitting.endBlock instanceof Text && splitting.endSplittingData?.after ? [Text.data(splitting.endSplittingData?.after)] : []),
                        ...splitting.afterBlocks.map((b) => b.values.json)
                    ],
                    offset: splitting.startBlock.i + 1,
                })
            )
            ops.metadata.set("newBlockIndex", splitting.startBlock?.i + 1);
            return ops;
        }
        return ops;
    };

    /**
     * @param {(import('../block.ops').BlocksRemovalData & {
     *  id?: String
     * })|import('../../utils/operations.utils').SMART} data
     */
    prepareRemove(data = SMART) {
        if (!(data === SMART)) return super.prepareRemove(data);

        const ops = this.ops();

        if (this.parent) {
            const startBlock = this.children.find((child) => child.selected);
            const endBlock = this.children.findLast(
                (child) => child.selected && child !== startBlock,
            );
            const betweenBlocks =
                (startBlock &&
                    endBlock &&
                    this.children.slice(
                        this.children.indexOf(startBlock) + 1,
                        this.children.indexOf(endBlock),
                    )) ||
                [];

            if (endBlock?.capabilities.has(EDITABLE) && endBlock !== startBlock)
                ops.push(
                    ...endBlock.prepare("edit", null, {
                        key: "clear-selection",
                    }),
                );
            else
                ops.push(
                    ...(endBlock &&
                    !(
                        endBlock instanceof Linebreak &&
                        this.children.at(-1) === endBlock
                    )
                        ? this.prepareRemove({ id: endBlock.id })
                        : []),
                );

            if (betweenBlocks.length)
                ops.push(
                    ...this.prepareRemove({
                        ids: betweenBlocks
                            .filter(
                                (b) =>
                                    !(
                                        b instanceof Linebreak &&
                                        this.children.at(-1) === b
                                    ),
                            )
                            .map((b) => b.id),
                    }),
                );

            if (startBlock?.capabilities.has(EDITABLE))
                ops.push(
                    ...startBlock.prepare("edit", null, {
                        key: "clear-selection",
                    }),
                );
            else
                ops.push(
                    ...(startBlock
                        ? this.prepareRemove({ id: startBlock.id })
                        : []),
                );
        }

        return ops;
    }

    /**
     * @param {{
     *  content: String,
     *  format: 'text'|'markdown',
     *  position: {
     *    start?: Number,
     *    end?: Number,
     *    offset?: Number
     *  }
     * }} data
     */
    prepareTransform(data) {
        const ops = this.ops();
        const position = this.normalizePosition(data.position || { offset: 0 });
        this.log(
            "Preparing transform of paragraph:",
            this.index,
            "with data:",
            data,
        );
        if (!this.codex) return ops;
        if (data.format === "text") {
            this.log("Transforming from plain text:", data.content);

            return ops;
        }

        return false;
    }

    /**
     * @param {{
     *  position?: ({start?: number, end?: number, offset?: number})|SMART,
     *  content: any[],
     * }} data
     */
    prepareInput(data) {
        const ops = this.ops();
        data.position ??= SMART;
        if (!data.content) return ops;
        if (!this.selection) return ops;
        const position = this.normalizePosition(
            data.position === SMART || !data.position
                ? { start: this.selection.start, end: this.selection.end }
                : data.position,
        );
        if (!this.codex) return ops;

        const content = data.content.map((c) => {
            const BestBlock = c.type === "text" ? Text : Linebreak;

            if (BestBlock === Text) {
                if (!c.content || typeof c.content !== "string")
                    throw new Error("Text block must have a content string.");
                return {
                    type: "text",
                    init: {
                        text: c.content || "",
                    },
                };
            } else if (BestBlock === Linebreak) {
                return {
                    type: "linebreak",
                };
            } else {
                throw new Error(
                    `Unsupported block type "${c.type}" for input operation in paragraph.`,
                );
            }
        });

        if (content.length) ops.push(...this.prepare('edit', { content }));

        return ops;
    }

    /**
     * Prépare l'insertion d'un softbreak (linebreak) à la position spécifiée.
     * Si une sélection est présente, elle sera supprimée avant l'insertion.
     * @param {{
     *   start?: number,
     *   end?: number,
     *   offset?: number
     * }|SMART} [data=SMART] - Position ou SMART pour utiliser la sélection locale
     * @returns {Operation[]}
     */
    prepareSoftbreak = (data) => {
        const ops = this.ops();
        if (!this.codex) return ops;

        // === 1. Normalisation de la position ===
        if (!data || data === SMART) {
            if (!this.selection) return ops;
            data = {
                start: this.selection.start || 0,
                end: this.selection.end || this.selection.start || 0
            };
        } else if (data.offset !== undefined) {
            data = { start: data.offset, end: data.offset };
        }

        const position = this.normalizePosition(data);
        const { start, end } = position;

        // === 2. Gestion de la sélection non-collapsed ===
        if (start !== end) {
            // Trouver les blocs de la sélection
            const startBlock = this.children.find((child) => child.selected);
            const endBlock = this.children.findLast(
                (child) => child.selected && child !== startBlock,
            );
            const betweenBlocks =
                (startBlock &&
                    endBlock &&
                    this.children.slice(
                        this.children.indexOf(startBlock) + 1,
                        this.children.indexOf(endBlock),
                    )) ||
                [];

            if (!startBlock || !endBlock) return ops;
            const startIndex = this.children.indexOf(startBlock);

            // Supprimer la partie sélectionnée dans endBlock
            if (
                !(
                    endBlock instanceof Linebreak &&
                    endBlock.i === this.children.length - 1
                )
            )
                ops.push(
                    ...(endBlock
                        ? endBlock instanceof Text
                            ? endBlock.prepareEdit({
                                  from: 0,
                                  to: endBlock.selection?.end || 0,
                              })
                            : this.prepareRemove({ id: endBlock.id })
                        : []),
                );

            // Supprimer les blocs entre startBlock et endBlock
            if (betweenBlocks.length)
                ops.push(
                    ...this.prepareRemove({
                        ids: betweenBlocks.map((b) => b.id),
                    }),
                );

            // Supprimer la partie sélectionnée dans startBlock
            ops.push(
                ...(startBlock
                    ? startBlock instanceof Text
                        ? startBlock.prepareEdit({
                              from: startBlock.selection?.start || 0,
                              to: startBlock.text.length,
                          })
                        : this.prepareRemove({ id: startBlock.id })
                    : []),
            );

            // Insérer le linebreak à la position start
            ops.push(
                ...this.prepareInsert({
                    block: { type: "linebreak" },
                    offset: startIndex + 1,
                }),
            );

            return ops;
        }

        // === 3. Gestion de la sélection collapsed (insertion simple) ===
        const startBlock = this.children.find(
            (child) => start >= child.start && start <= child.end
        );

        if (!startBlock) return ops;
        const blockIndex = this.children.indexOf(startBlock);

        if (startBlock instanceof Text) {
            const localOffset = start - startBlock.start;

            // Cas où on coupe le texte (pas à la fin)
            if (localOffset < startBlock.text.length) {
                const splittingData = startBlock.getSplittingData({
                    from: localOffset,
                    to: startBlock.text.length
                });

                // Couper le texte
                ops.push(...startBlock.prepareEdit({
                    from: localOffset,
                    to: startBlock.text.length,
                }));

                // Insérer le linebreak
                ops.push(...this.prepareInsert({
                    block: { type: "linebreak" },
                    offset: blockIndex + 1,
                }));

                // Réinsérer la partie après si elle existe
                if (splittingData.after) {
                    ops.push(...this.prepareInsert({
                        block: {
                            type: "text",
                            init: splittingData.after,
                        },
                        offset: blockIndex + 2,
                    }));
                }
            } else {
                // On est à la fin du texte, juste insérer le linebreak
                ops.push(...this.prepareInsert({
                    block: { type: "linebreak" },
                    offset: blockIndex + 1,
                }));
            }
        } else if (startBlock instanceof Linebreak) {
            // C'est déjà un Linebreak, en insérer un autre après
            ops.push(...this.prepareInsert({
                block: { type: "linebreak" },
                offset: blockIndex + 1,
            }));
        }

        return ops;
    };

    /**
     * @param {{
     *  content: ParagraphContent
     * }} data
     */
    prepareEdit = (data) => {
        const ops = this.ops();
        const startBlock = this.children.find((child) => child.selected);
        const endBlock = this.children.findLast(
            (child) => child.selected && child !== startBlock,
        );
        const betweenBlocks =
            (startBlock &&
                endBlock &&
                this.children.slice(
                    this.children.indexOf(startBlock) + 1,
                    this.children.indexOf(endBlock),
                )) ||
            [];

        if (!startBlock || !endBlock) return ops;
        const startIndex = this.children.indexOf(startBlock);
        

        if (
            !(
                endBlock instanceof Linebreak &&
                endBlock.i === this.children.length - 1
            )
        )
            ops.push(
                ...(endBlock
                    ? endBlock instanceof Text
                        ? endBlock.prepareEdit({
                              from: 0,
                              to: endBlock.selection?.end || 0,
                          })
                        : this.prepareRemove({ id: endBlock.id })
                    : []),
            );
        if (betweenBlocks.length)
            ops.push(
                ...this.prepareRemove({
                    ids: betweenBlocks.map((b) => b.id),
                }),
            );
        ops.push(
            ...(startBlock
                ? startBlock instanceof Text
                    ? startBlock.prepareEdit({
                          from: startBlock.selection?.start || 0,
                          to: startBlock.text.length,
                      })
                    : this.prepareRemove({ id: startBlock.id })
                : []),
        );

        if (data?.content?.length)
            ops.push(
                ...this.prepare(
                    "insert",
                    {
                        blocks: data.content,
                        offset: startIndex + 1,
                    },
                    {
                        [GETDELTA]: () =>
                            data.content
                                .map((c) =>
                                    c.type === "text"
                                        ? c.init?.text?.length || 0
                                        : 1,
                                )
                                .reduce((a, b) => a + b, 0),
                    },
                ),
            );

        this.log("Preparing edit in paragraph:", this.index, "with ops:", ops);

        return ops;
    };


    /**
     * @param {{start?: number, end?: number, offset?: number}} position
     * @return {{start: number, end: number}}
     */
    normalizePosition = (position) => {
        if (position.offset) position = { ...position, start: position.offset, end: position.offset};
        position.start = Math.max(0,Math.min(this.length, position.start || 0),);
        position.end = Math.max(0, Math.min(this.length, position.end || 0));
        if (position.start < 0) position.start = this.length + (position.start + 1);
        if (position.end < 0) position.end = this.length + (position.end + 1);
        if (position.start > position.end) position.start = position.end;
        return { start: position.start, end: position.end };
    };

    childrenWithoutTrailingLinebreak = $derived(
        this.children.filter((c) => !(c.last && c instanceof Linebreak)),
    );

    values = $derived({
        text: this.childrenWithoutTrailingLinebreak
            .map((c) => (c instanceof Text ? c.text : "\n"))
            .join(""),
        json: {
            type: this.type,
            children: this.childrenWithoutTrailingLinebreak.map(
                (c) => c.values.json,
            ),
        },
    });

    data() {
        return {
            ...super.data(),
            type: /** @type {'paragraph'} */ (this.type),
            children: this.childrenWithoutTrailingLinebreak.map((c) =>
                c.data(),
            ),
            text: this.childrenWithoutTrailingLinebreak.map((c) => (c instanceof Linebreak ? "\n" : c.text)).join(""),
        };
    }

    /**
     * @typedef {{ type: 'text', data: string }|string} TextDataType
     * @typedef {{ type: 'json'|'children', data: Array<any> }|Array<any>} JsonDataType
     * @param {TextDataType|JsonDataType} data
     * @param {*} rest
     */
    static data(data, rest = {}) {
        data ??= { type: "children", data: [] };
        if (typeof data === "string") data = { type: "text", data };
        if (Array.isArray(data)) data = { type: "children", data };
        if (data?.type === "json") data.type = "children";
        if (data.type === "text") {
            const texts = data.data.split("\n").map((t, i, arr) => {
                const blocks = [];
                if (t) blocks.push(Text.data({ text: t }));
                if (i < arr.length - 1) blocks.push(Linebreak.data());
                return blocks;
            });
            return super.data(texts.flat(), rest);
        } else if (data.type === "children" && Array.isArray(data.data)) {
            return super.data(data.data, rest);
        } else return super.data([], rest);
    }

    /**
     * Récupère les données brutes de découpage du paragraphe aux positions spécifiées
     * @param {{start?: number, end?: number, offset?: number} | SMART} [data=SMART]
     */
    getSplittingData = (data) => {
        // === 1.  Normalisation des paramètres ===
        if (!data) data = SMART;
        if (data === SMART) data = { start: this.selection?.start || 0, end: this.selection?.end || this.selection?.start || 0 };
        else if (data?.offset && (data.start || data.end)) throw new Error("Cannot specify both offset and start/end for split operation.");
        else if (data?.offset) data = { start: data.offset, end: data.offset };
        else if (!data?.start && !data?.end) data = { start: 0, end: 0 };
        const { start = 0, end = 0 } = data;
        
        // Trouver les blocks concernés
        const startBlock = this.children.find((child) => start >= child.start && start <= child.end) || null;
        const endBlock = this.children.find((child) => end >= child.start && end <= child.end) || null;
        
        // Calculer les indices
        const startBlockIndex = startBlock ? this.children.indexOf(startBlock) : -1;
        const endBlockIndex = endBlock ? this.children.indexOf(endBlock) : -1;
        
        // Déterminer les groupes de blocks
        const beforeBlocks = startBlock ? this.children.slice(0, startBlockIndex) : [];
        const middleBlocks = startBlock && endBlock && startBlockIndex < endBlockIndex ? this.children.slice(startBlockIndex + 1, endBlockIndex) : [];
        const afterBlocks = endBlock ? this.children.slice(endBlockIndex + 1).filter((b) => !(b instanceof Linebreak && this.children.at(-1) === b)) : [];
        
        // Récupérer les données de découpage des blocks textuels
        const startSplittingData = startBlock instanceof Linebreak ? null : startBlock?.getSplittingData({
            from: start - startBlock.start, 
            to: endBlock === startBlock ? end - startBlock.start : startBlock.text.length 
        }) || null;
        
        const endSplittingData = endBlock instanceof Linebreak ? null : endBlock?.getSplittingData({
            from: startBlock === endBlock ? start - endBlock.start : 0,
            to: end - endBlock.start,
        }) || null;
        
        return {
            type: /** @type {"paragraph"} */ ("paragraph"),
            start,
            end,
            startBlock,
            endBlock,
            beforeBlocks,
            middleBlocks,
            afterBlocks,
            startSplittingData,
            endSplittingData,
            totalLength: this.length,
        };
    };
}