// src/lib/utils/perf.js
export class Perf {
    static enabled = true; // Toggle pour dev/prod
    
    /**
     * Marque le début d'une opération
     * @param {string} label - Nom unique du marker
     */
    static start(label) {
        if (!this.enabled) return;
        performance.mark(`${label}-start`);
    }
    
    /**
     * Marque la fin et calcule la durée
     * @param {string} label - Nom unique du marker
     * @returns {number} Durée en ms
     */
    static end(label) {
        if (!this.enabled) return 0;
        
        const endMark = `${label}-end`;
        performance.mark(endMark);
        
        try {
            performance.measure(label, `${label}-start`, endMark);
            const measure = performance.getEntriesByName(label)[0];
            
            // Log dans console ET visible dans profiler
            console.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
            
            return measure.duration;
        } catch (e) {
            console.warn(`Marker ${label} non trouvé`, e);
            return 0;
        }
    }
    
    /**
     * Wrapper pour mesurer une fonction
     * @template T
     * @param {string} label
     * @param {() => T} fn
     * @returns {T}
     */
    static measure(label, fn) {
        this.start(label);
        try {
            return fn();
        } finally {
            this.end(label);
        }
    }

    // Ajoute dans PerfMonitor
    static report() {
        console.log("📊 Generating Performance Report...");
        
        const measures = performance.getEntriesByType('measure');
        console.log("📊 Performance Report:");
        
        
        const grouped = measures.reduce((acc, m) => {
            const category = m.name.split('-')[0];
            if (!acc[category]) acc[category] = [];
            acc[category].push(m);
            return acc;
        }, {});
        console.log(grouped);
        
        Object.entries(grouped).forEach(([cat, measures]) => {
            console.group(`📊 ${cat}`);
            console.table(measures.map(m => ({
                name: m.name,
                duration: `${m.duration.toFixed(2)}ms`,
                start: `${m.startTime.toFixed(2)}ms`
            })));
            console.groupEnd();
        });
    }
    
    /**
     * Clear tous les markers
     */
    static clear() {
        performance.clearMarks();
        performance.clearMeasures();
    }
}