export class BoardEventBuffer {
    maxSize;
    events = [];
    constructor(maxSize = 500) {
        this.maxSize = maxSize;
    }
    push(event) {
        this.events.push(event);
        if (this.events.length > this.maxSize) {
            this.events.shift();
        }
    }
    getRecent(limit = this.maxSize) {
        if (limit <= 0) {
            return [];
        }
        return this.events.slice(-Math.min(limit, this.events.length));
    }
    size() {
        return this.events.length;
    }
}
