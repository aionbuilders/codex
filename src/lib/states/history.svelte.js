export class History {

    /** @type {import('../utils/operations.utils').Transaction?} */
    current = $state(null);


    /** @type {import('../utils/operations.utils').Transaction[]} */
    transactions = $state([]);

    index = $state(-1);
    present = $derived(this.transactions[this.index]);
    next = $derived(this.transactions[this.index + 1]);
    previous = $derived(this.transactions[this.index - 1]);
    future = $derived(this.transactions.slice(this.index + 1));

    /** @param {import('../utils/operations.utils').Transaction} tx */
    commit(tx) {
        if (this.transactions.find(t => t === tx)) return;
        // delete all transactions after the current index
        if (this.index < this.transactions.length - 1) {
            this.transactions.splice(this.index + 1);
        }
        this.transactions.push(tx);
        this.index = this.transactions.length - 1;
    }

    undo() {
        try {
            if (this.index >= 0) {
                const tx = this.present;
                if (tx) tx.undo();
                this.index = Math.max(this.index - 1, -1);
            }
        } catch (error) {
            console.error('Error during undo:', error);
        }
    }

    redo() {
        try {
            if (this.index < this.transactions.length - 1) {
                const tx = this.next;
                if (tx) tx.redo();
                this.index = Math.min(this.index + 1, this.transactions.length - 1);
            }
        } catch (error) {
            console.error('Error during redo:', error);
        }
    }
}