import { tick } from "svelte";

/** @typedef {import('../types').Focus} Focus */

/** @typedef {import('../blocks').Block} Block */

/**
 * @template {Block} [B=Block]
 * @template {any} [D=any]
 */
export class Operation {
    /** @param {B} block @param {String} name @param {D} data */
    constructor(block, name, data = /** @type {D} */ ({})) {
        /** @type {B} */
        this.block = block;
        this.name = name;

        /** @type {D} */
        this.data = data;

        /** @type {Object<any, any>} */
        this.metadata = {};

        /** @type {any} */
        this.results = null;

        this.ops = this.ops.bind(this);
    }

    /**
     * @param {Transaction} [tx]
     */
    execute(tx) {
        const block = tx?.codex?.registry.get(this.block.id) || this.block;
        if (!block)
            throw new Error(
                `Block with id ${this.block.id} not found in codex registry`,
            );
        this.block = block;

        const result = this.block.call(this.name, this, tx);
        this.results = result;
        if (tx && tx instanceof Transaction) {
            tx.results.push({ operation: this, result });
            tx.executed.push(this);
        }
        return result;
    }

    toJSON() {
        return {
            block: {
                id: this.block.id,
                type: this.block.type,
            },
            method: this.name,
            data: this.data,
        };
    }

    get debug() {
        return ``;
    }

    /** @returns {Operation[] | Operations | null} */
    undo() {
        return null;
    }

    /** @param {...Operation|Operation[]|Operations} ops */
    ops(...ops) {
        return new Operations(...ops);
    }
}

/**
 * @typedef {(Operation|Operations|Operation[])} Ops
 */

/** @extends {Array<Operation>} */
export class Operations extends Array {
    /** @param {...Ops} ops */
    constructor(...ops) {
        super();
        this.add(...ops);

        this.metadata = new Map();
    }

    /** @param {...Ops} ops */
    add(...ops) {
        ops.forEach((op) => {
            if (op instanceof Operation) this.push(op);
            else if (Array.isArray(op)) this.push(...op);
        });
        return this;
    }

    /**
     * Supprime une opération (compat Set)
     * @param {import('./operations.utils').Operation} op
     */
    delete(op) {
        const idx = this.indexOf(op);
        if (idx > -1) this.splice(idx, 1);
        return idx > -1;
    }
}

export class Transaction {
    /** @param {Operation[]|Operations} [ops] @param {import('../blocks').Codex} [codex] @param {Transaction?} [undoing] */
    constructor(ops = [], codex, undoing = null) {
        this.codex = codex;
        this.operations =
            ops instanceof Operations ? ops : new Operations(...ops);

        /** @type {Transaction?} - Tx that is being undone */
        this.undoing = undoing;

        /** @type {Transaction?} - Tx that has undone this one */
        this.undone = null;

        /** @type {Set<function(Transaction): Operation[]>} */
        this.afters = new Set();

        this.temp = new Map();
        this.uuid = crypto.randomUUID();

        /** @type {Number?} */
        this.executedAt = null;

        /** @type {({start: number, end: number} & Object<string, any>) | null | undefined} */
        this.selectionBefore = null;

        /** @type {({start: number, end: number} & Object<string, any>) | null | undefined} */
        this.selectionAfter = null;
    }

    /** @type {Array<{ operation: Operation, result: any }>} */
    results = [];

    /** @type {Array<Operation>} */
    executed = [];

    /** @param {boolean} [redoing] */
    async execute(redoing = false) {
        if (this.codex) this.codex.history.current = this;
        this.selectionBefore = this.codex?.getSelection() || {
            start: 0,
            end: 0,
        };

        try {
            if (redoing) {
                if (this.undone) this.undone.undo();

                // for (const op of this.executed) op.execute();
                // if (this.selectionAfter) this.codex?.focus(this.selectionAfter);
            } else {
                for (const op of this.operations) op.execute(this);
                for (const after of this.afters)
                    after(this).forEach((op) => op.execute(this));
                await tick().then(() => this.commit());
            }

            this.executedAt = Date.now();
            return this;
        } catch (error) {
            for (let i = this.executed.length - 1; i >= 0; i--) {
                const op = this.executed[i];
                if (op.undo) {
                    try {
                        const operations = op.undo();
                        operations?.forEach((op) => op.execute());
                    } catch (undoError) {
                        console.error("Erreur lors du rollback:", undoError);
                    }
                }
            }
            console.error(
                "Erreur lors de l'exécution de la transaction:",
                error,
            );
            throw error;
        } finally {
            if (this.codex) this.codex.history.current = null;
        }
    }

    /** @param {function(Transaction): Operation[]} callback **/
    after = (callback) => {
        if (typeof callback === "function") this.afters.add(callback);
        return this;
    };

    commit = () => {
        if (this.undoing) return;
        if (this.codex) this.codex.history.commit(this);
    };

    undo() {
        const undoOps = [];
        for (let i = this.executed.length - 1; i >= 0; i--) {
            const op = this.executed[i];
            if (op.undo) {
                const undos = op.undo();
                if (undos && undos.length) {
                    undoOps.push(...undos);
                }
            }
        }

        const tx = new Transaction(undoOps, this.codex, this);
        console.log("Undoing", this.executed, " with ops:", undoOps);
        tx.execute()
            .then((tx) => {
                console.log("TX undone", tx);
                if (!this.selectionBefore) return;

                this.codex?.focus({
                    start: this.selectionBefore.start,
                    end: this.selectionBefore.end,
                });
                this.undone = tx;
                // const data = this.codex?.getFocusData({ start: this.selectionBefore.start, end: this.selectionBefore.end });
                // if (data) this.codex?.setRange({
                //     start: { node: data.startElement, offset: data.startOffset },
                //     end: { node: data.endElement, offset: data.endOffset },
                // });
            })
            .catch(console.error);
    }

    redo() {
        this.execute(true).catch(console.error);
    }

    /** @param {Focus} f */
    focus = (f) => this.codex?.focus(f, { tx: this });

    toJSON() {
        return {
            operations: this.operations.map((op) => op.toJSON()),
        };
    }
}

// UTILS

/**
 * @template T {object}
 * @typedef {function(T): Promise<Transaction>} Executor
 */

/**
 * @template T {object}
 * @param {import('../blocks').Block} block
 * @param {function(T): Operation[]} callback
 * @returns {Executor<T>}
 */
export const executor = (block, callback) => (data) => {
    console.log("Executing operations on block", block, "with data:", data);
    if (!block?.codex)
        return Promise.reject(
            new Error("Block is not attached to a Codex instance"),
        );
    const ops = callback(data);
    return block.codex.tx(ops).execute();
};

/** @typedef {function(Operation): any} Applier */

/**
 * @param {Applier} callback
 * @param {String} [name]
 * @param {import('../blocks').Block} [block]
 * @returns {Applier}
 */
export const applier = (callback, name, block) => {
    if (block && name) block.method(name, callback);
    return callback;
};

/**
 * @template {any} [T=any]
 * @typedef {function(T): Operation[]} Preparator
 */

/**
 * @template {any} [T=any]
 * @param {Preparator<T>} callback
 * @param {string} [name]
 * @param {import('../states/block.svelte').Block} [block]
 * @returns {Preparator<T>}
 */
export const preparer = (callback, name, block) => {
    if (block && name) block.preparator(name, callback);
    return callback;
};

export const SMART = Symbol("smart");
export const ITSELF = Symbol("itself");

export const GETDELTA = Symbol("getDelta");
