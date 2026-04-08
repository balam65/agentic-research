export type TaskStatus =
  | 'submitted'
  | 'active'
  | 'waiting_for_human'
  | 'completed'
  | 'failed';

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
    };

export interface WorldView {
  task: TaskRecord;
  artifacts: ArtifactRecord[];
  metrics: MetricRecord[];
  errors: ErrorRecord[];
  events: WorldEvent[];
}
