import type {
  ArtifactRecord,
  ErrorRecord,
  MetricRecord,
  TaskRecord,
  WorkflowState,
  WorldEvent,
} from './schema.js';

/**
 * Interface for durable persistence of World Model state.
 * Implementations include filesystem and Supabase backends.
 */
export interface DurableStatePort {
  saveTask(task: TaskRecord): Promise<void>;
  getTask(taskId: string): Promise<TaskRecord | null>;

  saveEvent(event: WorldEvent): Promise<void>;
  getEvents(taskId: string): Promise<WorldEvent[]>;

  saveArtifact(artifact: ArtifactRecord): Promise<void>;
  getArtifacts(taskId: string): Promise<ArtifactRecord[]>;

  saveMetric(metric: MetricRecord): Promise<void>;
  getMetrics(taskId: string): Promise<MetricRecord[]>;

  saveError(error: ErrorRecord): Promise<void>;
  getErrors(taskId: string): Promise<ErrorRecord[]>;

  saveWorkflowState(state: WorkflowState): Promise<void>;
  getWorkflowState(taskId: string): Promise<WorkflowState | null>;

  checkHealth(): Promise<boolean>;
}
