/** 
* @typedef {Object} BlockOperation
* @property {string} type - The type of operation (e.g., "insert", "delete", "replace").
* @property {string[]} params - Parameters for the operation, such as coordinates or block IDs.
* @property {string} handler - The name of the handler function to execute for this operation.
*/
import { BlocksInsertion, BlocksRemoval, BlocksReplacement } from './blocks/operations/block.ops';
import { Codex } from './codex.svelte';

/**
 * @typedef {new (...args: any[]) => Block} BlockConstructor
 */

/**
* @typedef {Object} BlockManifest
* @property {string} type - The type of block (e.g., "paragraph", "text", "linebreak").
* @property {Object<string, BlockOperation>} [operations] - A map of operation types to their handlers.
* @property {(import('./capability.svelte').Capability|symbol)[]} [capabilities] - The capabilities of the block.
*/

/**
* @typedef {BlockManifest & {
*   blocks: Object<string, BlockConstructor>;
*   strategies?: import('./strategy.svelte').Strategy[];
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
 * @typedef {Object} BlockInit
 * @property {string} [id] - The unique identifier for the block.
 * @property {Object} [metadata] - Metadata associated with the block.
 */

/**
 * @typedef {Object} BlockData
 * @property {string} type - The type of the block.
 * @property {BlockInit & Object<string, any>} [init] - The initialization data for the block.
 */


export class Block {
    /** @type {BlockManifest} */
    static manifest = {
        type: 'block',
        operations: {},
        capabilities: []
    }

    /** @param {import('./codex.svelte').Codex?} codex @param {BlockInit} init */
    constructor(codex, init = {}) {
        this.codex = codex;
        this.id = init.id || crypto.randomUUID();
        this.metadata = init.metadata || {};

        /**
         * A set of methods available on the block.
         * @type {Map<string, Function>}
         */
        this.methods = new Map();

        /**
         * A set of preparators available on the block.
         * @type {Map<string, (function(...any): import('$lib/utils/operations.utils').Operation[])>}
         */
        this.preparators = new Map();

        /**
         * A set of executors available on the block.
         * @type {Map<string, Function>}
         */
        this.executors = new Map();

        this.method('delete', () => this.rm());

    }

    get type() {
        return this.manifest.type;
    }

    get capabilities() {
        return new Set(this.manifest.capabilities);
    }

    /** @type {import('svelte').Component?} */
    component = $derived(this.codex?.components[this.type] || null);

    unlink = $derived(this.codex?.recursive.includes(this) === false);
    
    /** @type {Number} */
    index = $derived(this.codex?.recursive.indexOf(this) ?? -1);
    
    /** @type {MegaBlock?} */
    parent = $derived(this.type === "codex" ? null : this.codex?.recursive.find(block => block instanceof MegaBlock && block?.children.includes(this)) || this.codex);

    /** @type {MegaBlock[]} */
    parents = $derived(this.parent ? [...this.parent.parents, this.parent] : []);

    /** @type {Block?} */
    globalBefore = $derived((this.index && this.codex?.recursive.find(block => block.index === this.index - 1)) || null);
    
    /** @type {Block?} */
    globalAfter = $derived((this.index && this.codex?.recursive.find(block => block.index === this.index + 1)) || null);
    
    /** @type {Block?} */
    before = $derived((this.index && this.parent instanceof MegaBlock && this.parent.children?.find(b => b.index === this.index - 1)) || null);
    
    /** @type {Block?} */
    after = $derived((this.index && this.parent instanceof MegaBlock && this.parent.children?.find(b => b.index === this.index + 1)) || null);

    /** @type {Boolean} */
    first = $derived(this.parent?.children[0] === this);
    
    /** @type {Boolean} */
    last = $derived(this.parent?.children[this.parent.children.length - 1] === this);

    /** @type {HTMLElement?} */
    element = $state(null);
    
    selected = $derived(this.codex?.selection && this.element && this.codex.selection?.range?.intersectsNode(this.element));
    
    /** @type {Number} */
    depth = $derived(this.parent ? this.parent.depth + 1 : 0);
    
    /** @type {Number[]} */
    path = $derived.by(() => {
        if (this.parent && this.parent instanceof MegaBlock) return [...this.parent.path, this.index];
        else return [];
    });

    /** @param {import('./capability.svelte').Capability} capability */
    can = capability => this.capabilities.has(capability)

    /**
     * Removes the block from its parent.
     */
    rm = () => {
        if (this.parent) {
            this.parent.children = this.parent.children.filter(child => child !== this); 
            return true;
        }
        return false;
    }


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
        if (hint === 'start' || hint === 'before') return 'before';
        if (hint === 'end' || hint === 'after') return 'after';
        
