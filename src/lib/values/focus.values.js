/**
 * @typedef {"global"|"blocks"} FocusScope
 */

export class Focus {
    /** @param {Number} start @param {Number} [end] @param {FocusScope} [scope="blocks"] */
    constructor(start, end, scope = "blocks") {
        this.start = start;
        end ??= start;
        this.end = end;
        this.scope = scope;
    }
}