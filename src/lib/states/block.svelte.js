/**
 * @typedef {Object} BlockOperation
 * @property {string} type - The type of operation (e.g., "insert", "delete", "replace").
 * @property {string[]} params - Parameters for the operation, such as coordinates or block IDs.
 * @property {string} handler - The name of the handler function to execute for this operation.
 */
import { applier, preparer } from "../utils/operations.utils";
import {
    BlocksInsertion,
    BlocksRemoval,
    BlocksReplacement,
} from "./blocks/operations/block.ops";
import { Codex } from "./codex.svelte";
import { untrack } from "svelte";
/**
 * @typedef {new (...args: any[]) => Block} BlockConstructor
 */

/**
 * @typedef {Object} BlockManifest
 * @property {string} type - The type of block (e.g., "paragraph", "text", "linebreak").
 * @property {Object<string, BlockOperation>} [operations] - A map of operation types to their handlers.
 * @property {(import('./capability.svelte').Capability|symbol)[]} [capabilities] - The capabilities of the block.
 * @property {import('svelte').Component?} [component] - The Svelte component associated with the block.
 * @property {string[]} [dataTypes] - The data types supported by the block (e.g., "text/plain", "text/html").
 */

/**
 * @typedef {BlockManifest & {
 *   blocks: Array<BlockConstructor>;
 *   strategies?: import('./strategy.svelte').Strategy[];
 *   systems?: import('./system.svelte').System[];
 * }} MegaBlockManifest
 */

/**
 * @typedef {Object} BlockObject
 * @property {string} id - The unique identifier for the block.
 * @property {string} type - The type of the block (e.g., "paragraph", "text").
 */

/**
 * @callback BlockMethod
 * @param {...any} args - Additional arguments for the method.
 */

/**
 * @typedef {any} InData
 */

/**
 * @typedef {Object} BlockInit
 * @property {string} [id] - The unique identifier for the block.
 * @property {Object} [metadata] - Metadata associated with the block.
 * @property {InData} [in] - Initial values for the block.
 */

/** @typedef {{
 *  children: BlockInit[]
 * } & BlockInit } MegaBlockInit */

/**
 * @typedef {Object} BlockData
 * @property {string} type - The type of the block.
 * @property {BlockInit & Object<string, any>} [init] - The initialization data for the block.
 */

export class Block {
    /** @type {BlockManifest} */
    static manifest = {
        type: "block",
        operations: {},
        capabilities: [],
        dataTypes: [],
    };

    /** @param {import('./codex.svelte').Codex?} codex @param {BlockInit} init */
    constructor(codex, init = {}) {
        this.codex = codex;
        this.id = init.id || crypto.randomUUID();
        this.metadata = init.metadata || {};
        this.in = init.in || {};

        /**
         * A set of methods available on the block.
         * @type {Map<string, Function>}
         */
        this.methods = new Map();

        /**
         * A set of preparators available on the block.
         * @type {Map<string, (function(...any): import('../utils/operations.utils').Operation[])>}
         */
        this.preparators = new Map();

        /**
         * A set of executors available on the block.
         * @type {Map<string, Function>}
         */
        this.executors = new Map();

        /**
         * A set of exporters available on the block.
         * @type {Map<string, Function>}
         */
        this.exporters = new Map();

        this.method("delete", () => this.rm());

        this.uuid = crypto.randomUUID();
    }

    $init() {
        if (this.in?.type === this.manifest.type) this.$in(this.in);
    }

    get type() {
        return this.manifest.type;
    }

    get capabilities() {
        return new Set(this.manifest.capabilities);
    }

    get dataTypes() {
        return new Set(this.manifest.dataTypes);
    }

    /** @type {import('svelte').Component?} */
    component = $derived(
        this.codex?.components[this.type] || this.manifest.component || null,
    );

    unlink = $derived(this.codex?.recursive.includes(this) === false);

    /** @type {Number} */
    i = $state(-1);

    /** @type {Number} */
    index = $state(-1);

    /** @type {MegaBlock?} */
    #parent = $state(null);

    get parent() {
        return this.#parent;
    }

