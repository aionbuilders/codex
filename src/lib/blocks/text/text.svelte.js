import { untrack } from "svelte";
import { Block } from "../block.svelte";
import { TextEdition, TextStyling } from "./text.ops";
import {
    applier,
    executor,
    SMART,
    Transaction,
} from "../../utils/operations.utils";
import { EDITABLE, TRANSFORMS_TEXT } from "../../utils/capabilities";
import TextC from "./Text.svelte";

/** @typedef {import('../../types').Focus} Focus */

/**
 * @typedef {import('../block.svelte').BlockInit & {
 *   text?: String
 *   styles?: Styles
 * } & Styles} TextInit
 */

/**
 * @typedef {import('../block.svelte').BlockInit & {type: 'text', init: TextInit}} TextObject
 */

/**
 * @typedef {{
 *  bold?: Boolean,
 *  italic?: Boolean,
 *  underline?: Boolean,
 *  strikethrough?: Boolean,
 *  code?: Boolean
 * }} Styles
 */

/** @typedef {"bold"|"italic"|"underline"|"strikethrough"|"code"} Style */

/**
 * @extends {Block}
 */
export class Text extends Block {
    /** @type {import('../block.svelte').BlockManifest} */
    static manifest = {
        type: "text",
        capabilities: [EDITABLE, TRANSFORMS_TEXT],
        dataTypes: ["text/plain", "text"],
        component: TextC,
    };

    /**
     * @param {import('../codex/codex.svelte').Codex} codex
     * @param {TextInit} init */
    constructor(codex, init = {}) {
        super(codex, init);

        this.text = init.text || "";
        this.styles = init.styles || {};

        $effect.root(() => {
            $effect(() => {
                this.element &&
                    untrack(() => {
                        if (this.element) {
                            this.element.textContent = this.text;
                        }
                    });
            });
        });

        this.trine("edit", this.prepareEdit, this.edit, this.applyEdit);

        this.$init();
    }

    /** @type {HTMLSpanElement?} */
    element = $state(null);

    text = $state("");

    /** @type {Number} */
    start = $derived(this.before ? (this.before.end ?? 0) : 0);
    /** @type {Number} */
    end = $derived(this.start + (this.text.length || 0));

    /** @type {Styles} */
    styles = $state({});

    /** @param {"bold"|"italic"|"underline"|"strikethrough"|"code"} style */
    toggleStyle = (style) => {
        if (
            ["bold", "italic", "underline", "strikethrough", "code"].includes(
                style,
            )
        ) {
            this.styles[style] = !this.styles[style];
        }
    };

    signature = $derived.by(() => {
        let sig = "text#";
        if (this.styles.bold) sig += "b";
        if (this.styles.italic) sig += "i";
        if (this.styles.underline) sig += "u";
        if (this.styles.strikethrough) sig += "s";
        if (this.styles.code) sig += "c";
        return sig;
    });

    selection = $derived.by(() => {
        const range = this.codex?.selection.range;
        if (this.selected && range && this.element) {
            const localrange = range.cloneRange();
            const textnode = this.element.childNodes[0];
            if (!textnode) return;
            try {
                if (range.comparePoint(textnode, 0) >= 0) {
                    localrange.setStart(textnode, 0);
                }
                if (range.comparePoint(textnode, this.text.length) <= 0) {
                    localrange.setEnd(textnode, this.text.length);
                }
            } catch (e) {
                console.error(e, textnode);
            }
            const startOffset = localrange.startOffset;
            const endOffset = localrange.endOffset;

            return {
                start: startOffset,
                end: endOffset,
                length: endOffset - startOffset,
            };
        }
    });

    selectionDebug = $derived(
        `${this.selection ? `Selection: ${this.selection.start} - ${this.selection.end} (${this.selection.length})` : "No selection"}`,
    );

