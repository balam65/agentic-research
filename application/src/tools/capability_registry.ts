import type { CapabilityService } from '../utils/contracts.js';

/**
 * Unified capability registry — merges the old runtime/capabilityRegistry.ts
 * and capabilities/registry.ts into a single service registry for the pipeline.
 */
export class ServiceCapabilityRegistry {
  private readonly servicesByName = new Map<string, CapabilityService>();
  private readonly consumersByEvent = new Map<string, CapabilityService[]>();

  register(service: CapabilityService): void {
    this.servicesByName.set(service.name, service);
    for (const eventName of service.consumes) {
      const current = this.consumersByEvent.get(eventName) ?? [];
      current.push(service);
      this.consumersByEvent.set(eventName, current);
    }
  }

  getConsumers(eventName: string): CapabilityService[] {
    return this.consumersByEvent.get(eventName) ?? [];
  }

  list(): CapabilityService[] {
    return Array.from(this.servicesByName.values());
  }
}