    /** @param {MegaBlock?} value */
    set parent(value) {
        if (this.#parent?.children.includes(this) && value !== this.#parent)
            throw new Error(
                "Cannot reassign parent: already a child of the current parent. Remove from current parent first.",
            );
        this.#parent = value;
    }

    /** @type {MegaBlock[]} */
    parents = $derived(
        this.parent ? [...this.parent.parents, this.parent] : [],
    );

    /** @type {Block?} */
    before = $state(null);

    /** @type {Block?} */
    after = $state(null);

    /** @type {Boolean} */
    first = $derived(this.parent?.children[0] === this);

    /** @type {Boolean} */
    last = $derived(
        this.parent?.children[this.parent.children.length - 1] === this,
    );

    /** @type {HTMLElement?} */
    element = $state(null);

    selected = $derived.by(() => {
        if (!this.codex?.selection.isInside) return false;
        this.codex?.selection?.range;
        return untrack(() =>
            this.element
                ? this.codex?.selection?.range?.intersectsNode(this.element)
                : false,
        );
    });

    /** @type {Number} */
    depth = $derived(this.parent ? this.parent.depth + 1 : 0);

    /** @type {Number[]} */
    path = $derived.by(() => {
        if (this.parent && this.parent instanceof MegaBlock)
            return [...this.parent.path, this.index];
        else return [];
    });

    /** @type {({start?: number, end?: number} & Object<string, any>) | null | undefined} */
    selection = $state({
        start: 0,
        end: 0,
    });

    start = $derived(0);
    end = $derived(0);

    length = $derived(0);

    /**
     * @param {{
     *   start?: number,
     *   end?: number,
     *   offset?: number,
     * } & Object<string, any>} f
     * @returns {{
     *   startElement: Node,
     *   startOffset: number,
     *   endElement: Node,
     *   endOffset: number,
     * } | null | undefined}
     */
    getFocusData(f) {
        f;
        return null;
    }

    /** @param {import('./capability.svelte').Capability} capability */
    can = (capability) => this.capabilities.has(capability);

    /**
     * Removes the block from its parent.
     */
    rm = () => {
        if (this.parent) {
            this.parent.children = this.parent.children.filter(
                (child) => child !== this,
            );
            return true;
        }
        return false;
    };

    /** @param {String} format @param {Function} callback */
    exporter = (format, callback) => this.exporters.set(format, callback);

    /** @param {String} format @param  {...any} args */
    export = (format, ...args) => {
        const exporter = this.exporters.get(format);
        if (!exporter)
            throw new Error(
                `No exporter found for "${format}" in block "${this.type}".`,
            );
        return exporter(...args);
    };

    /** @param {Node} node */
    getNodePath(node) {
        const path = [];
        let current = node;

        while (current && current !== this.element) {
            const parent = current.parentNode;
            if (!parent) break;
            const index = Array.from(parent.childNodes).indexOf(current);
            path.unshift(index);
            current = parent;
        }

        return path;
    }

    /** @param {Number[]} path */
    getNodeFromPath(path) {
        /** @type {Node} */
        if (this.element) {
            let current = this.element;

            for (const index of path) {
                if (!current || !current.childNodes[index]) return null;
                current = current.childNodes[index];
            }

            return current;
        } else return null;
    }

    /**
     * Determines the relative position of the block in the document.
     * @param {any} [hint] - Optional hint to specify the desired relative position ('before', 'after', 'start', 'end').
     * @returns {any} - The relative position, which can be 'before', 'after', or an object representing a selection.
     */
    getRelativePosition(hint) {
        // Par défaut, on ne supporte que 'before' ou 'after'
        if (hint === "start" || hint === "before") return "before";
        if (hint === "end" || hint === "after") return "after";

        // Si le bloc a une sélection active, la capturer
        if (this.selected && window.getSelection) {
            const sel = window.getSelection();
            if (!sel) return;
            const range = sel.getRangeAt(0);
            const startInMe = this.element?.contains(range.startContainer);
            const endInMe = this.element?.contains(range.endContainer);

            // Si la sélection est dans mon element
            if (this.element?.contains(range.startContainer)) {
                return {
                    type: "selection",
                    ...(startInMe
                        ? {
                              startPath: this.getNodePath(range.startContainer),
                              startOffset: range.startOffset,
                          }
                        : { startPath: null, startOffset: 0 }),
                    ...(endInMe
                        ? {
                              endPath: this.getNodePath(range.endContainer),
                              endOffset: range.endOffset,
                          }
                        : { endPath: null, endOffset: 0 }),
                };
            }
        }

        return "before"; // Fallback
    }

    /** @type {Object<string, any>} */
    values = $state({});

    /** @type {Object<string, any>} */
    metadata = $state({});

    /** @param {String} operation */
    supports = (operation) =>
        (this.manifest?.operations && operation in this.manifest.operations) ||
        false;

    /**
     * @param {String} name
     * @param {Event} e
     * @param {*} data
     */
    ascend = (name, e, data) => {
        if (this.parents.length) {
            const callableParent = this.parents.find(
                (parent) => typeof parent[name] === "function",
            );
            if (callableParent) {
                e.preventDefault();
                callableParent[name](e, data);
            }
        }
    };

    /**
     * Adds an executor to the block.
     * @param {String} name
     * @param {BlockMethod} callback
     */
    executor = (name, callback) => this.executors.set(name, callback);

    /** @param {String} operation @param {...any} args */
    execute = (operation, ...args) => {
        const executor = this.executors.get(operation);
        if (!executor)
            throw new Error(
                `No executor found for "${operation}" in block "${this.type}".`,
            );
        return executor(...args);
    };

    /**
     * Adds a method to the block.
     * @param {String} name
     * @param {BlockMethod} callback
     */
    method = (name, callback) => this.methods.set(name, callback);

    /**
     * Calls a method on the block.
     * @param {String} name
     * @param {...any} args
     * @returns {any}
     */
    call = (name, ...args) => { 
        const method = this.methods.get(name);
        if (!method)
            throw new Error(
                `Method "${name}" not found in block "${this.type}".`,
            );
        return method(...args);
    };

    /**
     * Adds a preparator to the block.
     * @param {String} name
     * @param {BlockMethod} callback
     */
    preparator = (name, callback) => this.preparators.set(name, callback);

    /**
     * Prepares data for a specific operation.
     * @param {String} name
     * @param {Object?} [data]
     * @param {Object} [metadata]
     * @returns {import('../utils/operations.utils').Operation[]}
     */
    prepare = (name, data, metadata) => {
        const preparator = this.preparators.get(name);
        if (!preparator)
            throw new Error(
                `No preparator found for "${name}" in block "${this.type}".`,
            );
        const preparation = preparator(data);
        if (!preparation) return [];
        return preparation.map((o) => {
            o.metadata = { ...o.metadata, ...metadata };
            return o;
        });
    };

    /**
     * Adds a triple to the block.
     * @param {String} name
     * @param {BlockMethod} preparator
     * @param {BlockMethod} executor
     * @param {BlockMethod} method
     */
    trine = (name, preparator, executor, method) => {
        this.preparator(name, preparator);
        this.executor(name, executor);
        this.method(name, method);
    };

    /**
     * Logs a message to the console if debugging is enabled.
     * @param  {...any} args
     */
    log = (...args) => {
        const prefix =
            `${this.type}${this.index < 0 ? "-⌀" : `-${this.index}`}`.toUpperCase();
        console.log(prefix, ...args);
        // console.trace();
    };

    data() {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
        };
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
        };
    }

    toObject() {
        return {
            type: this.type,
        };
    }

    toInit() {
        return {
            type: this.type,
        };
    }

    /** @type {BlockManifest} */
    get manifest() {
        return this.constructor.manifest;
    }

    /** @returns {import('../utils/operations.utils').Operation[]} */
    prepareDestroy = () => {
        const ops = this.parent
            ? this.parent.prepareRemove({ ids: [this.id] })
            : [];
        return ops;
    };

    destroy = () => this.codex?.tx(this.prepareDestroy()).execute();

    debug = $state("");

    /**
     * @param {any} data
     */
    $in(data) {
        console.warn("Block input handler not implemented:", data);
    }

    /**
     * @param {Object} data
     */
    snapshot(data) {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            ...data,
        };
    }

    /**
     * @param {{
     *  id?: string,
     *  metadata?: Object<string, any>,
     * } & Object<string, any>} rest
     */
    static data(rest = {}) {
        return {
            type: this.manifest.type,
            ...rest,
        };
    }
}