    /** @type {import('../../utils/block.utils').BlockListener<KeyboardEvent>} */
    onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            return this.ascend(e, {
                block: this,
                action: "split",
                editData:
                    this.selection?.start !== this.text.length
                        ? {
                              from: this.selection?.start,
                              to: this.text.length,
                          }
                        : undefined,
                newTextData: this.text.slice(this.selection?.end || 0)
                    ? {
                          text: this.text.slice(this.selection?.end || 0),
                          styles: this.getStyles(),
                      }
                    : undefined,
            });
        }
        if (e.key !== "Backspace" && e.key !== "Delete") return this.ascend(e);

        e.preventDefault();

        if (!this.selection) return;

        const isBackspace = e.key === "Backspace";
        const { start, end } = this.selection;
        if (this.selection.length > 0) {
            if (this.selection.length === this.text.length) {
                return this.ascend(e, {
                    action: "delete",
                    block: this,
                });
            }
            this.edit({ from: start, to: end }).then((tx) => {
                tx.focus({ start, end: start, block: this });
            });
        } else if (
            (isBackspace && start === 0) ||
            (!isBackspace && end === this.text.length)
        ) {
            return this.ascend(e, {
                action: "nibble",
                block: this,
                what: isBackspace ? "previous" : "next",
            });
        } else if (
            (isBackspace && start === 1 && this.text.length === 1) ||
            (!isBackspace && start === 0 && this.text.length === 1)
        ) {
            return this.ascend(e, {
                action: "delete",
                block: this,
                key: isBackspace ? "Backspace" : "Delete",
            });
        } else {
            const from = isBackspace ? start - 1 : start;
            const to = isBackspace ? start : start + 1;
            console.log(
                "Editing text to remove character from",
                from,
                "to",
                to,
            );
            this.edit({
                from,
                to,
            }).then((tx) => tx.focus({ start: from, end: from, block: this }));
        }
    };

    /** @type {import('../../utils/block.utils').BlockListener<InputEvent>} */
    oninput = (e) => {
        this.refresh();
    };

    onfocus = () => {};

    /** @type {import('../../utils/block.utils').BlockListener<InputEvent>} */
    onbeforeinput = (e) => {
        if (e.inputType === "insertText" && e.data) {
            let { start, end } = this.selection || {};
            start ??= this.text.length;
            this.edit({
                text: e.data,
                from: start,
                to: end,
            }).then((tx) =>
                tx.focus({
                    start: (start ?? this.text.length) + (e.data?.length || 0),
                    end: (start ?? this.text.length) + (e.data?.length || 0),
                    block: this,
                }),
            );
            e.preventDefault();
        }
    };

    /** Refreshes the text content from the element */
    refresh = () => {
        if (this.element) this.text = this.element.textContent;
    };

    /** Resyncs the text content with the element */
    resync = () => {
        if (this.element) {
            this.element.textContent = this.text;
        }
    };

    /**
     * @param {Focus} f
     * @returns
     */
    focus = (f) =>
        requestAnimationFrame(() => {
            if (this.element) {
                const data = this.getFocusData(f);
                if (data) {
                    this.codex?.selection?.setRange(
                        data.startElement,
                        data.startOffset,
                        data.endElement,
                        data.endOffset,
                    );
                    return true;
                } else
                    return console.warn(
                        "Text focus data is not available yet.",
                    );
            }
        });

    /**
     * @param {Focus} f
     * @returns
     */
    getFocusData(f) {
        let { start = f.offset || 0, end = f.offset || 0 } = f;
        if (start < 0) start = this.text.length + (start + 1);
        if (end < 0) end = this.text.length + (end + 1);
        if (
            start > this.text.length ||
            end > this.text.length ||
            start < 0 ||
            end < 0
        ) {
            console.warn(
                `Invalid focus range: start=${start}, end=${end} for text "${this.text}".`,
            );
            return;
        }
        if (this.element) {
            const text = this.element.firstChild;
            if (!text || !(text.nodeType === Node.TEXT_NODE)) {
                console.warn(
                    "Text element is not a text node or does not exist.",
                );
                return;
            }
            return {
                startElement: text,
                endElement: text,
                startOffset: start,
                endOffset: end,
            };
        } else {
            console.warn("Text element is not available yet.");
            return;
        }
    }

    data() {
        return {
            ...super.data(),
            type: "text",
            text: this.text,
            styles: this.getStyles(),
        };
    }

    // /** @returns {TextObject} */
    toJSON() {
        return {
            ...super.toJSON(),
            type: "text",
            init: {
                text: this.text,
                ...this.getStyles(),
            },
        };
    }

    toObject() {
        return {
            type: "text",
            text: this.text,
            ...this.getStyles(),
        };
    }

    toInit() {
        return {
            ...super.toInit(),
            init: {
                text: this.text,
                ...this.getStyles(),
            },
        };
    }

    toMarkdown() {}

    getRelativePosition() {
        return {
            start: this.start,
            end: this.end,
        };
    }

    /**
     * @param {{
     *   text: string,
     *   offset: number
     * }} data
     */
    applyInsert = (data) => {
        const { text, offset } = data;
        if (offset < 0 || offset > this.text.length) {
            throw new Error(
                `Offset ${offset} is out of bounds for text "${this.text}".`,
            );
        }
        this.text = this.text.slice(0, offset) + text + this.text.slice(offset);
        this.resync();
        this.refresh();
    };

    //TODO: Replace .getStyles with direct access to this.styles
    getStyles = () => ({
        bold: this.styles.bold,
        italic: this.styles.italic,
        underline: this.styles.underline,
        strikethrough: this.styles.strikethrough,
        code: this.styles.code,
    });

    /** @param {Number} index */
    normalizeIndex = (index) => {
        if (index < 0) index = this.text.length + index + 1;
        return Math.max(0, Math.min(index, this.text.length));
    };

    /** @param {EditData|import('../../utils/operations.utils').SMART} data  */
    normalizeEditParams = (data) => {
        const isSmartMode = data === SMART;

        let {
            text = "",
            from,
            to,
        } = isSmartMode
            ? { from: this.selection?.start, to: this.selection?.end }
            : data;

        // Validation
        if (from === undefined && from !== 0) {
            throw new Error("From is required for text edit.");
        }

        // Normalisation des indices
        from = this.normalizeIndex(from);
        to = to !== undefined ? this.normalizeIndex(to) : from;

        // Assurer from <= to
        if (to < from) to = from;

        return { text, from, to };
    };

    /**
     * @param {{
     *   from: number,
     *   to: number
     * }|import('../../utils/operations.utils').SMART} [data=SMART]
     */
    getSplittingData = (data) => {
        if (!data) data = SMART;
        const { from, to } = this.normalizeEditParams(data);

        return {
            from,
            to,
            limit: this.text.length,
            before:
                from > 0
                    ? {
                          text: this.text.slice(0, from),
                          styles: this.getStyles(),
                      }
                    : null,

            removed:
                from < to
                    ? {
                          text: this.text.slice(from, to),
                          styles: this.getStyles(),
                      }
                    : null,

            after:
                to < this.text.length
                    ? {
                          text: this.text.slice(to),
                          styles: this.getStyles(),
                      }
                    : null,
        };
    };

    /** @param {EditData|import('../../utils/operations.utils').SMART} [data=SMART]  */
    prepareEdit = (data) => {
        const ops = this.ops();
        if (!this.codex) return ops;
        if (!data) data = SMART;
        const params = this.normalizeEditParams(data);
        ops.add(new TextEdition(this, params));
        return ops;
    };

    /** @type {import('../../utils/operations.utils').Executor<EditData>} */
    edit = executor(this, (data) => this.prepareEdit(data));

    applyEdit = applier((op) => {
        /** @type {EditData} */
        let { text = "", from, to } = op.data;
        to = to ?? from;
        this.text = this.text.slice(0, from) + text + this.text.slice(to);
        this.resync();
        this.refresh();
    });

    /**
     * @param {{
     *  from?: number|SMART,
     *  to?: number|SMART
     * }|import('../../utils/operations.utils').SMART} [data=SMART]
     * @returns {import('../../utils/operations.utils').Operation[]}
     */
    prepareSplitting = (data) => {
        const ops = this.ops();
        if (!this.codex) return ops;
        if (!data) data = SMART;
        if (data === SMART)
            data = {
                from: this.selection?.start,
                to: this.selection?.end,
            };
        let { from = SMART, to = SMART } = data;
        if (from === SMART) from = this.selection?.start ?? 0;
        if (to === SMART) to = this.selection?.end ?? from;
        from = this.normalizeIndex(from);
        to = this.normalizeIndex(to);
        if (to < from) to = from;
        const { before, removed, after } = this.getSplittingData({ from, to });

        if (removed) {
        }

        return ops;
    };

    /**
     * @param {{
     *  from?: number|SMART,
     *  to?: number|SMART,
     *  styles?: Styles
     * }} data
     */
    prepareStyling = (data) => {
        const ops = this.ops();
        if (!this.codex) return ops;
        if (data.from === undefined && data.from !== 0) data.from = SMART;
        if (data.to === undefined) data.to = data.from;
        const from = this.normalizeIndex(
            typeof data.from === "number"
                ? data.from
                : (this.selection?.start ?? 0),
        );
        const to = this.normalizeIndex(
            typeof data.to === "number"
                ? data.to
                : (this.selection?.end ?? from),
        );
        const styles = data.styles || {};

        const fullySelected = from === 0 && to === this.text.length;

        const before =
            from > 0
                ? {
                      text: this.text.slice(0, from),
                      styles: this.getStyles(),
                  }
                : null;

        const after =
            to < this.text.length
                ? {
                      text: this.text.slice(to),
                      styles: this.getStyles(),
                  }
                : null;

        /** @type {Styles} */
        const diff = {};
        Object.entries(styles).forEach(([key, value]) => {
            if (
                !(
                    key === "bold" ||
                    key === "italic" ||
                    key === "underline" ||
                    key === "strikethrough" ||
                    key === "code"
                )
            )
                return;
            if (this.styles[key] !== value) {
                diff[key] = value;
            }
        });

        
        /** @type {(keyof Styles)[]} */
        // @ts-ignore
        const enable = Object.entries(diff)
            .filter(([key, value]) => value === true)
            .map(([key]) => key);

        /** @type {(keyof Styles)[]} */
        // @ts-ignore
        const disable = Object.entries(diff)
            .filter(([key, value]) => value === false)
            .map(([key]) => key);

        const middle =
            to > from
                ? {
                      text: this.text.slice(from, to),
                      styles: {
                          ...this.getStyles(),
                          ...styles,
                      },
                  }
                : null;

        if (before)
            ops.push(
                ...(this.parent?.prepareInsert({
                    blocks: [Text.data(before)],
                    offset: this.i,
                }) || []),
            );
        if (after)
            ops.push(
                ...(this.parent?.prepareInsert({
                    blocks: [Text.data(after)],
                    offset: this.i + (before ? 1 : 0) + (middle ? 1 : 0),
                }) || []),
            );
        if (middle)
            ops.push(
                ...[
                    ...(fullySelected
                        ? []
                        : this.prepareEdit({
                              text: middle.text,
                              from: 0,
                              to: -1,
                          })),
                    new TextStyling(this, {
                        enable: enable,
                        disable: disable,
                        ids: [this.uuid],
                    }),
                ],
            );

        return ops;
    };

    applyStyling = applier(
        (op) => {
            /** @type {{enable?: Style[], disable?: Style[]}} */
            const data = op.data;

            if (data.enable) {
                data.enable.forEach((style) => {
                    this.styles[style] = true;
                });
            }
            if (data.disable) {
                data.disable.forEach((style) => {
                    this.styles[style] = false;
                });
            }
        },
        "@codex/styling",
        this,
    );

    /**
     * @param {{
     *  text?: string,
     *  styles?: Styles
     * }} data
     * @returns
     */
    $in(data) {
        data.text && (this.text = data.text);
        data.styles &&
            Object.entries(data.styles).forEach(([key, value]) => {
                key = key.toLowerCase();
                if (
                    [
                        "bold",
                        "italic",
                        "underline",
                        "strikethrough",
                        "code",
                    ].includes(key) &&
                    typeof value === "boolean"
                ) {
                    if (
                        !(
                            key === "bold" ||
                            key === "italic" ||
                            key === "underline" ||
                            key === "strikethrough" ||
                            key === "code"
                        )
                    )
                        return;
                    this.styles[key] = value;
                }
            });
    }

    values = $derived({
        text: this.text,
        json: {
            type: /** @type {"text"} */ ("text"),
            text: this.text,
            styles: this.getStyles(),
        },
    });

    debug = $derived(`${this.signature} (${this.selection?.start}->${this.selection?.end})`);

    /**
     * @param {{
     *  text: string,
     *  styles?: Styles
     * }|string} data 
     * @returns 
     */
    static data(data, rest = {}) {
        if (typeof data === 'string') data = { text: data };
        return {
            ...super.data(rest),
            ...data
        }
    }

    /** @param {import('../block.svelte').MegaBlock} parent */
    static prepareConsecutiveTextsNormalization(parent) {
        const ops = parent.ops();
        const groups = findConsecutiveTextGroupsByStyle(/** @type {(Text)[]} */ (parent.children));
        if (!groups.length) return ops;
        groups.forEach((group) => {
            const texts = group.map((i) => parent.children[i]).filter((c) => c instanceof Text);
            if (texts.length < 2) return;
            const first = texts[0];
            const merging = texts.slice(1).reduce((acc, t) => acc + t.text, "");
            ops.push(
                ...first.prepareEdit({
                    from: -1,
                    to: -1,
                    text: merging,
                }),
            );
            ops.push(
                ...parent.prepareRemove({
                    ids: texts.slice(1).map((t) => t.id),
                }),
            );
        });
        return ops;
    }

    /** @param {import('../block.svelte').MegaBlock} parent */
    static normalizeConsecutiveTexts(parent) {
        const ops = Text.prepareConsecutiveTextsNormalization(parent);
        if (ops.length) parent.codex?.effect(ops);
    }
}

