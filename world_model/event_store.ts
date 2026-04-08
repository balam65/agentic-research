import { randomUUID } from 'node:crypto';

import {
  ArtifactRecord,
  ErrorRecord,
  MetricRecord,
  TaskRecord,
  TaskStatus,
  WorldEvent,
  WorldView,
} from './schema.js';

function nowIso(): string {
  return new Date().toISOString();
}

export class WorldModelStore {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly events: WorldEvent[] = [];
  private readonly artifacts = new Map<string, ArtifactRecord[]>();
  private readonly metrics = new Map<string, MetricRecord[]>();
  private readonly errors = new Map<string, ErrorRecord[]>();

  submitTask(task: Omit<TaskRecord, 'createdAt' | 'updatedAt'>): TaskRecord {
    const record: TaskRecord = {
      ...task,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.tasks.set(record.id, record);
    this.events.push({
      id: randomUUID(),
      type: 'task_submitted',
      taskId: record.id,
      createdAt: nowIso(),
      payload: record,
    });
    return record;
  }

  updateTaskStatus(taskId: string, status: TaskStatus, reason: string): void {
    const task = this.requireTask(taskId);
    const updated: TaskRecord = {
      ...task,
      status,
      updatedAt: nowIso(),
    };
    this.tasks.set(taskId, updated);
    this.events.push({
      id: randomUUID(),
      type: 'task_status_changed',
      taskId,
      createdAt: nowIso(),
      payload: { status, reason },
    });
  }

  recordCapabilitySelection(taskId: string, capabilityId: string, rationale: string): void {
    this.events.push({
      id: randomUUID(),
      type: 'capability_selected',
      taskId,
      createdAt: nowIso(),
      payload: { capabilityId, rationale },
    });
  }

  recordIntelligenceDecision(
    taskId: string,
    decision: {
      model: string;
      selectedCapabilityId: string | null;
      rationale: string;
      confidence: number;
      requiresHumanReview: boolean;
      stopExecution: boolean;
    },
  ): void {
    this.events.push({
      id: randomUUID(),
      type: 'intelligence_decision_recorded',
      taskId,
      createdAt: nowIso(),
      payload: decision,
    });
  }

  recordArtifact(taskId: string, artifact: Omit<ArtifactRecord, 'id' | 'taskId' | 'createdAt'>): ArtifactRecord {
    const stored: ArtifactRecord = {
      ...artifact,
      id: randomUUID(),
      taskId,
      createdAt: nowIso(),
    };
    const existing = this.artifacts.get(taskId) ?? [];
    existing.push(stored);
    this.artifacts.set(taskId, existing);

    this.events.push({
      id: randomUUID(),
      type: stored.kind === 'human_review_packet' ? 'human_review_requested' : 'artifact_recorded',
      taskId,
      createdAt: nowIso(),
      payload: stored,
    });

    return stored;
  }

  recordMetric(taskId: string, metric: Omit<MetricRecord, 'id' | 'taskId' | 'createdAt'>): MetricRecord {
    const stored: MetricRecord = {
      ...metric,
      id: randomUUID(),
      taskId,
      createdAt: nowIso(),
    };
    const existing = this.metrics.get(taskId) ?? [];
    existing.push(stored);
    this.metrics.set(taskId, existing);

    this.events.push({
      id: randomUUID(),
      type: 'metric_recorded',
      taskId,
      createdAt: nowIso(),
      payload: stored,
    });

    return stored;
  }

  recordError(taskId: string, error: Omit<ErrorRecord, 'id' | 'taskId' | 'createdAt'>): ErrorRecord {
    const stored: ErrorRecord = {
      ...error,
      id: randomUUID(),
      taskId,
      createdAt: nowIso(),
    };
    const existing = this.errors.get(taskId) ?? [];
    existing.push(stored);
    this.errors.set(taskId, existing);

    this.events.push({
      id: randomUUID(),
      type: 'execution_failed',
      taskId,
      createdAt: nowIso(),
      payload: stored,
    });

    return stored;
  }

  getWorldView(taskId: string): WorldView {
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

  private requireTask(taskId: string): TaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Unknown task '${taskId}'`);
    }
    return task;
  }
}
