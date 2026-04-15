import type { PipelineEvent, TraceabilityEntry } from './contracts.js';

export class TraceBuilder {
  private readonly entries: TraceabilityEntry[] = [];

  addFromEvent(event: PipelineEvent): void {
    const source = typeof event.payload.source_url === "string" ? event.payload.source_url : undefined;
    this.entries.push({
      step: event.event_name,
      source,
      timestamp: new Date().toISOString(),
      reason: event.justification ?? `Processed event: ${event.event_name}`
    });
  }

  toArray(): TraceabilityEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }
}
