/**
* @typedef {import('../blocks').Codex} Codex

* @typedef {(codex: Codex, context: any) => boolean} CanHandle
* @typedef {(codex: Codex, context: any) => void} Executor
*/

export class Strategy {
    /**
     * @param {String} name
     * @param {CanHandle} [canHandleFn]
     * @param {Executor} [executeFn]
     */
    constructor(name, canHandleFn, executeFn) {
        this.name = name;
        this.canHandleFn = canHandleFn || (() => true);
        this.executeFn = executeFn || (() => {});

        /** @type {String[]} */
        this.tags = [];

        /** @type {boolean} - Whether this strategy should be checked at codex level (priority) */
        this.priority = false;

        /** @type {boolean} - Whether this strategy can work without block selection */
        this.soloBlock = false;
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
        if (this.canHandle(codex, context) && this.executeFn) {
            this.executeFn(codex, context);
        } else {
            console.warn(
                `Strategy "${this.name}" cannot handle the given codex.`,
            );
        }
    };

    /**
     * Sets the canHandle function for the strategy.
     * @param {CanHandle} fn - The function to determine if the strategy can handle the codex.
     * @returns {Strategy} - The current strategy instance for chaining.
     */
    if = fn => {
        this.canHandleFn = fn;
        return this;
    }

    /**
     * Sets the execute function for the strategy.
     * @param {Executor} fn - The function to execute the strategy.
     * @returns {Strategy} - The current strategy instance for chaining.
     */
    do = fn => {
        this.executeFn = fn;
        return this;
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
    };

    /**
     * Adds an event listener tag to the strategy.
     * @param {String} eventName - The event name to listen for.
     * @returns {Strategy} - The current strategy instance for chaining.
     */
    on = (eventName) => this.tag(`on:${eventName}`);
}


/**
 * @param {string} name
 */
export const strategy = (name) => new Strategy(name)