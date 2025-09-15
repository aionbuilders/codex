/**
 * @typedef {Object} DeletionConfig
 * @property {'auto'|'full'|'partial'} [mode='auto'] - The mode of deletion, e.g. 'auto' for automatic deletion.
 * @property {'forward'|'backward'} [direction='forward'] - The direction of deletion, e.g. 'forward' to delete text forward.
 * @property {'keyboard'|'mouse'} [source='keyboard'] - The source of the deletion, e.g. 'keyboard' for keyboard input.
 * @property {Number} [timestamp=Date.now()] - The timestamp of the deletion event.
 * @property {any} [data] - Additional data related to the deletion event.
 */

export class Deletion {
    /**
     * @param {DeletionConfig} config
     */
    constructor(config = {}) {
        this.mode = config.mode || 'auto';
        this.direction = config.direction || 'forward';
        this.source = config.source || 'keyboard';
        this.timestamp = Date.now();
        this.data = config.data;
    }
}