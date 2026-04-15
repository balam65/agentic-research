import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { createLogger } from '../logs/logger.js';
import type { DurableStatePort } from './durable_state_port.js';
import type {
  ArtifactRecord,
  ErrorRecord,
  MetricRecord,
  TaskRecord,
  WorkflowState,
  WorldEvent,
} from './schema.js';

const logger = createLogger('supabase-durable-port');

/**
 * Converts an arbitrary text string into a deterministic UUID (v4-format).
 * The same input always produces the same UUID — critical for save/get symmetry
 * on the world_events.job_id column which is UUID-typed.
 */
function textToUuid(text: string): string {
  const hash = createHash('md5').update(text).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export class SupabaseDurableStatePort implements DurableStatePort {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey);
  }

  async checkHealth(): Promise<boolean> {
    try {
      const { error } = await this.client.from('tasks').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  async saveTask(task: TaskRecord): Promise<void> {
    const { error } = await this.client
      .from('tasks')
      .upsert({
        id: task.id,
        input: task.input,
        output_goal: task.outputGoal,
        status: task.status,
        governance: task.governance,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      }, { onConflict: 'id' });
    if (error) logger.error('Failed to save task', new Error(error.message), { taskId: task.id });
  }

  async getTask(taskId: string): Promise<TaskRecord | null> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      input: data.input,
      outputGoal: data.output_goal,
      status: data.status,
      governance: data.governance,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async saveEvent(event: WorldEvent): Promise<void> {
    const jobUuid = textToUuid(event.taskId);

    // Ensure a research_jobs record exists to satisfy FK constraint on world_events.job_id
    const { error: jobError } = await this.client
      .from('research_jobs')
      .upsert({
        id: jobUuid,
        title: `Agentic task: ${event.taskId}`,
        status: 'pending',
        input_params: { task_id: event.taskId },
        priority: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (jobError) {
      logger.error('Failed to ensure research_jobs record', new Error(jobError.message), { taskId: event.taskId });
      return; // Don't attempt world_events insert if FK target doesn't exist
    }

    const { error } = await this.client
      .from('world_events')
      .insert({
        id: event.id,
        event_type: event.type,
        job_id: jobUuid,
        source: 'orchestrator',
        message: event.type,
        payload: { ...event.payload as Record<string, unknown>, _task_id: event.taskId },
        timestamp: event.createdAt,
      });
    if (error) logger.error('Failed to save event', new Error(error.message), { eventId: event.id });
  }

  async getEvents(taskId: string): Promise<WorldEvent[]> {
    const jobUuid = textToUuid(taskId);
    const { data, error } = await this.client
      .from('world_events')
      .select('*')
      .eq('job_id', jobUuid)
      .order('timestamp', { ascending: true });
    if (error || !data) return [];
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      type: row.event_type as WorldEvent['type'],
      taskId: (row.payload as Record<string, unknown>)?._task_id as string ?? taskId,
      createdAt: row.timestamp as string,
      payload: row.payload,
    })) as WorldEvent[];
  }

  async saveArtifact(artifact: ArtifactRecord): Promise<void> {
    const { error } = await this.client
      .from('artifacts')
      .insert({
        id: artifact.id,
        task_id: artifact.taskId,
        kind: artifact.kind,
        produced_by: artifact.producedBy,
        content: artifact.content,
        confidence: artifact.confidence,
        created_at: artifact.createdAt,
      });
    if (error) logger.error('Failed to save artifact', new Error(error.message), { artifactId: artifact.id });
  }

  async getArtifacts(taskId: string): Promise<ArtifactRecord[]> {
    const { data, error } = await this.client
      .from('artifacts')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      taskId: row.task_id as string,
      kind: row.kind as ArtifactRecord['kind'],
      producedBy: row.produced_by as string,
      content: row.content as Record<string, unknown>,
      confidence: row.confidence as number | undefined,
      createdAt: row.created_at as string,
    }));
  }

  async saveMetric(metric: MetricRecord): Promise<void> {
    const { error } = await this.client
      .from('metrics')
      .insert({
        id: metric.id,
        task_id: metric.taskId,
        source: metric.source,
        name: metric.name,
        value: metric.value,
        unit: metric.unit,
        created_at: metric.createdAt,
      });
    if (error) logger.error('Failed to save metric', new Error(error.message), { metricId: metric.id });
  }

  async getMetrics(taskId: string): Promise<MetricRecord[]> {
    const { data, error } = await this.client
      .from('metrics')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      taskId: row.task_id as string,
      source: row.source as string,
      name: row.name as string,
      value: row.value as number,
      unit: row.unit as string,
      createdAt: row.created_at as string,
    }));
  }

  async saveError(error: ErrorRecord): Promise<void> {
    const { error: saveErr } = await this.client
      .from('errors')
      .insert({
        id: error.id,
        task_id: error.taskId,
        source: error.source,
        message: error.message,
        retriable: error.retriable,
        created_at: error.createdAt,
      });
    if (saveErr) logger.error('Failed to save error record', new Error(saveErr.message), { errorId: error.id });
  }

  async getErrors(taskId: string): Promise<ErrorRecord[]> {
    const { data, error } = await this.client
      .from('errors')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      taskId: row.task_id as string,
      source: row.source as string,
      message: row.message as string,
      retriable: row.retriable as boolean,
      createdAt: row.created_at as string,
    }));
  }

  async saveWorkflowState(state: WorkflowState): Promise<void> {
    const { error } = await this.client
      .from('workflow_states')
      .upsert({
        workflow_id: state.workflowId,
        current_status: state.currentStatus,
        completed_stages: state.completedStages,
        pending_stages: state.pendingStages,
        failed_stages: state.failedStages,
        routing_history: state.routingHistory,
        confidence_history: state.confidenceHistory,
        decision_history: state.decisionHistory,
        justifications: state.justifications,
        retry_count: state.retryCount,
        last_updated_at: state.lastUpdatedAt,
      }, { onConflict: 'workflow_id' });
    if (error) logger.error('Failed to save workflow state', new Error(error.message), { workflowId: state.workflowId });
  }

  async getWorkflowState(taskId: string): Promise<WorkflowState | null> {
    const { data, error } = await this.client
      .from('workflow_states')
      .select('*')
      .eq('workflow_id', taskId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      workflowId: data.workflow_id,
      currentStatus: data.current_status,
      completedStages: data.completed_stages ?? [],
      pendingStages: data.pending_stages ?? [],
      failedStages: data.failed_stages ?? [],
      routingHistory: data.routing_history ?? [],
      confidenceHistory: data.confidence_history ?? [],
      decisionHistory: data.decision_history ?? [],
      justifications: data.justifications ?? [],
      retryCount: data.retry_count ?? 0,
      lastUpdatedAt: data.last_updated_at,
    };
  }
}
