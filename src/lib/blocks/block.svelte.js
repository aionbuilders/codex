/**
 * @typedef {Object} BlockOperation
 * @property {string} type - The type of operation (e.g., "insert", "delete", "replace").
 * @property {string[]} params - Parameters for the operation, such as coordinates or block IDs.
 * @property {string} handler - The name of the handler function to execute for this operation.
 */
import { applier, Operations, preparer } from "../utils/operations.utils";
import { BlocksInsertion, BlocksRemoval, BlocksReplacement } from "./block.ops";
import { Codex } from "./codex/codex.svelte";
import { untrack } from "svelte";

/**
 * @typedef {import('../utils/operations.utils').Operation} Operation
 * @typedef {import('../utils/operations.utils').Transaction} Transaction
 */

/**
 * @typedef {(op: Operation, tx: Transaction) => any} Applier
 */

/**
 * @typedef {{new (...args: any[]): Block; manifest: BlockManifest; data?: (data?: any, rest?: any) => any;}} BlockConstructor
 */

/**
 * @typedef {Object} BlockManifest
 * @property {string} type - The type of block (e.g., "paragraph", "text", "linebreak").
 * @property {Object<string, BlockOperation>} [operations] - A map of operation types to their handlers.
 * @property {(import('../states/capability.svelte').Capability|symbol)[]} [capabilities] - The capabilities of the block.
 * @property {import('svelte').Component?} [component] - The Svelte component associated with the block.
 * @property {string[]} [dataTypes] - The data types supported by the block (e.g., "text/plain", "text/html").
 */

/**
 * @typedef {BlockManifest & {
 *   blocks: Array<BlockConstructor>;
 *   strategies?: import('../states/strategy.svelte').Strategy[];
 *   systems?: import('../states/system.svelte').System[];
 *   schema?: import('zod').ZodTypeAny;
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
 * @property {string} [type] - The type of the block.
 * @property {string} [id] - The unique identifier for the block.
 * @property {Object} [metadata] - Metadata associated with the block.
 * @property {InData} [in] - Initial values for the block.
 */

