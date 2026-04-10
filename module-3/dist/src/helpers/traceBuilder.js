"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceBuilder = void 0;
class TraceBuilder {
    entries = [];
    addFromEvent(event) {
        const source = typeof event.payload.source_url === "string" ? event.payload.source_url : undefined;
        this.entries.push({
            step: event.event_name,
            source,
            timestamp: new Date().toISOString(),
            reason: event.justification ?? `Processed event: ${event.event_name}`
        });
    }
    toArray() {
        return this.entries.map((entry) => ({ ...entry }));
    }
}
exports.TraceBuilder = TraceBuilder;
