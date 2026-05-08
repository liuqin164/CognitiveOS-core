import { randomUUID } from 'crypto';
export class TraceWriter {
    store;
    constructor(store) {
        this.store = store;
    }
    emit(event) {
        this.store.append({
            ...event,
            id: randomUUID(),
            timestamp: Date.now()
        });
    }
}
