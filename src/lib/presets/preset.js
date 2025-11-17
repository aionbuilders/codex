/**
 * @typedef {{
 *  name?: string,
 *  blocks?: Array<typeof import('../blocks/block.svelte').Block>,
 *  systems?: Array<typeof import('../states/system.svelte').System>,
 *  strategies?: Array<import('../states/strategy.svelte').Strategy>,
 *  extends?: Preset,
 *  config?: Record<string, any>,
 * }} PresetInit
 */

export class Preset {
    /** @param {PresetInit} init */
    constructor(init = {}) {
        this.init = init;
    }

    /** @returns {string} */
    get name() {
        return this.init.name || 'custom-preset';
    }

    /** @returns {Array<typeof import('../states/block.svelte').Block>} */
    get blocks() {
        const blocks = new Set(this.init.blocks || []);
        
        if (this.init.extends) {
            for (const block of this.init.extends.blocks) {
                blocks.add(block);
            }
        }
        
        return Array.from(blocks);
    }

    /** @returns {Array<typeof import('../states/system.svelte').System>} */
    get systems() {
        const systems = new Set(this.init.systems || []);

        if (this.init.extends) {
            for (const system of this.init.extends.systems) {
                systems.add(system);
            }
        }

        return Array.from(systems);
    }

    /** @returns {Array< import('../states/strategy.svelte').Strategy>} */
    get strategies() {
        const strategies = new Set(this.init.strategies || []);

        if (this.init.extends) {
            for (const strategy of this.init.extends.strategies) {
                strategies.add(strategy);
            }
        }

        return Array.from(strategies);
    }

    /** @returns {Record<string, any>} */
    get config() {
        return {
            ...(this.init.extends ? this.init.extends.config : {}),
            ...(this.init.config || {})
        };
    }
    
    /** @returns {Preset|undefined} */
    get extends() {
        return this.init.extends;
    }

    /** @param {PresetInit} init */
    extend = (init = {}) => Preset.extend(this, init);

    /**
     * Clones the preset.
     * @param {(present: Preset) => Preset} [middleware]
     * @returns {Preset}
     */
    clone = (middleware) => {
        const cloned = new Preset({
            ...this.init
        });
        if (middleware) {
            return middleware(cloned) || cloned;
        }
        return cloned;
    }

    /** 
     * @param {Preset} preset
     * @param {PresetInit} [init]
     * @returns {Preset}
     */
    static extend(preset, init = {}) {
        return new Preset({
            ...init,
            extends: preset
        });
    }



    debug = () => {
        console.log('Preset ', this.name, this.extends ? `(extends ${this.extends.name})` : '', ' :');
        console.log('- Blocks :');
        console.table(this.blocks.map(b => b.manifest.type));
        console.log('- Systems :');
        console.table(this.systems.map(s => s.manifest.name));
        console.log('---');
        return this;
    }
}