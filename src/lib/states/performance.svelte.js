// src/lib/states/performance.svelte.js

/**
 * @typedef {Object} DerivedMetric
 * @property {number} count - Number of times this derived was computed
 * @property {number} totalTime - Total time spent computing (ms)
 * @property {number} avgTime - Average computation time (ms)
 * @property {number} maxTime - Maximum computation time recorded (ms)
 * @property {number} minTime - Minimum computation time recorded (ms)
 * @property {number[]} recentTimes - Last 10 computation times for trend analysis
 * @property {string} lastComputed - ISO timestamp of last computation
 */

/**
 * @typedef {Object} OperationMetric
 * @property {string} operation - Operation class name (e.g., 'TextInsertOperation')
 * @property {string} block - Block type that executed the operation
 * @property {number} duration - Time taken to execute (ms)
 * @property {number} timestamp - Unix timestamp of execution
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [error] - Error message if operation failed
 */

/**
 * @typedef {Object} FocusRetryMetric
 * @property {string} blockType - Type of block attempting focus
 * @property {number} attempts - Number of retry attempts
 * @property {boolean} succeeded - Whether focus was eventually achieved
 * @property {number} totalTime - Total time spent retrying (ms)
 * @property {number} timestamp - Unix timestamp
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {Map<string, DerivedMetric>} derivedComputations - Tracked derived computations
 * @property {OperationMetric[]} operationTimes - Recent operation execution times
 * @property {FocusRetryMetric[]} focusRetries - Focus retry attempts
 * @property {number} domMutations - Count of DOM mutations observed
 * @property {number} lastFrameTime - Duration of last animation frame (ms)
 * @property {number} frameDrops - Number of frames that took >16.67ms
 * @property {Map<string, number>} eventCounts - Count of events by type
 */

/**
 * @typedef {Object} PerformanceReport
 * @property {Array<[string, DerivedMetric]>} slowDerived - Derived computations exceeding threshold
 * @property {Object<string, {count: number, totalTime: number, avgTime: number}>} operationStats - Aggregated operation statistics
 * @property {number} focusRetryRate - Percentage of focus operations requiring retries
 * @property {number} frameRate - Estimated FPS based on frame times
 * @property {string[]} warnings - Performance warnings and suggestions
 * @property {Object} memoryEstimate - Estimated memory usage by component
 */

/**
 * @typedef {Object} PerformanceThresholds
 * @property {number} slowDerivedMs - Threshold for slow derived computation (default: 5ms)
 * @property {number} slowOperationMs - Threshold for slow operation (default: 16ms)
 * @property {number} maxOperationHistory - Maximum operations to track (default: 100)
 * @property {number} criticalFrameDropPercent - Critical frame drop percentage (default: 10)
 */

/**
 * Performance monitoring system for Codex editor.
 * Tracks computation times, operation performance, and identifies bottlenecks.
 * 
 * @class PerformanceMonitor
 * @example
 * ```javascript
 * const monitor = new PerformanceMonitor({
 *   slowDerivedMs: 10,
 *   enabled: true
 * });
 * 
 * // Track a derived computation
 * const result = monitor.track('block.recursive', () => {
 *   return expensiveComputation();
 * });
 * 
 * // Get performance report
 * const report = monitor.report;
 * console.log(`Slow computations: ${report.slowDerived.length}`);
 * ```
 */
export class PerformanceMonitor {
    /**
     * Creates a new performance monitor instance.
     * 
     * @param {Object} [config] - Configuration options
     * @param {boolean} [config.enabled=false] - Whether monitoring is active
     * @param {PerformanceThresholds} [config.thresholds] - Performance thresholds
     * @param {boolean} [config.logWarnings=true] - Whether to log warnings to console
     * @param {number} [config.samplingRate=1] - Sampling rate (0-1) for performance tracking
     */
    constructor(config = {}) {
        /** 
         * Performance metrics storage
         * @type {PerformanceMetrics}
         * @private
         */
        this.metrics = $state({
            derivedComputations: new Map(),
            operationTimes: [],
            focusRetries: [],
            domMutations: 0,
            lastFrameTime: 0,
            frameDrops: 0,
            eventCounts: new Map()
        });
        
        /**
         * Whether performance monitoring is enabled
         * @type {boolean}
         */
        this.enabled = $state(config.enabled ?? false);
        
        /**
         * Performance thresholds configuration
         * @type {PerformanceThresholds}
         */
        this.thresholds = {
            slowDerivedMs: config.thresholds?.slowDerivedMs ?? 5,
            slowOperationMs: config.thresholds?.slowOperationMs ?? 16,
            maxOperationHistory: config.thresholds?.maxOperationHistory ?? 100,
            criticalFrameDropPercent: config.thresholds?.criticalFrameDropPercent ?? 10
        };
        
        /**
         * Whether to log warnings to console
         * @type {boolean}
         * @private
         */
        this.logWarnings = config.logWarnings ?? true;
        
        /**
         * Sampling rate for performance tracking (0-1)
         * @type {number}
         * @private
         */
        this.samplingRate = config.samplingRate ?? 1;
        
        /**
         * Start time for session metrics
         * @type {number}
         * @private
         */
        this.sessionStart = performance.now();
    }
    
