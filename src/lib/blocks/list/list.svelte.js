import z from "zod";
import { MegaBlock, Paragraph, Text } from "..";
import ListC from "./List.svelte";
import ListItemC from "./ListItem.svelte";
import { untrack } from "svelte";

/**
 * @typedef {import('../block.svelte').MegaBlockInit & {
 *  children?: ListItemInit[]
 * }} ListInit
 */

/**
 * @extends MegaBlock<ListItem>
 */
class List extends MegaBlock {
    /** @type {import("../block.svelte").MegaBlockManifest} */
    static manifest = {
        ...MegaBlock.manifest,
        type: "list",
        blocks: [],
        component: ListC,
    };

    /**
     * @param {import('../codex/codex.svelte').Codex} codex
     * @param {ListInit} init
     */
    constructor(codex, init = {}) {
        super(codex, init);

        if (!init.children?.length) this.children = [new ListItem(codex, {})];

        // $effect.root(() => {
        //     $effect(() => {
        //         if (this.codex && this.element) untrack(() => {
        //             if (!this.children.length) {
        //                 const listItem = new ListItem(this.codex, {});
        //                 this.children = [listItem];
        //             }
        //         })
        //     })
        // })

        this.method("remove", this.applyRemove.bind(this));
    }

    level = $derived(this.parents.filter((p) => p instanceof List).length);