        // Si le bloc a une sélection active, la capturer
        if (this.selected && window.getSelection) {
            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            const startInMe = this.element?.contains(range.startContainer);
            const endInMe = this.element?.contains(range.endContainer);
            
            // Si la sélection est dans mon element
            if (this.element?.contains(range.startContainer)) {
                return {
                    type: 'selection',
                    ...(startInMe ? {
                        startPath: this.getNodePath(range.startContainer),
                        startOffset: range.startOffset
                    } : {startPath: null, startOffset: 0}),
                    ...(endInMe ? {
                        endPath: this.getNodePath(range.endContainer),
                        endOffset: range.endOffset
                    } : {endPath: null, endOffset: 0})
                };
            }
        }
        
        return 'before'; // Fallback
    }


    /**
     * 
     * @param {any} relativePos 
     * @returns {{
     *  start?: {
     *   node: Node,
     *   offset: number
     *  },
     *  end?: {
     *   node: Node,
     *   offset: number
     *  }
     * }}
     */
    toDOM(relativePos) {
        if (!this.element) return {};
        
        // Cas simple : avant/après le bloc
        if (relativePos === 'before' || relativePos === 'after') return {};
        
        // Cas complexe : on avait capturé une sélection
        if (relativePos?.type === 'selection') {
            const startNode = this.getNodeFromPath(relativePos.startPath);
            const endNode = this.getNodeFromPath(relativePos.endPath);
            
            return {
                ...(startNode ? {
                    start: {
                        node: startNode,
                        offset: relativePos.startOffset
                    },
                } : {}),
                ...(endNode ? {
                    end: {
                        node: endNode,
                        offset: relativePos.endOffset
                    }
                } : {})
            };
        }
        
        return {};
    }


    /** @type {Object<string, any>} */
    metadata = $state({});
    
    /** @param {String} operation */
    supports = operation => this.manifest?.operations && operation in this.manifest.operations || false;
    
    /**
     * @param {String} name 
     * @param {Event} e 
     * @param {*} data 
     */
    ascend = (name, e, data) => {
        if (this.parents.length) {
            const callableParent = this.parents.find(parent => typeof parent[name] === 'function');
            if (callableParent) {
                e.preventDefault();
                callableParent[name](e, data);
            }
        }
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
        if (!executor) throw new Error(`No executor found for "${operation}" in block "${this.type}".`);
        return executor(...args);
    }

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
        if (!method) throw new Error(`Method "${name}" not found in block "${this.type}".`);
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
     * @returns {import('$lib/utils/operations.utils').Operation[]}
     */
    prepare = (name, data, metadata) => {
        const preparator = this.preparators.get(name);
        if (!preparator) throw new Error(`No preparator found for "${name}" in block "${this.type}".`);
        const preparation = preparator(data);
        if (!preparation) return [];
        return preparation.map(o => {
            o.metadata = {...o.metadata, ...metadata};
            return o;
        });
    }


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
    }

    /**
     * Logs a message to the console if debugging is enabled.
     * @param  {...any} args 
     */
    log = (...args) => {
        const prefix = `${this.type}${this.index < 0 ? '-⌀' : `-${this.index}`}`.toUpperCase();
        console.log(prefix, ...args);
        // console.trace();
   
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type
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
        }
    }

    /** @type {BlockManifest} */
    get manifest() {
        return this.constructor.manifest;
    }


    /** @returns {import('$lib/utils/operations.utils').Operation[]} */
    prepareDestroy = () => this.parent ? this.parent.prepareRemove({ ids: [this.id] }) : [];

    destroy = () => this.codex?.tx(this.prepareDestroy()).execute()



    /** 
     * @param {Object} data 
    */
    snapshot(data) {
        return {
            id: this.id,
            type: this.type,
            metadata: this.metadata,
            ...data
        }
    }
}

/**
 * @template {Block} [T=Block]
 */
export class MegaBlock extends Block {
    /** @type {MegaBlockManifest} */
    static manifest = {
        type: 'mega-block',
        operations: {},
        capabilities: [],
        blocks: {}
    };

    /** @param {import('./codex.svelte').Codex?} codex @param {BlockInit} init*/
    constructor(codex, init = {}) {
        super(codex, init);

        this.trine('insert', this.prepareInsert.bind(this), this.insert, this.applyInsert);
        this.trine('remove', this.prepareRemove.bind(this), this.remove, this.applyRemove);
        this.trine('replace', this.prepareReplace.bind(this), this.replace, this.applyReplace);
    }

    /** @type {MegaBlockManifest} */
    get manifest() {
        return this.constructor.manifest;
    }

    /** @type {Record<string, new (...args: any[]) => T>} */
    get blocks() {
        return this.manifest.blocks;
    }

    get strategies() {
        return this.manifest.strategies;
    }

    /** @type {T[]} */
    children = $state([]);
    
    /** @type {Block[]} */
    recursive = $derived(this.children.flatMap(child => {
        if (child instanceof MegaBlock) return [child, ...child.recursive];
        else return [child];
    }));
    
