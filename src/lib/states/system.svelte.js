/**
 * @typedef {Object} SystemManifest
 * @property {string} name - The name of the system.
 */

import { Codex } from "./codex.svelte";


/**
 * @callback ExecutorMethod
 * @param {...any} args - Additional arguments for the method.
 */

export class System {
    /** @type {SystemManifest} */
    static manifest = {
        name: 'system',
    }

    /**
     * @param {Codex} codex 
     */
    constructor(codex) {
        /** @type {Codex} */
        this.codex = codex;

        this.handlers = new Map();

        /**
         * A set of executors available on the system.
         * @type {Map<string, Function>}
         */
        this.executors = new Map();

        /**
         * A set of methods available on the block.
         * @type {Map<string, Function>}
         */
        this.methods = new Map();
    }


    get manifest() {
        return this.constructor.manifest;
    }

    /**
     * Adds a method to the block.
     * @param {String} name
     * @param {ExecutorMethod} callback
     */
    method = (name, callback) => this.methods.set(name, callback);

    /**
     * Register an event handler for a specific event name.
     * @param {string} name - The name of the event.
     * @param {function(...any): void} callback - The event handler callback.
     */
    handler(name, callback) {
        this.handlers.set(name, callback);
    }

    /**
     * Invoke the handler for a specific event name with provided arguments.
     * @param {string} name - The name of the event.
     * @param  {...any} args - Arguments to pass to the event handler.
     * @returns {any} - The result of the event handler, if any.
     */
    handle(name, ...args) {
        const handler = this.handlers.get(name);
        if (handler) {
            return handler(...args);
        }
    }
}