/**
 * @template {Block} [T=Block]
 */
export class MegaBlock extends Block {
    /** @type {MegaBlockManifest} */
    static manifest = {
        type: "mega-block",
        operations: {},
        capabilities: [],
        blocks: [],
    };

    /** @param {import('./codex.svelte').Codex?} codex @param {MegaBlockInit} init*/
    constructor(codex, init = {}) {
        super(codex, init);

        if (init?.children) {
            console.log(
                "Initializing mega block with children:",
                init.children,
            );
            this.children = init.children.map((child) => {
                const B = this.blocks.find(
                    (B) => B.manifest.type === child.type,
                );
                if (!B) throw new Error(`Unknown block type: ${child.type}`);
                const b = new B(this.codex, {
                    ...child,
                    ...(child.init || {}),
                });
                this.codex?.registry.set(b.id, b);
                console.log("Registered block:", b);
                return b;
            });
        }

        this.trine(
            "insert",
            this.prepareInsert.bind(this),
            this.insert,
            this.applyInsert,
        );
        this.trine(
            "remove",
            this.prepareRemove.bind(this),
            this.remove,
            this.applyRemove,
        );
        this.trine(
            "replace",
            this.prepareReplace.bind(this),
            this.replace,
            this.applyReplace,
        );

        $effect.root(() => {
            $effect(() => {
                this.children.forEach((child, i) => {
                    child.parent = this;
                    child.before = this.children[i - 1] || null;
                    child.after = this.children[i + 1] || null;
                    child.i = i;
                });
            });
        });
    }