/**
 * @typedef {{
 *   text?: string,
 *   from: number,
 *   to?: number
 * }} EditData
 */

/**
 * @typedef {{
 *  block: Text,
 *  action: 'split',
 *  editData: {
 *    from: number,
 *    to: number
 *  },
 *  newTextData: {
 *    text: string,
 *    styles: Styles
 *  } | undefined
 * }} SplitData
 */

/**
 * @typedef {SplitData} TextActionsData
 */



/**
 * Finds consecutive text elements with the same style.
 * @param {(Text)[]} elements
 * @returns {Number[][]} - Array of arrays, each containing the indices of consecutive Text elements with the same style.
 */
function findConsecutiveTextGroupsByStyle(elements) {
    const groups = [];
    /** @type {Number[]} */
    let currentGroup = [];
    let currentStyle = null;

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        // Si c'est un Text
        if (element instanceof Text) {
            const elementStyle = element.signature;

            // Si c'est le premier Text ou si le style est différent du précédent
            if (currentStyle === null || elementStyle !== currentStyle) {
                // Sauvegarder le groupe précédent s'il contient au moins 2 éléments
                if (currentGroup.length >= 2) {
                    groups.push([...currentGroup]);
                }

                // Commencer un nouveau groupe
                currentGroup = [i];
                currentStyle = elementStyle;
            }
            // Si le style est le même que le précédent
            else if (elementStyle === currentStyle) {
                currentGroup.push(i);
            }
        }
        // Si c'est un Linebreak ou autre chose
        else {
            // Sauvegarder le groupe actuel s'il contient au moins 2 éléments
            if (currentGroup.length >= 2) {
                groups.push([...currentGroup]);
            }

            // Réinitialiser pour le prochain groupe
            currentGroup = [];
            currentStyle = null;
        }
    }

    // Ne pas oublier le dernier groupe
    if (currentGroup.length >= 2) {
        groups.push(currentGroup);
    }

    return groups;
}
