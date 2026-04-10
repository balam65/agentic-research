"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityRegistry = void 0;
class CapabilityRegistry {
    servicesByName = new Map();
    consumersByEvent = new Map();
    register(service) {
        this.servicesByName.set(service.name, service);
        for (const eventName of service.consumes) {
            const current = this.consumersByEvent.get(eventName) ?? [];
            current.push(service);
            this.consumersByEvent.set(eventName, current);
        }
    }
    getConsumers(eventName) {
        return this.consumersByEvent.get(eventName) ?? [];
    }
    list() {
        return Array.from(this.servicesByName.values());
    }
}
exports.CapabilityRegistry = CapabilityRegistry;
