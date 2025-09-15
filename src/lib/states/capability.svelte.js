export class Capability {
    /**
     * @param {string} name
     * @param {Object} config
     */
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
    }
}