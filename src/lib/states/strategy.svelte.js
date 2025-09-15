/**
* @typedef {import('./codex.svelte').Codex} Codex

* @typedef {(codex: Codex, context: any) => boolean} CanHandle
* @typedef {(codex: Codex, context: any) => void} Executor
*/

export class Strategy {
    /**
    * @param {String} name
    * @param {CanHandle} canHandleFn
    * @param {Executor} executeFn
    */
    constructor(name, canHandleFn, executeFn) {
        this.name = name;
        this.canHandleFn = canHandleFn;
        this.executeFn = executeFn;

        /** @type {String[]} */
        this.tags = [];
    }
    
    
    /**     
    * Checks if the strategy can handle the given codex.
    * @param {Codex} codex
    * @param {any} context - Additional context for the strategy.
    * @returns {boolean}
    */
    canHandle = (codex, context) => this.canHandleFn(codex, context);
    
    /**
    * Executes the strategy on the given codex.
    * @param {Codex} codex
    * @param {any} context - Additional context for the strategy.
    */
    execute = (codex, context) => {
        if (this.canHandle(codex, context)) {
            this.executeFn(codex, context);
        } else {
            console.warn(`Strategy "${this.name}" cannot handle the given codex.`);
        }
    }

    /**
    * Adds a tag to the strategy.
    * @param {String} tag - The tag to add.
    * @returns {Strategy} - The current strategy instance for chaining.
    */
    tag = (tag) => {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
        return this;
    }
    
}