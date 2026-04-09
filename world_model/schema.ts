export type TaskStatus =
  | 'submitted'
  | 'active'
  | 'waiting_for_human'
  | 'completed'
  | 'failed';

export type WorkflowStatus =
  | 'submitted'
  | 'in_progress'
  | 'waiting_for_human'
  | 'completed'
  | 'failed'
  | 'blocked';

export type WorkflowInputEventType = 'INPUT_CONTRACT_VALIDATED';

export type WorkflowDownstreamEventType =
  | 'DISCOVERY_COMPLETED'
  | 'DISCOVERY_FAILED'
  | 'EXTRACTION_COMPLETED'
  | 'EXTRACTION_FAILED'
  | 'QA_COMPLETED'
  | 'QA_FAILED'
  | 'LOW_CONFIDENCE_DETECTED'
  | 'HITL_APPROVED'
  | 'HITL_REJECTED';

export type WorkflowEventType = WorkflowInputEventType | WorkflowDownstreamEventType;

export type RoutingEventType =
  | 'DISCOVERY_REQUIRED'
  | 'EXTRACTION_REQUIRED'
  | 'QA_REQUIRED'
  | 'RETRY_REQUIRED'
  | 'HITL_REQUIRED'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_FAILED'
  | 'NO_ACTION_REQUIRED'
  | 'CAPABILITY_EXECUTION_REQUIRED';

export type ArtifactKind =
  | 'intent_profile'
  | 'candidate_targets'
  | 'extraction_plan'
  | 'execution_session'
  | 'raw_dataset'
  | 'validated_dataset'
  | 'delivery_receipt'
  | 'human_review_packet'
  | 'final_result';

export interface NonNegotiableInput {
  requestId: string;
  targetSpec: string;
  constraints: {
    maxRecords?: number;
    budgetUsd?: number;
    maxTimeMs?: number;
    requiresJsRendering?: boolean;
    deliveryMode?: 'webhook' | 's3' | 'sftp' | 'database';
    humanReviewAllowed?: boolean;
  };
  requestedSchema: Record<string, string>;
}

export interface NonNegotiableOutput {
  requestId: string;
  status: 'completed' | 'waiting_for_human' | 'failed';
  validatedData?: Record<string, unknown>;
  deliveryReceipt?: Record<string, unknown>;
  reviewPacketId?: string;
}

export interface TaskRecord {
  id: string;
  input: NonNegotiableInput;
  outputGoal: Array<ArtifactKind>;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  governance: {
    humanReviewRequired: boolean;
  };
}

export interface ValidatedInputEvent {
  event_id: string;
  event_type: WorkflowInputEventType;
  timestamp: string;
  payload: {
    target: {
      url_or_domain: string;
      scope: string;
    };
    constraints: {
      max_budget?: number;
      max_time_ms?: number;
      requires_js_rendering?: boolean;
      human_in_loop_required?: boolean;
    };
    expected_schema: Record<string, string>;
  };
  confidence_score: number;
  justification: string;
}

export interface DownstreamWorkflowEvent {
  event_id: string;
  workflow_id: string;
  event_type: WorkflowDownstreamEventType;
  timestamp: string;
  payload: {
    module?: string;
    stage?: string;
    reason?: string;
    artifacts?: Array<Omit<ArtifactRecord, 'id' | 'taskId' | 'createdAt'>>;
    metrics?: Array<Omit<MetricRecord, 'id' | 'taskId' | 'createdAt'>>;
    metadata?: Record<string, unknown>;
  };
  confidence_score?: number;
  justification: string;
}

export type WorkflowEventInput = ValidatedInputEvent | DownstreamWorkflowEvent;

export interface RoutingDecision {
  workflow_id: string;
  next_event: RoutingEventType;
  target_module: string | null;
  status: WorkflowStatus;
  reasoning: string;
  requires_human_review: boolean;
  confidence: number;
  decided_at: string;
}

export interface WorkflowState {
  workflowId: string;
  currentStatus: WorkflowStatus;
  completedStages: string[];
  pendingStages: string[];
  failedStages: string[];
  routingHistory: RoutingDecision[];
  confidenceHistory: number[];
  decisionHistory: Array<{
    timestamp: string;
    summary: string;
  }>;
  justifications: string[];
  retryCount: number;
  lastUpdatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  taskId: string;
  kind: ArtifactKind;
  producedBy: string;
  content: Record<string, unknown>;
  confidence?: number;
  createdAt: string;
}

export interface ErrorRecord {
  id: string;
  taskId: string;
  source: string;
  message: string;
  retriable: boolean;
  createdAt: string;
}

export interface MetricRecord {
  id: string;
  taskId: string;
  source: string;
  name: string;
  value: number;
  unit: string;
  createdAt: string;
}

export type WorldEvent =
  | {
      id: string;
      type: 'task_submitted';
      taskId: string;
      createdAt: string;
      payload: TaskRecord;
    }
  | {
      id: string;
      type: 'capability_selected';
      taskId: string;
      createdAt: string;
      payload: { capabilityId: string; rationale: string };
    }
  | {
      id: string;
      type: 'intelligence_decision_recorded';
      taskId: string;
      createdAt: string;
      payload: {
        model: string;
        selectedCapabilityId: string | null;
        rationale: string;
        confidence: number;
        requiresHumanReview: boolean;
        stopExecution: boolean;
      };
    }
  | {
      id: string;
      type: 'artifact_recorded';
      taskId: string;
      createdAt: string;
      payload: ArtifactRecord;
    }
  | {
      id: string;
      type: 'metric_recorded';
      taskId: string;
      createdAt: string;
      payload: MetricRecord;
    }
  | {
      id: string;
      type: 'human_review_requested';
      taskId: string;
      createdAt: string;
      payload: ArtifactRecord;
    }
  | {
      id: string;
      type: 'execution_failed';
      taskId: string;
      createdAt: string;
      payload: ErrorRecord;
    }
  | {
      id: string;
      type: 'task_status_changed';
      taskId: string;
      createdAt: string;
      payload: { status: TaskStatus; reason: string };
    }
  | {
      id: string;
      type: 'workflow_event_received';
      taskId: string;
      createdAt: string;
      payload: WorkflowEventInput;
    }
  | {
      id: string;
      type: 'routing_decision_emitted';
      taskId: string;
      createdAt: string;
      payload: RoutingDecision;
    };

export interface WorldView {
  task: TaskRecord;
  artifacts: ArtifactRecord[];
  metrics: MetricRecord[];
  errors: ErrorRecord[];
  events: WorldEvent[];
}