    /** @type {MegaBlockManifest} */
    get manifest() {
        return this.constructor.manifest;
    }

    /** @type {import('./system.svelte').System[]} */
    get systems() {
        return this.manifest?.systems || [];
    }

    /** @type {Array<new (...args: any[]) => T>} */
    get blocks() {
        return this.manifest.blocks;
    }

    get strategies() {
        return this.manifest.strategies;
    }

    get dataTypes() {
        const types = new Set(this.manifest.dataTypes);
        this.blocks.forEach((B) => {
            if (B.manifest.dataTypes)
                B.manifest.dataTypes.forEach((t) => types.add(t));
        });
        return types;
    }

    /** @type {T[]} */
    children = $state([]);

    /** @type {Block[]} */
    recursive = $derived.by(() => {
        return this.children.flatMap((child) => {
            if (child instanceof MegaBlock) return [child, ...child.recursive];
            else return [child];
        });
    });

    endpoints = $derived(
        this.recursive.filter((block) => !(block instanceof MegaBlock)),
    );

    /** @param {Block} block */
    contains = (block) => this.recursive.includes(block);

    // PREPARATORS

    prepareInsert = preparer(
        /** @param {import('./blocks/operations/block.ops').BlocksInsertionData & { block?: BlockData }} data */ (
            data,
        ) => {
            let { offset } = data;

            offset ??= this.children.length;
            if (offset < 0) offset = this.children.length + offset + 1;
            if (offset < 0) offset = 0;
            if (offset > this.children.length) offset = this.children.length;

            if (data.block && data.blocks)
                throw new Error(
                    'Cannot insert both "block" and "blocks" at the same time.',
                );
            if (data.block) data.blocks = [data.block];
            if (!data.blocks || !data.blocks.length)
                throw new Error("No blocks to insert.");

            return [
                new BlocksInsertion(this, {
                    offset,
                    blocks: data.blocks,
                }),
            ];
        },
    );

    /**
     *
     * @param {import('./blocks/operations/block.ops').BlocksRemovalData & { id?: string }} data
     */
    prepareRemove(data) {
        let { id, ids } = data;

        if (id && ids)
            throw new Error(
                'Cannot sdow brier provide both "id" and "ids" to remove blocks.',
            );
        if (id) ids = [id];
        if (!ids || !ids.length)
            throw new Error("No ids provided to remove blocks.");

        return [
            new BlocksRemoval(this, {
                ids,
            }),
        ];
    }

    /**
     * Prepares the splicing of blocks.
     * @param {import('./blocks/operations/block.ops').BlocksReplacementData & {
     * block: BlockData
     * }} data
     */
    prepareReplace = (data) => {
        let { from, to } = data;

        if (from < 0) from = this.children.length + from + 1;
        if (from < 0) from = 0;
        if (!to) to = from;
        if (to < 0) to = this.children.length + to + 1;
        if (to < from) to = from;

        if (data.block && data.blocks)
            throw new Error(
                'Cannot insert both "block" and "blocks" at the same time.',
            );
        if (data.block) data.blocks = [data.block];
        if (!data.blocks || !data.blocks.length)
            throw new Error("No blocks to insert.");

        return [
            new BlocksReplacement(this, {
                from,
                to,
                blocks: data.blocks,
            }),
        ];
    };

    // EXECUTORS

    /**
     * Inserts a block into the mega block.
     * @param {import('./blocks/operations/block.ops').BlocksInsertionData & {
     *  block: BlockData
     * }} data
     */
    insert = (data) => {
        const ops = this.prepareInsert(data);
        return this.codex?.tx(ops).execute();
    };

