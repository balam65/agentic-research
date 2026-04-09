import { RoutingDecision, WorkflowEventInput } from '../world_model/schema.js';

export type EventListener = (event: WorkflowEventInput) => void | Promise<void>;
export type RoutingDecisionListener = (decision: RoutingDecision) => void | Promise<void>;

export interface EventDispatcher {
  publish(event: WorkflowEventInput): Promise<void>;
  publishDecision(decision: RoutingDecision): Promise<void>;
  onEvent(listener: EventListener): () => void;
  onDecision(listener: RoutingDecisionListener): () => void;
}

export class InMemoryEventDispatcher implements EventDispatcher {
  private readonly eventListeners = new Set<EventListener>();
  private readonly decisionListeners = new Set<RoutingDecisionListener>();

  async publish(event: WorkflowEventInput): Promise<void> {
    for (const listener of this.eventListeners) {
      await listener(event);
    }
  }

  async publishDecision(decision: RoutingDecision): Promise<void> {
    for (const listener of this.decisionListeners) {
      await listener(decision);
    }
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  onDecision(listener: RoutingDecisionListener): () => void {
    this.decisionListeners.add(listener);
    return () => {
      this.decisionListeners.delete(listener);
    };
  }
}
