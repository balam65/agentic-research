import type { PipelineEvent } from '../utils/contracts.js';

export type EventListener = (event: PipelineEvent) => void;

export class EventBus {
  private readonly queue: PipelineEvent[] = [];
  private readonly listeners = new Set<EventListener>();

  publish(event: PipelineEvent): void {
    this.queue.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  next(): PipelineEvent | undefined {
    return this.queue.shift();
  }

  hasPending(): boolean {
    return this.queue.length > 0;
  }

  clear(): void {
    this.queue.length = 0;
    this.listeners.clear();
  }
}