    /**
     * Removes a block from the mega block.
     * @param {import('./blocks/operations/block.ops').BlocksRemovalData & {
     *  id?: string,
     * }} data
     */
    remove = (data) => {
        const ops = this.prepareRemove(data);
        return this.codex?.tx(ops).execute();
    };

    /**
     * Prepares the splicing of blocks.
     * @param {import('./blocks/operations/block.ops').BlocksReplacementData & {
     *  block: BlockData
     * }} data
     */
    replace = (data) => {
        const ops = this.prepareReplace(data);
        return this.codex?.tx(ops).execute();
    };

    // APPLYERS

    applyInsert = applier((op) => {
        /** @type {{ offset: number, blocks: BlockData[] }} */
        const data = op.data;

        this.log("Inserting blocks", data.blocks, "at", data.offset);

        /** @type {T[]} */
        const blocks = data.blocks
            .map((b) => {
                const { type, init } = b;
                this.log(this.blocks);
                const B = this.blocks.find((B) => B.manifest.type === type);
                if (!B)
                    throw new Error(
                        `Block type "${type}" not found in mega block.`,
                    );
                const block = new B(this instanceof Codex ? this : this.codex, {
                    ...b,
                    ...(init || {}),
                });
                this.codex?.registry.set(block.id, block);
                this.log("Registered block:", block);
                return block;
            })
            .filter((b) => b instanceof Block);

        this.children = [
            ...this.children.slice(0, data.offset),
            ...blocks,
            ...this.children.slice(data.offset),
        ];

        return blocks;
    });

    applyRemove = applier((op) => {
        /** @type {{ ids: string[] }} */
        const data = op.data;
        const removed = this.children.filter((child) =>
            data.ids.includes(child.id),
        );
        this.log(
            "Removing blocks",
            removed.map((b) => b.type),
            "with IDs",
            data.ids,
        );
        this.children = this.children.filter(
            (child) => !data.ids.includes(child.id),
        );
        this.log(
            "Remaining blocks",
            this.children.map((b) => b.type),
        );
        removed.forEach((b) => {
            if (b.parent === this) b.parent = null;
            if (!b.parent && this.codex?.registry.has(b.id))
                this.codex?.registry.delete(b.id);
        });
        return removed;
    });

    applyReplace = applier((op) => {
        /** @type {{ from: number, to: number, blocks: BlockData[] }} */
        const data = op.data;

        const blocks =
            data.blocks
                ?.map(({ type, init }) => {
                    const B = this.blocks.find((B) => B.manifest.type === type);
                    if (!B)
                        throw new Error(
                            `Block type "${type}" not found in mega block.`,
                        );
                    return new B(
                        this instanceof Codex ? this : this.codex,
                        init,
                    );
                })
                .filter((b) => b instanceof Block) || [];

        const removed = [...this.children].slice(data.from, data.to);

        this.children = [
            ...this.children.slice(0, data.from),
            ...blocks,
            ...this.children.slice(data.to),
        ];

        removed.forEach((b) => {
            if (b.parent === this) b.parent = null;
            if (!b.parent && this.codex?.registry.has(b.id))
                this.codex?.registry.delete(b.id);
        });

        return { removed, added: blocks };
    });

    // TRANSFORMERS

    toJSON() {
        return {
            ...super.toJSON(),
            children: this.children.map((child) => child.toJSON()),
        };
    }

    data() {
        return {
            ...super.data(),
            children: this.children.map((child) => child.data()),
        };
    }

    /**
     * @param {any} data - The actual input data.
     */
    $in(data) {
        if (data.children && Array.isArray(data.children)) {
            const newChildren = data.children.map((c) => {
                const B = this.blocks.find((B) => B.manifest.type === c.type);
                if (!B) {
                    this.log(`Block type "${c.type}" not found in mega block.`);
                    return null;
                }
                return new B(this instanceof Codex ? this : this.codex, {
                    in: c,
                });
            });

            this.children = newChildren.filter((b) => b instanceof Block);
        }
    }

    /**
     * @param {Array<any>} children
     * @param {{
     *  id?: string,
     *  metadata?: Object<string, any>,
     * } & Object<string, any>} rest
     * @returns
     */
    static data(children, rest = {}) {
        return {
            ...super.data(rest),
            children,
        };
    }
}