/**
 * @typedef {{
 *  children?: BlockInit[]
 * } & BlockInit } MegaBlockInit
 */

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

    /** @param {import('./codex/codex.svelte').Codex?} codex @param {BlockInit} init */
    constructor(codex, init = {}) {
        this.codex = codex;
        this.id = init.id || crypto.randomUUID();
        this.metadata = init.metadata || {};
        this.in = init.in || init;

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

        this.preparator("destroy", this.prepareDestroy.bind(this));
        this.preparator("remove", this.prepareDestroy.bind(this));
    }

    $init() {
        // this.log("Initializing block with in data:", this.in);
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

    /** @private @type {MegaBlock?} */
    _parent = $state(null);

    get parent() {
        return this._parent;
    }

    /** @param {MegaBlock?} value */
    set parent(value) {
        if (this._parent?.children.includes(this) && value !== this._parent)
            throw new Error(
                "Cannot reassign parent: already a child of the current parent. Remove from current parent first.",
            );
        this._parent = value;
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

    
    length = $derived(0);

    /** @type {Number} */
    start = $derived(this.before ? (this.before.end ?? 0) + 1 : 0);

    /** @type {Number} */
    end = $derived(this.start + this.length);

    

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

    /** @param {import('../states/capability.svelte').Capability} capability */
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
            const index = Array.from(parent.childNodes).indexOf(/** @type {ChildNode} */ (current));
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

    /** @type {Object<string, any>} */
    metadata = $state({});

    /** @type {Object<string, any>} */
    values = $derived({
        json: { type: this.type, id: this.id, metadata: this.metadata },
    });
    

    /** @abstract */
    getSplitting() {
        return { type: this.type };
    }

    /**
     * @param {{from?: number, to?: number}} data 
     */
    slice(data = {}){
        return this.values.json;
    }

    /** @param {String} operation */
    supports = (operation) =>
        (this.manifest?.operations && operation in this.manifest.operations) ||
        false;

    /** @param {Event} event @param {...any} args */
    ascend(event, ...args) {
        if (!this.codex) return;
        if (this.parents.length && event instanceof Event) {
            const eventType = event.type;
            const callableParent = this.parents.findLast(
                // @ts-ignore
                (parent) => typeof parent[`on${eventType}`] === "function",
            );
            if (callableParent) {
                const parentsTypes = callableParent.parents
                    .map((p) => p.type)
                    .filter((t) => t !== "codex");
                const types = [...parentsTypes, callableParent.type].join(":");
                this.codex.events.emit(`${types}:${eventType}`, {
                    chain: types,
                    event,
                    block: callableParent,
                    args,
                }).then((E) => {
                    if (!E.stopped) callableParent.handleEvent(event, ...args);
                });
            }
        }
    }

    /** @param {Event} event @param {...any} args */
    handleEvent = (event, ...args) => {
        if (!this.codex) return;
        const eventType = event.type;
        const methodName = `on${eventType}`;
        const chain = [...(this.parents.map((p) => p.type).filter((t) => t !== "codex")), this.type].join(":");
        this.codex.events.emit(`${this.type}:on${eventType}`, {
            chain,
            event,
            block: this,
            args,
        }).then(E => {
            if (E.stopped) return;
            if (methodName in this && typeof this[methodName] === "function") {
                const handler = /** @type {(event: Event, ...args: any[]) => any} */ (this[methodName]);
                return handler.call(this, event, ...args);
            }
        });
    }

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
    call(name, ...args) {
        const method = this.methods.get(name);
        if (!method)
            throw new Error(
                `Method "${name}" not found in block "${this.type}".`,
            );
        return method(...args);
    }

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
        if (!preparator) throw new Error(`No preparator found for "${name}" in block "${this.type}".`);
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


    /** @type {BlockManifest} */
    get manifest() {
        // @ts-ignore
        return this.constructor.manifest;
    }

    /** @returns {import('../utils/operations.utils').Operations} */
    prepareDestroy = () => {
        return this.ops(
            this.parent ? this.parent.prepareRemove({ ids: [this.id] }) : [],
        );
    };

    destroy = () => this.codex?.tx(this.prepareDestroy()).execute();

    debug = $state("");

    /**
     * @param {any} data
     */
    $in(data) {
        console.warn("Block input handler not implemented:", data);
    }

    /** @param {...import('../utils/operations.utils').Ops} ops */
    ops = (...ops) => new Operations(...ops);

    /**
     * @param {any} [data]
     * @param {BlockDataType} rest
     */
    static data(data, rest = {}) {
        return {
            type: this.manifest.type,
            ...rest,
        };
    }
}

/**
 * @typedef {{
     *  id?: string,
     *  metadata?: Object<string, any>,
     * } & Object<string, any>} BlockDataType
 */

/**
 * @template {Block} [T=Block]
 * @typedef {{
 *   new (...args: any[]): T;
 *   manifest: MegaBlockManifest;
 *   data?: (data?: any, rest?: any) => any;
 * }} MegaBlockConstructor
 */

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

    /** @param {import('./codex/codex.svelte').Codex?} codex @param {MegaBlockInit} init*/
    constructor(codex, init = {}) {
        super(codex, init);

        if (init?.children) {
            this.children = init.children.map((child) => {
                const B = this.blocks.find(
                    (B) => B.manifest.type === child.type,
                );
                if (!B) throw new Error(`Unknown block type: ${child.type}`);
                const b = new B(this.codex, {
                    ...child,
                    // @ts-ignore
                    ...(child.init || {}),
                });
                this.codex?.registry.set(b.id, b);
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
            this.applyRemove.bind(this),
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
        // @ts-ignore
        return this.constructor.manifest;
    }

    // /** @type {import('./system.svelte').System[]} */
    // get systems() {
    //     return this.manifest?.systems || [];
    // }

    
    get blocks() {
        return /** @type {Array<MegaBlockConstructor<T>>} */ (this.manifest.blocks);
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

    /** @type {Number} */
    length = $derived(this.children.reduce((acc, child) => acc + child.length, 0));

    

    /**
     * @type {{start?: number, end?: number, isCollapsed: boolean, isInside: boolean} & {} | null | undefined}
     */
    selection = $derived.by(() => {
        const firstChild = this.children.find(child => child.selected);
        if (!firstChild) return null;
        const lastChild = this.children.findLast(child => child.selected);

        const firstOffset = firstChild ? this.getSelectionStart(firstChild) : 0;
        const lastOffset = lastChild ? this.getSelectionEnd(lastChild) : firstOffset;
        
        return {
            start: firstOffset,
            end: lastOffset,
            isCollapsed: firstOffset === lastOffset,
            isInside: !!firstChild,
        }
    })

    /** @param {T} firstChild @returns {number} */
    getSelectionStart(firstChild) {
        if (!firstChild) return 0;
        return firstChild.selection?.start ?? 0;
    }

    /** @param {T} lastChild @returns {number} */
    getSelectionEnd(lastChild) {
        if (!lastChild) return 0;
        return lastChild.selection?.end ?? 0;
    }

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

    /**
     * @param {{from?: number, to?: number}} params 
     * @returns 
     */
    getSplitting(params = {}) {
        const start = params.from ?? (this.selection?.start || 0);
        const end = params.to ?? (this.selection?.end || 0);
        const startBlock = this.children.find(child => start >= child.start && start <= child.end);
        const endBlock = this.children.find(child => end >= child.start && end <= child.end);
        const beforeBlocks = this.children.filter(child => child.i < (startBlock?.i || 0));
        const afterBlocks = this.children.filter(child => child.i > (endBlock?.i || 0));
        const betweenBlocks = this.children.filter(child => child.i > (startBlock?.i || 0) && child.i < (endBlock?.i || 0));

        /** @param {T} [block] */
        const obj = (block) => block ? ({ ...block.values.json, id: block.id }) : null;
        return {
            type: this.type,
            from: start,
            to: end,
            before: beforeBlocks,
            start: startBlock,
            between: betweenBlocks,
            end: endBlock,
            after: afterBlocks,
        }
    }

    /**
     * Fonction utilitaire pour cloner un bloc en générant un nouvel ID unique
     * @param {any} blockJson - Le bloc à cloner au format JSON
     * @returns {any} - Le bloc cloné avec un nouvel ID
     */
    cloneWithNewId(blockJson) {
        if (!blockJson || typeof blockJson !== 'object') return blockJson;
        
        const cloned = JSON.parse(JSON.stringify(blockJson));
        cloned.id = crypto.randomUUID();
        
        // Si c'est un MegaBlock, il faut aussi régénérer les IDs des enfants
        if (cloned.children && Array.isArray(cloned.children)) {
            cloned.children = cloned.children.map(child => this.cloneWithNewId(child));
        }
        
        return cloned;
    }

    /**
     * @param {{from?: number, to?: number, splitting?: ReturnType<MegaBlock['getSplitting']>}} data
     */
    slice(data = {}) {
        let { from, to } = data.splitting || data;
        from ??= this.selection?.start || 0;
        from < 0 && (from = this.length + from);
        to ??= from;
        to < 0 && (to = this.length + to);
        if (to < from) to = from;

        const splitting = data.splitting || this.getSplitting({ from, to });
        const start = splitting.start?.slice({
            from: from - splitting.start.start,
            to: (splitting.start !== splitting.end ? from : to) - splitting.start.start,
        })

        const end = splitting.end?.slice({
            from: (splitting.start !== splitting.end ? to - splitting.end.start : from - splitting.end.start),
            to: to - splitting.end.start,
        })

        const before = [
            ...splitting.before.map(b => this.cloneWithNewId(b.values.json)),
            ...(start ? [start.before] : []),
        ].filter(Boolean);

        const between = splitting.start === splitting.end ? [start.between] : [
            ...(start ? [start.after] : []),
            ...splitting.between.map(b => this.cloneWithNewId(b.values.json)),
            ...(end ? [end.before] : []),
        ].filter(Boolean);

        const after = [
            ...(end ? [end.after] : []),
            ...splitting.after.map(b => this.cloneWithNewId(b.values.json)),
        ].filter(Boolean);

        // Extraire l'ID original avant de modifier l'objet local
        const { id: originalId, ...localWithoutId } = this.values.json;

        return {
            // ...super.slice(),
            before: {
                ...localWithoutId,
                originalId, // Conserver la référence à l'ID d'origine
                children: before,
            },
            between: {
                ...localWithoutId,
                originalId, // Conserver la référence à l'ID d'origine
                children: between,
            },
            after: {
                ...localWithoutId,
                originalId, // Conserver la référence à l'ID d'origine
                children: after,
            },
        }




        
    }

    // PREPARATORS

    prepareInsert = preparer(
        /** @param {import('./block.ops').BlocksInsertionData & { block?: BlockData }} data */ (
            data,
        ) => {
            let { offset } = data;

            offset ??= this.children.length;
            if (offset < 0) offset = this.children.length + offset + 1;
            if (offset < 0) offset = 0;
            // if (offset > this.children.length) offset = this.children.length;

            if (data.block && data.blocks)
                throw new Error(
                    'Cannot insert both "block" and "blocks" at the same time.',
                );
            if (data.block) data.blocks = [data.block];
            if (!data.blocks || !data.blocks.length) return this.ops();

            return this.ops(
                new BlocksInsertion(this, {
                    offset,
                    blocks: data.blocks,
                }),
            );
        },
    );

    /**
     *
     * @param {import('./block.ops').BlocksRemovalData & { id?: string, from?: number, to?: number }} data
     */
    prepareRemove(data) {
        let { id, ids = [] } = data;

        if (id && ids.length)
            throw new Error(
                'Cannot sdow brier provide both "id" and "ids" to remove blocks.',
            );
        if (id) ids = [id];
        
        const ops = this.ops();

        if (data.from) {
            let { from, to } = data;
            if (from < 0) from = Math.max(0, this.end + from + 1);
            to ??= from;
            if (to < 0) to = Math.max(0, this.end + to + 1);
            if (to < from) to = from;

            const startBlock = this.children.find((child) => from >= child.start && from <= child.end);
            const endBlock = this.children.find((child) => to >= child.start && to <= child.end);

            const fromIndex = startBlock ? startBlock.i : this.children.length;
            const toIndex = endBlock ? endBlock.i : fromIndex;

            this.log({fromIndex, toIndex});
            const blocksBetween = this.children.slice(fromIndex, toIndex);
            this.log("Preparing removal from", from, "to", to, {
                startBlock,
                endBlock,
                blocksBetween,
            });
            
            startBlock && startBlock.prepare("remove", {
                from: from - startBlock.start,
                to: (startBlock !== endBlock ? startBlock.length : to - startBlock.start),
            }).map(op => op instanceof BlocksRemoval ? ids = [...ids, ...(op.data.ids || [])] : ops.add(op));

            endBlock && endBlock !== startBlock && endBlock.prepare("remove", {
                from: 0,
                to: to - endBlock.start,
            }).map(op => op instanceof BlocksRemoval ? ids = [...ids, ...(op.data.ids || [])] : ops.add(op));            

            ids = [
                ...(ids || []),
                ...blocksBetween.map((b) => b.id),
            ];
        }


        if (ids.length) ops.add(new BlocksRemoval(this, { ids }));

        this.log("Prepared removal ops:", ops);
        return ops;
        // if (!ids || !ids.length) return this.ops();
        // return this.ops(new BlocksRemoval(this, { ids }));
    }

    /**
     * Prepares the splicing of blocks.
     * @param {import('./block.ops').BlocksReplacementData & {
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

        return this.ops(
            new BlocksReplacement(this, { from, to, blocks: data.blocks }),
        );
    };

    // EXECUTORS

    /**
     * Inserts a block into the mega block.
     * @param {import('./block.ops').BlocksInsertionData & {
     *  block: BlockData
     * }} data
     */
    insert = (data) => {
        const ops = this.ops(this.prepareInsert(data));
        return this.codex?.tx(ops).execute();
    };

    /**
     * Removes a block from the mega block.
     * @param {import('./block.ops').BlocksRemovalData & {
     *  id?: string,
     * }} data
     */
    remove = (data) => {
        const ops = this.ops(this.prepareRemove(data));
        return this.codex?.tx(ops).execute();
    };

    /**
     * Prepares the splicing of blocks.
     * @param {import('./block.ops').BlocksReplacementData & {
     *  block: BlockData
     * }} data
     */
    replace = (data) => {
        const ops = this.ops(this.prepareReplace(data));
        return this.codex?.tx(ops).execute();
    };

    // APPLYERS

    applyInsert = applier((op) => {
        /** @type {{ offset: number, blocks: BlockData[] }} */
        const data = op.data;
        /** @type {T[]} */
        const blocks = data.blocks
            .map((b) => {
                const { type, init } = b;
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

    // applyRemove = applier((op) => {

    // });

    /** @type {Applier} */
    applyRemove(op, tx) {
        /** @type {{ ids: string[] }} */
        const data = op.data;
        const removed = this.children.filter((child) =>
            data.ids.includes(child.id),
        );
        this.children = this.children.filter(
            (child) => !data.ids.includes(child.id),
        );
        removed.forEach((b) => {
            if (b.parent === this) b.parent = null;
            if (!b.parent && this.codex?.registry.has(b.id))
                this.codex?.registry.delete(b.id);
        });
        return removed;
    }

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

    values = $derived({
        json: {
            //@ts-ignore
            ...super.values.json,
            children: this.children
                .map((child) => child.values.json)
                .filter((c) => c !== null),
        },
    });

    /**
     * @param {any} [data]
     * @param {BlockDataType} rest
     * @returns
     */
    static data(data, rest = {}) {
        const children = Array.isArray(data) ? data : data?.children || [];
        return {
            ...super.data(rest),
            children,
        };
    }
}