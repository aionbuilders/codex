import { PulseEvent } from "@killiandvcz/pulse";

/** @extends {PulseEvent} */
export class CodexEvent extends PulseEvent {
    /** @param {ConstructorParameters<typeof PulseEvent>[0]} name @param {ConstructorParameters<typeof PulseEvent>[1]} data @param {ConstructorParameters<typeof PulseEvent>[2]} options */
    constructor(name, data = {}, options = {}) {
        super(name, data, options);
        
        /** 
        * Indicates whether the event propagation has been stopped.
        * @type {boolean} */
        this.stopped = false;
    }

    /**
     * Mark this event as stopped, preventing further propagation.
     * @return {void}
     */
    stop() { this.stopped = true; }
}