    endpoints = $derived(this.recursive.filter(block => !(block instanceof MegaBlock)));
    
    /** @param {Block} block */
    contains = block => this.recursive.includes(block);


    // PREPARATORS

    /**
     * Prepares the insertion of blocks.
     * @param {import('./blocks/operations/block.ops').BlocksInsertionData & {
     *  block?: BlockData
     * }} data
     */
    prepareInsert = data => {
        let {offset} = data;

        if (!offset) offset = this.children.length;
        if (offset < 0) offset = this.children.length + offset + 1;
        if (offset < 0) offset = 0;
        if (offset > this.children.length) offset = this.children.length;

        if (data.block && data.blocks) throw new Error('Cannot insert both "block" and "blocks" at the same time.');
        if (data.block) data.blocks = [data.block];
        if (!data.blocks || !data.blocks.length) throw new Error('No blocks to insert.');

        return [
            new BlocksInsertion(this, {
                offset,
                blocks: data.blocks
            })
        ]
    }
    // WOW
    /**
     * 
     * @param {import('./blocks/operations/block.ops').BlocksRemovalData & {
     * id?: string,
     * }} data 
     */
    prepareRemove(data) {
        let { id, ids } = data;

        if (id && ids) throw new Error('Cannot provide both "id" and "ids" to remove blocks.');
        if (id) ids = [id];
        if (!ids || !ids.length) throw new Error('No ids provided to remove blocks.');

        return [
            new BlocksRemoval(this, {
                ids
            })
        ];
    }

    /**
     * Prepares the splicing of blocks.
     * @param {import('./blocks/operations/block.ops').BlocksReplacementData & {
     * block: BlockData
     * }} data
     */
    prepareReplace = data => {
        let {from, to} = data;

        if (from < 0) from = this.children.length + from + 1;
        if (from < 0) from = 0;
        if (!to) to = from;
        if (to < 0) to = this.children.length + to + 1;
        if (to < from) to = from;

        if (data.block && data.blocks) throw new Error('Cannot insert both "block" and "blocks" at the same time.');
        if (data.block) data.blocks = [data.block];
        if (!data.blocks || !data.blocks.length) throw new Error('No blocks to insert.');

        return [
            new BlocksReplacement(this, {
                from,
                to,
                blocks: data.blocks
            })
        ];
    }

    // EXECUTORS

    /**
     * Inserts a block into the mega block.
     * @param {import('./blocks/operations/block.ops').BlocksInsertionData & {
     *  block: BlockData
     * }} data
     */
    insert = data => {
        const ops = this.prepareInsert(data);
        return this.codex?.tx(ops).execute();
    }

    /**
     * Removes a block from the mega block.
     * @param {import('./blocks/operations/block.ops').BlocksRemovalData & {
     *  id?: string,
     * }} data 
     */
    remove = data => {
        const ops = this.prepareRemove(data);
        return this.codex?.tx(ops).execute();
    }

    /**
     * Prepares the splicing of blocks.
     * @param {import('./blocks/operations/block.ops').BlocksReplacementData & {
     *  block: BlockData
     * }} data
     */
    replace = data => {
        const ops = this.prepareReplace(data);
        return this.codex?.tx(ops).execute();
    }

    // APPLYERS

    /**
     * Inserts data into the block.
     * @param {{
     *  offset: number,
     *  blocks: BlockData[]
     * }} data 
     */
    applyInsert = data => {
        /** @type {T[]} */
        const blocks = data.blocks.map(({type, init}) => {
            const B = this.blocks[type];
            if (!B) throw new Error(`Block type "${type}" not found in mega block.`);
            return new B(this instanceof Codex ? this : this.codex, init);
        }).filter(b => b instanceof Block);

        this.children = [
            ...this.children.slice(0, data.offset),
            ...blocks,
            ...this.children.slice(data.offset)
        ];

        return blocks;
    }

    /**
     * @param {{
     * ids: string[]
     * }} data 
     */
    applyRemove = data => {
        const removed = this.children.filter(child => data.ids.includes(child.id));
        this.children = this.children.filter(child => !data.ids.includes(child.id));
        return removed;
    }

    /**
     * @param {{
     * from: number,
     * to: number,
     * blocks: BlockData[]
     * }} data 
     */
    applyReplace = data => {
        const blocks = data.blocks?.map(({type, init}) => {
            const B = this.blocks[type];
            if (!B) throw new Error(`Block type "${type}" not found in mega block.`);
            return new B(this.codex, init);
        }).filter(b => b instanceof Block) || [];

        const removed = [...this.children].slice(data.from, data.to);

        this.children = [
            ...this.children.slice(0, data.from),
            ...blocks,
            ...this.children.slice(data.to)
        ];

        return {removed, added: blocks};
    }


    // TRANSFORMERS

    toJSON() {
        return {
            ...super.toJSON(),
            children: this.children.map(child => child.toJSON())
        };
    }
}