    /** @param {KeyboardEvent} event @param {any} data */
    onkeydown(event, data) {
        if (!this.parent) return;
        const cases = {
            Enter: () => {
                /** @type {{item: ListItem, paragraph: Paragraph}} */
                const { item, paragraph } = data;
                const ops = this.ops();

                const truncateOps = paragraph.prepareTruncate();
                /** @type {ReturnType<Paragraph['getSplittingData']>} */
                const splittingData = truncateOps.metadata.get("splitting");
                ops.add(truncateOps);
                if (splittingData)
                    ops.add(
                        this.prepare(
                            "insert",
                            {
                                block: {
                                    type: "list_item",
                                    paragraph: /** @type {ParagraphInit} */ ({
                                        children: [
                                            ...(splittingData.endSplittingData
                                                ? [
                                                      {
                                                          type: "text",
                                                          ...splittingData
                                                              .endSplittingData
                                                              .after,
                                                      },
                                                  ]
                                                : []),
                                            ...splittingData.afterBlocks.map(
                                                (b) => b.values.json,
                                            ),
                                        ],
                                    }),
                                    sublist:
                                        item.sublist?.values.json || undefined,
                                },
                                offset: item.i + 1,
                            },
                            { tag: "new_list_item" },
                        ),
                        item.sublist?.prepare("destroy") || [],
                    );

                this.codex
                    ?.tx(ops)
                    .execute()
                    .then((tx) => {
                        const op = tx.operations.find(
                            (op) => op.metadata.tag === "new_list_item",
                        );
                        const result = tx.results.find(
                            (r) => r.operation === op,
                        )?.result;
                        /** @type {ListItem} */
                        const listItem = result[0];
                        tx.focus({
                            start: 0,
                            end: 0,
                            block: listItem.children[0],
                        });
                    });
            },
            Backspace: () => {
                /** @type {{item: ListItem, paragraph: Paragraph, collapsedAtStart: boolean}} */
                const { item, collapsedAtStart } = data;
                this.log(
                    "Backspace in list item, collapsedAtStart=",
                    collapsedAtStart,
                );
                if (collapsedAtStart) {
                    const ops = this.ops();
                    if (this.level > 0) {
                        if (!item.parent) return;

                        const parentList = /** @type {List} */ (/** @type {unknown} */ (item.parent));
                        const grandParentItem = /** @type {ListItem} */ (parentList.parent);
                        const grandParentList = /** @type {List} */ (/** @type {unknown} */ (grandParentItem.parent));

                        const afterSiblings = parentList.children.slice(
                            item.i + 1,
                        );

                        ops.add(
                            afterSiblings.length
                                ? parentList.prepare("remove", {
                                      ids: afterSiblings.map(
                                          (sibling) => sibling.id,
                                      ),
                                  })
                                : [],
                        );

                        ops.add(
                            grandParentList.prepare(
                                "insert",
                                {
                                    block: {
                                        ...item.values.json,
                                        ...(afterSiblings.length
                                            ? {
                                                  sublist: {
                                                      type: "list",
                                                      children: [
                                                          ...afterSiblings.map(
                                                              (sibling) =>
                                                                  sibling.values
                                                                      .json,
                                                          ),
                                                      ],
                                                  },
                                              }
                                            : {}),
                                    },
                                    offset: grandParentItem.i + 1,
                                },
                                { type: "unindent" },
                            ),
                        );

                        ops.add(
                            parentList.children.length > 1
                                ? item.prepareDestroy()
                                : parentList.prepareDestroy(),
                        );

                        this.codex
                            ?.tx(ops)
                            .execute()
                            .then((tx) => {
                                const op = tx.operations.find(
                                    (op) => op.metadata.type === "unindent",
                                );
                                const result = tx.results.find(
                                    (r) => r.operation === op,
                                )?.result;
                                /** @type {ListItem} */
                                const listItem = result[0];
                                tx.focus({
                                    start: 0,
                                    end: 0,
                                    block: listItem.children[0],
                                });
                            });
                    } else if (this.level === 0) {
                        const itemIndex = this.children.indexOf(item);
                        const previousItems = this.children.slice(0, itemIndex);
                        const nextItems = this.children.slice(itemIndex + 1);
                        if (!this.parent) return;
                        if (previousItems.length)
                            ops.add(
                                this.parent.prepare('insert',{
                                    block: {
                                        type: "list",
                                        children: previousItems.map(pi => pi.values.json),
                                    },
                                    offset: this.i,
                                }),
                            );

                        ops.add(
                            this.prepareDestroy(),
                            this.parent.prepare(
                                "insert",
                                {
                                    block: {
                                        type: "paragraph",
                                        children:
                                            item.paragraph.values.json.children,
                                    },
                                    offset: previousItems.length
                                        ? this.i + 1
                                        : this.i,
                                },
                                { type: "list_to_paragraph" },
                            ),
                        );

                        if (nextItems.length)
                            ops.add(
                                this.parent.prepare('insert', {
                                    block: {
                                        type: "list",
                                        children: nextItems.map(ni => ni.values.json),
                                    },
                                    offset: previousItems.length
                                        ? this.i + 2
                                        : this.i + 1,
                                }),
                            );

                        this.codex
                            ?.tx(ops)
                            .execute()
                            .then((tx) => {
                                const p = tx.results.find(
                                    (r) =>
                                        r.operation.name === "insert" &&
                                        r.operation.metadata.type ===
                                            "list_to_paragraph",
                                )?.result[0];
                                this.log(
                                    "Focusing paragraph after merging list item on Backspace:",
                                    p,
                                );
                                if (p) {
                                    tx.focus({
                                        start: 0,
                                        end: 0,
                                        block: p,
                                    });
                                }
                            });
                    }
                }
            },
            Tab: () => {
                /** @type {{item: ListItem, paragraph: Paragraph}} */
                const { item, paragraph } = data;
                this.log("Tab in list item, paragraph=", paragraph);
                if (paragraph) {
                    const ops = this.ops();
                    const previousItem = this.children[item.i - 1];
                    if (previousItem) {
                        const previousList = previousItem.sublist;
                        if (!previousList)
                            ops.add(
                                previousItem.prepare(
                                    "insert",
                                    {
                                        block: {
                                            type: "list",
                                            children: [
                                                {
                                                    ...item.values.json,
                                                    id: item.id,
                                                },
                                            ],
                                        },
                                        offset: previousItem.children.length,
                                    },
                                    { type: "indent", effect: "create" },
                                ),
                            );
                        else
                            ops.add(
                                previousList.prepare(
                                    "insert",
                                    {
                                        block: {
                                            ...item.values.json,
                                            id: item.id,
                                        },
                                        offset: previousList.children.length,
                                    },
                                    { type: "indent", effect: "add" },
                                ),
                            );

                        ops.add(item.prepareDestroy());
                    }
                    this.codex
                        ?.tx(ops)
                        .execute()
                        .then((tx) => {
                            const result = tx.results.find(
                                (r) =>
                                    r.operation.name === "insert" &&
                                    r.operation.metadata.type === "indent",
                            );
                            const effect = result?.operation.metadata.effect;
                            this.log(
                                "Result of indent operation on Tab in list item:",
                                result,
                                effect,
                            );

                            if (effect === "create") {
                                /** @type {List} */
                                const list = result ? result.result[0] : null;
                                const paragraph = list
                                    ? list.children[0].paragraph
                                    : null;
                                this.log(
                                    "Focusing paragraph after indenting list item on Tab (create):",
                                    paragraph,
                                );
                                if (paragraph) {
                                    tx.focus({
                                        start: 0,
                                        end: 0,
                                        block: paragraph,
                                    });
                                }
                            } else if (effect === "add") {
                                /** @type {ListItem} */
                                const listItem = result
                                    ? result.result[0]
                                    : null;
                                const paragraph = listItem
                                    ? listItem.paragraph
                                    : null;
                                this.log(
                                    "Focusing paragraph after indenting list item on Tab (add):",
                                    paragraph,
                                );
                                if (paragraph) {
                                    tx.focus({
                                        start: 0,
                                        end: 0,
                                        block: paragraph,
                                    });
                                }
                            }
                        });
                }
            },
        };

        if (data?.key) {
            const key = /** @type {"Enter" | "Backspace" | "Tab"} */ (data.key);
            const handler = cases[key];
            if (handler) {
                handler();
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    /** @type {import("../block.svelte").Applier} */
    applyRemove(/** @type {import('../block.ops').BlocksRemoval<any>} */ op, tx) {
        const items = super.applyRemove(op, tx);
        if (!this.children.length) tx.after(() => this.ops(this.prepareDestroy()));
        return items;
    }
}

/**
 * @typedef {import('../paragraph/paragraph.svelte').ParagraphInit} ParagraphInit
 */

/**
 * @typedef {import('../block.svelte').MegaBlockInit & {
 *   paragraph?: ParagraphInit,
 *   sublist?: ListInit,
 *   children?: (ListInit|ParagraphInit)[]
 * }} ListItemInit
 */

/**
 * @extends MegaBlock<import('../paragraph/paragraph.svelte').Paragraph|List>
 */
class ListItem extends MegaBlock {
    /** @type {import("../block.svelte").MegaBlockManifest} */
    static manifest = {
        ...MegaBlock.manifest,
        type: "list_item",
        blocks: [Paragraph, List],
        component: ListItemC,
        schema: z
            .array(z.union([z.instanceof(Paragraph), z.instanceof(List)]))
            .min(1)
            .max(2)
            .refine(
                (children) => {
                    return children[0] instanceof Paragraph;
                },
                {
                    error: "The first child of a list item must be a paragraph.",
                },
            )
            .refine(
                (children) => {
                    if (children.length === 2 && !(children[1] instanceof List))
                        return false;
                    return true;
                },
                {
                    error: "The second child of a list item must be a list if it exists.",
                },
            ),
    };

    /**
     * @param {import('../codex/codex.svelte').Codex} codex
     * @param {ListItemInit} init
     */
    constructor(codex, init = {}) {
        init.children = [
            ...(init.children || []).filter(
                (c) => c !== null && c !== undefined,
            ),
            ...(init.paragraph
                ? [{ ...init.paragraph, type: "paragraph" }]
                : []),
            ...(init.sublist ? [{ ...init.sublist, type: "list" }] : []),
        ];
        super(codex, init);

        $effect.root(() => {
            $effect(() => {
                if (this.codex && this.element) {
                    if (!this.children.length) {
                        const paragraph = new Paragraph(this.codex, {});
                        this.children = [paragraph];
                    }
                }
            });
        });
    }

    paragraph = $derived(/** @type {import('../paragraph/paragraph.svelte').Paragraph} */ (this.children[0]));
    sublist = $derived( /** @type {List|null} */ (this.children[1] ?? null));
}

List.manifest.blocks = [ListItem];
export { List, ListItem };