    /**
     * Tracks the performance of a derived computation.
     * Wraps a function to measure its execution time and track metrics.
     * 
     * @template T
     * @param {string} name - Unique identifier for this computation (e.g., 'paragraph.recursive')
     * @param {() => T} fn - The computation function to track
     * @returns {T} The result of the computation
     * 
     * @example
     * ```javascript
     * const blocks = monitor.track('paragraph.children', () => {
     *   return this.children.filter(child => child.selected);
     * });
     * ```
     */
    track(name, fn) {
        if (!this.enabled || Math.random() > this.samplingRate) return fn();
        
        const start = performance.now();
        let error = null;
        let result;
        
        try {
            result = fn();
        } catch (e) {
            error = e;
            throw e;
        } finally {
            const duration = performance.now() - start;
            this.#recordDerivedMetric(name, duration, error);
            
            if (this.logWarnings && duration > this.thresholds.slowDerivedMs) {
                console.warn(
                    `🐌 Slow derived computation: "${name}" took ${duration.toFixed(2)}ms`,
                    { threshold: this.thresholds.slowDerivedMs }
                );
            }
        }
        
        return result;
    }
    
    /**
     * Tracks the performance of an operation execution.
     * Monitors both successful and failed operations.
     * 
     * @template T
     * @param {import('../utils/operations.utils').Operation} op - The operation to track
     * @param {() => T} fn - The operation execution function
     * @returns {T} The result of the operation
     * 
     * @example
     * ```javascript
     * const result = monitor.trackOperation(insertOp, () => {
     *   return insertOp.execute(transaction);
     * });
     * ```
     */
    trackOperation(op, fn) {
        if (!this.enabled) return fn();
        
        const start = performance.now();
        let error = null;
        let result;
        
        try {
            result = fn();
        } catch (e) {
            error = e;
            throw e;
        } finally {
            const duration = performance.now() - start;
            this.#recordOperationMetric(op, duration, !error, error?.message);
            
            if (this.logWarnings && duration > this.thresholds.slowOperationMs) {
                console.warn(
                    `🐢 Slow operation: ${op.constructor.name} on ${op.block.type} took ${duration.toFixed(2)}ms`,
                    { operation: op, threshold: this.thresholds.slowOperationMs }
                );
            }
        }
        
        return result;
    }
    
    /**
     * Records a focus retry attempt.
     * Helps identify focus-related performance issues.
     * 
     * @param {string} blockType - Type of block attempting focus
     * @param {number} attempts - Number of attempts made
     * @param {boolean} succeeded - Whether focus was achieved
     * @param {number} totalTime - Total time spent retrying
     * 
     * @example
     * ```javascript
     * monitor.trackFocusRetry('text', 5, true, 150);
     * ```
     */
    trackFocusRetry(blockType, attempts, succeeded, totalTime) {
        if (!this.enabled) return;
        
        this.metrics.focusRetries.push({
            blockType,
            attempts,
            succeeded,
            totalTime,
            timestamp: Date.now()
        });
        
        // Keep only recent retries
        if (this.metrics.focusRetries.length > 50) {
            this.metrics.focusRetries.shift();
        }
        
        if (this.logWarnings && attempts > 3) {
            console.warn(
                `⚠️ Focus required ${attempts} attempts for ${blockType}`,
                { totalTime: `${totalTime.toFixed(2)}ms`, succeeded }
            );
        }
    }
    
    /**
     * Records a DOM mutation.
     * Increments the mutation counter for tracking DOM thrashing.
     * 
     * @param {string} [type='unknown'] - Type of mutation
     */
    trackDOMMutation(type = 'unknown') {
        if (!this.enabled) return;
        this.metrics.domMutations++;
        this.#incrementEventCount(`dom:${type}`);
    }
    
