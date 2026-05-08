export class ProposalConfigOverlay {
    store = new Map();
    set(key, value) {
        this.store.set(key, value);
    }
    get(key) {
        return this.store.get(key);
    }
    entries() {
        return Array.from(this.store.entries(), ([key, value]) => ({ key, value }));
    }
    clear() {
        this.store.clear();
    }
    async withOverlay(entries, fn) {
        this.clear();
        for (const entry of entries) {
            this.set(entry.key, entry.value);
        }
        try {
            return await fn();
        }
        finally {
            this.clear();
        }
    }
}
