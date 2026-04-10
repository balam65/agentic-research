"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    queue = [];
    listeners = new Set();
    publish(event) {
        this.queue.push(event);
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    next() {
        return this.queue.shift();
    }
    hasPending() {
        return this.queue.length > 0;
    }
    clear() {
        this.queue.length = 0;
        this.listeners.clear();
    }
}
exports.EventBus = EventBus;