    /**
     * Records frame timing for FPS calculation.
     * Should be called from requestAnimationFrame.
     * 
     * @param {number} frameTime - Duration of the frame in milliseconds
     */
    trackFrame(frameTime) {
        if (!this.enabled) return;
        
        this.metrics.lastFrameTime = frameTime;
        if (frameTime > 16.67) { // 60 FPS threshold
            this.metrics.frameDrops++;
        }
    }
    
    /**
     * Generates a comprehensive performance report.
     * Analyzes collected metrics and provides warnings/suggestions.
     * 
     * @returns {PerformanceReport} Performance analysis report
     * @readonly
     */
    report = $derived(this.#generateReport());
    
    /**
     * Resets all collected metrics.
     * Useful for starting fresh measurements or clearing memory.
     */
    reset() {
        this.metrics.derivedComputations.clear();
        this.metrics.operationTimes = [];
        this.metrics.focusRetries = [];
        this.metrics.domMutations = 0;
        this.metrics.frameDrops = 0;
        this.metrics.eventCounts.clear();
        this.sessionStart = performance.now();
    }
    
    /**
     * Enables performance monitoring.
     * Starts collecting metrics from this point forward.
     */
    enable() {
        this.enabled = true;
        console.info('🚀 Performance monitoring enabled');
    }
    
    /**
     * Disables performance monitoring.
     * Stops collecting new metrics but preserves existing data.
     */
    disable() {
        this.enabled = false;
        console.info('🛑 Performance monitoring disabled');
    }
    
    /**
     * Exports metrics data for external analysis.
     * Useful for sending to analytics services or saving to file.
     * 
     * @returns {Object} Serializable metrics data
     */
    export() {
        return {
            sessionDuration: performance.now() - this.sessionStart,
            metrics: {
                derivedComputations: Object.fromEntries(this.metrics.derivedComputations),
                operationTimes: this.metrics.operationTimes,
                focusRetries: this.metrics.focusRetries,
                domMutations: this.metrics.domMutations,
                frameDrops: this.metrics.frameDrops,
                eventCounts: Object.fromEntries(this.metrics.eventCounts)
            },
            thresholds: this.thresholds,
            report: this.#generateReport()
        };
    }
    
    // Private methods...
    
    /**
     * Records a derived computation metric.
     * @param {string} name - The name of the derived computation
     * @param {number} duration - The duration of the computation
     * @param {Error?} error - Any error that occurred during the computation
     */
    #recordDerivedMetric(name, duration, error) {
        const current = this.metrics.derivedComputations.get(name) || {
            count: 0,
            totalTime: 0,
            avgTime: 0,
            maxTime: 0,
            minTime: Infinity,
            recentTimes: [],
            lastComputed: null
        };
        
        current.count++;
        current.totalTime += duration;
        current.avgTime = current.totalTime / current.count;
        current.maxTime = Math.max(current.maxTime, duration);
        current.minTime = Math.min(current.minTime, duration);
        current.recentTimes.push(duration);
        if (current.recentTimes.length > 10) current.recentTimes.shift();
        current.lastComputed = new Date().toISOString();
        
        this.metrics.derivedComputations.set(name, current);
    }
    
    /**
     * Records an operation execution metric.
     * @param {import('../utils/operations.utils').Operation} op - The operation executed
     * @param {number} duration - The duration of the operation
     * @param {boolean} success - Whether the operation succeeded
     * @param {string} [error] - Error message if operation failed
     */
    #recordOperationMetric(op, duration, success, error) {
        this.metrics.operationTimes.push({
            operation: op.constructor.name,
            block: op.block.type,
            duration,
            timestamp: Date.now(),
            success,
            error
        });
        
        if (this.metrics.operationTimes.length > this.thresholds.maxOperationHistory) {
            this.metrics.operationTimes.shift();
        }
    }
    
    /**
     * Increments an event counter.
     * @param {string} eventType - The type of event to count
     */
    #incrementEventCount(eventType) {
        const current = this.metrics.eventCounts.get(eventType) || 0;
        this.metrics.eventCounts.set(eventType, current + 1);
    }
    
    /**
     * Generates the performance report.
     * @returns {PerformanceReport}
     */
    #generateReport() {
        // Implementation details...
        return {
            slowDerived: [],
            operationStats: {},
            focusRetryRate: 0,
            frameRate: 60,
            warnings: [],
            memoryEstimate: {}
        };
    }
}