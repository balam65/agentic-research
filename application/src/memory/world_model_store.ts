import { randomUUID } from 'node:crypto';

import { createLogger } from '../logs/logger.js';
import type { DurableStatePort } from './durable_state_port.js';
import {
  ArtifactRecord,
  ErrorRecord,
  MetricRecord,
  RoutingDecision,
  TaskRecord,
  TaskStatus,
  WorkflowEventInput,
  WorkflowState,
  WorldEvent,
  WorldView,
} from './schema.js';

const logger = createLogger('world-model-store');

function nowIso(): string {
  return new Date().toISOString();
}

export class WorldModelStore {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly events: WorldEvent[] = [];
  private readonly artifacts = new Map<string, ArtifactRecord[]>();
  private readonly metrics = new Map<string, MetricRecord[]>();
  private readonly errors = new Map<string, ErrorRecord[]>();
  private readonly workflowStates = new Map<string, WorkflowState>();

  constructor(private readonly persistence?: DurableStatePort) {}

  async submitTask(task: Omit<TaskRecord, 'createdAt' | 'updatedAt'>): Promise<TaskRecord> {
    const record: TaskRecord = {
      ...task,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.tasks.set(record.id, record);
    const event: WorldEvent = {
      id: randomUUID(),
      type: 'task_submitted',
      taskId: record.id,
      createdAt: nowIso(),
      payload: record,
    };
    this.events.push(event);
    logger.info('Task submitted', { taskId: record.id, status: record.status }, record.id);

    if (this.persistence) {
      await this.persistence.saveTask(record);
      await this.persistence.saveEvent(event);
    }

    await this.ensureWorkflowState(record.id);
    return record;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, reason: string): Promise<void> {
    const task = this.requireTask(taskId);
    const updated: TaskRecord = {
      ...task,
      status,
      updatedAt: nowIso(),
    };
    this.tasks.set(taskId, updated);
    const event: WorldEvent = {
      id: randomUUID(),
      type: 'task_status_changed',
      taskId,
      createdAt: nowIso(),
      payload: { status, reason },
    };
    this.events.push(event);
    logger.info('Task status changed', { taskId, status, reason }, taskId);

    if (this.persistence) {
      await this.persistence.saveTask(updated);
      await this.persistence.saveEvent(event);
    }
  }

  async recordCapabilitySelection(taskId: string, capabilityId: string, rationale: string): Promise<void> {
    const event: WorldEvent = {
      id: randomUUID(),
      type: 'capability_selected',
      taskId,
      createdAt: nowIso(),
      payload: { capabilityId, rationale },
    };
    this.events.push(event);
    logger.info('Capability selected', { taskId, capabilityId }, taskId);

    if (this.persistence) {
      await this.persistence.saveEvent(event);
    }
  }

  async recordIntelligenceDecision(
    taskId: string,
    decision: {
      model: string;
      selectedCapabilityId: string | null;
      rationale: string;
      confidence: number;
      requiresHumanReview: boolean;
      stopExecution: boolean;
    },
  ): Promise<void> {
    const event: WorldEvent = {
      id: randomUUID(),
      type: 'intelligence_decision_recorded',
      taskId,
      createdAt: nowIso(),
      payload: decision,
    };
    this.events.push(event);
    logger.info('Intelligence decision recorded', {
      taskId,
      selectedCapabilityId: decision.selectedCapabilityId,
      confidence: decision.confidence,
      stopExecution: decision.stopExecution,
    }, taskId);

    if (this.persistence) {
      await this.persistence.saveEvent(event);
    }
  }

  async recordWorkflowEvent(taskId: string, event: WorkflowEventInput): Promise<void> {
    const worldEvent: WorldEvent = {
      id: randomUUID(),
      type: 'workflow_event_received',
      taskId,
      createdAt: nowIso(),
      payload: event,
    };
    this.events.push(worldEvent);

    const state = await this.ensureWorkflowState(taskId);
    const confidence = 'confidence_score' in event ? event.confidence_score : undefined;
    if (typeof confidence === 'number' && Number.isFinite(confidence)) {
      state.confidenceHistory.push(Math.max(0, Math.min(1, confidence)));
    }
    state.justifications.push(event.justification);
    state.lastUpdatedAt = nowIso();
    this.workflowStates.set(taskId, state);

    if (this.persistence) {
      await this.persistence.saveEvent(worldEvent);
      await this.persistence.saveWorkflowState(state);
    }
  }

  async recordRoutingDecision(taskId: string, decision: RoutingDecision): Promise<void> {
    const event: WorldEvent = {
      id: randomUUID(),
      type: 'routing_decision_emitted',
      taskId,
      createdAt: nowIso(),
      payload: decision,
    };
    this.events.push(event);

    const state = await this.ensureWorkflowState(taskId);
    state.routingHistory.push(decision);
    state.decisionHistory.push({
      timestamp: decision.decided_at,
      summary: `${decision.next_event}${decision.target_module ? ` -> ${decision.target_module}` : ''}`,
    });
    state.currentStatus = decision.status;
    state.lastUpdatedAt = nowIso();
    this.workflowStates.set(taskId, state);
    logger.debug('Routing decision recorded', {
      taskId,
      nextEvent: decision.next_event,
      targetModule: decision.target_module,
      status: decision.status,
    }, taskId);

    if (this.persistence) {
      await this.persistence.saveEvent(event);
      await this.persistence.saveWorkflowState(state);
    }
  }

  async getWorkflowState(taskId: string): Promise<WorkflowState> {
    return { ...(await this.ensureWorkflowState(taskId)) };
  }

  async updateWorkflowState(
    taskId: string,
    mutator: (current: WorkflowState) => WorkflowState,
  ): Promise<WorkflowState> {
    const next = mutator(await this.ensureWorkflowState(taskId));
    next.lastUpdatedAt = nowIso();
    this.workflowStates.set(taskId, next);

    if (this.persistence) {
      await this.persistence.saveWorkflowState(next);
    }

    return next;
  }

  listWorkflowStates(): WorkflowState[] {
    return Array.from(this.workflowStates.values()).map((state) => ({ ...state }));
  }

  async recordArtifact(taskId: string, artifact: Omit<ArtifactRecord, 'id' | 'taskId' | 'createdAt'>): Promise<ArtifactRecord> {
    const stored: ArtifactRecord = {
      ...artifact,
      id: randomUUID(),
      taskId,
      createdAt: nowIso(),
    };
    const existing = this.artifacts.get(taskId) ?? [];
    existing.push(stored);
    this.artifacts.set(taskId, existing);

    const event: WorldEvent = {
      id: randomUUID(),
      type: stored.kind === 'human_review_packet' ? 'human_review_requested' : 'artifact_recorded',
      taskId,
      createdAt: nowIso(),
      payload: stored,
    };
    this.events.push(event);

    if (this.persistence) {
      await this.persistence.saveArtifact(stored);
      await this.persistence.saveEvent(event);
    }

    return stored;
  }

  async recordMetric(taskId: string, metric: Omit<MetricRecord, 'id' | 'taskId' | 'createdAt'>): Promise<MetricRecord> {
    const stored: MetricRecord = {
      ...metric,
      id: randomUUID(),
      taskId,
      createdAt: nowIso(),
    };
    const existing = this.metrics.get(taskId) ?? [];
    existing.push(stored);
    this.metrics.set(taskId, existing);

    const event: WorldEvent = {
      id: randomUUID(),
      type: 'metric_recorded',
      taskId,
      createdAt: nowIso(),
      payload: stored,
    };
    this.events.push(event);

    if (this.persistence) {
      await this.persistence.saveMetric(stored);
      await this.persistence.saveEvent(event);
    }

    return stored;
  }

  async recordError(taskId: string, error: Omit<ErrorRecord, 'id' | 'taskId' | 'createdAt'>): Promise<ErrorRecord> {
    const stored: ErrorRecord = {
      ...error,
      id: randomUUID(),
      taskId,
      createdAt: nowIso(),
    };
    const existing = this.errors.get(taskId) ?? [];
    existing.push(stored);
    this.errors.set(taskId, existing);

    const event: WorldEvent = {
      id: randomUUID(),
      type: 'execution_failed',
      taskId,
      createdAt: nowIso(),
      payload: stored,
    };
    this.events.push(event);
    logger.error('Error recorded', new Error(error.message), { taskId, source: error.source, retriable: error.retriable }, taskId);

    if (this.persistence) {
      await this.persistence.saveError(stored);
      await this.persistence.saveEvent(event);
    }

    return stored;
  }

  async getWorldView(taskId: string): Promise<WorldView> {
    return {
      task: this.requireTask(taskId),
      artifacts: [...(this.artifacts.get(taskId) ?? [])],
      metrics: [...(this.metrics.get(taskId) ?? [])],
      errors: [...(this.errors.get(taskId) ?? [])],
      events: this.events.filter((event) => event.taskId === taskId),
    };
  }

  listTasks(): TaskRecord[] {
    return Array.from(this.tasks.values());
  }

  async hasTask(taskId: string): Promise<boolean> {
    if (this.tasks.has(taskId)) return true;
    if (this.persistence) {
      const task = await this.persistence.getTask(taskId);
      return !!task;
    }
    return false;
  }

  async hydrateTask(taskId: string): Promise<boolean> {
    if (!this.persistence) return false;

    const task = await this.persistence.getTask(taskId);
    if (!task) return false;

    this.tasks.set(taskId, task);
    this.events.push(...(await this.persistence.getEvents(taskId)));
    this.artifacts.set(taskId, await this.persistence.getArtifacts(taskId));
    this.metrics.set(taskId, await this.persistence.getMetrics(taskId));
    this.errors.set(taskId, await this.persistence.getErrors(taskId));
    const state = await this.persistence.getWorkflowState(taskId);
    if (state) this.workflowStates.set(taskId, state);
    logger.info('Task hydrated from persistence', { taskId }, taskId);

    return true;
  }

  private requireTask(taskId: string): TaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Unknown task '${taskId}'`);
    }
    return task;
  }

  private async ensureWorkflowState(taskId: string): Promise<WorkflowState> {
    const existing = this.workflowStates.get(taskId);
    if (existing) {
      return {
        ...existing,
        completedStages: [...existing.completedStages],
        pendingStages: [...existing.pendingStages],
        failedStages: [...existing.failedStages],
        routingHistory: [...existing.routingHistory],
        confidenceHistory: [...existing.confidenceHistory],
        decisionHistory: [...existing.decisionHistory],
        justifications: [...existing.justifications],
      };
    }

    if (this.persistence) {
      const persisted = await this.persistence.getWorkflowState(taskId);
      if (persisted) {
        this.workflowStates.set(taskId, persisted);
        return { ...persisted };
      }
    }

    const created: WorkflowState = {
      workflowId: taskId,
      currentStatus: 'submitted',
      completedStages: [],
      pendingStages: [],
      failedStages: [],
      routingHistory: [],
      confidenceHistory: [],
      decisionHistory: [],
      justifications: [],
      retryCount: 0,
      lastUpdatedAt: nowIso(),
    };
    this.workflowStates.set(taskId, created);
    if (this.persistence) {
      await this.persistence.saveWorkflowState(created);
    }
    return { ...created };
  }
}
