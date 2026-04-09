import { WorkflowEventInput, WorkflowState, WorldView } from '../world_model/schema.js';

export interface PolicyDecision {
  allowRouting: boolean;
  status: WorkflowState['currentStatus'];
  reason: string;
  requiresHumanReview: boolean;
  forceNextEvent?: 'HITL_REQUIRED' | 'WORKFLOW_FAILED' | 'WORKFLOW_COMPLETED' | 'RETRY_REQUIRED';
}

export class GovernancePolicy {
  private readonly lowConfidenceThreshold = 0.75;
  private readonly maxRetries = 2;

  shouldStop(world: WorldView): { stop: boolean; reason: string } {
    if (world.task.status === 'waiting_for_human') {
      return { stop: true, reason: 'Execution paused for human review.' };
    }
    if (world.task.status === 'failed') {
      return { stop: true, reason: 'Execution stopped because the task failed.' };
    }
    return { stop: false, reason: 'Execution may continue.' };
  }

  evaluate(event: WorkflowEventInput, state: WorkflowState, world: WorldView): PolicyDecision {
    if (event.event_type === 'HITL_REJECTED') {
      return {
        allowRouting: false,
        status: 'waiting_for_human',
        reason: 'Human reviewer rejected the workflow decision.',
        requiresHumanReview: true,
        forceNextEvent: 'HITL_REQUIRED',
      };
    }

    if (event.event_type === 'LOW_CONFIDENCE_DETECTED') {
      if (state.retryCount < this.maxRetries) {
        return {
          allowRouting: false,
          status: 'in_progress',
          reason: 'Low confidence detected. Retry is allowed by policy.',
          requiresHumanReview: false,
          forceNextEvent: 'RETRY_REQUIRED',
        };
      }
      return {
        allowRouting: false,
        status: 'waiting_for_human',
        reason: 'Low confidence persisted after retries. Escalating to HITL.',
        requiresHumanReview: true,
        forceNextEvent: 'HITL_REQUIRED',
      };
    }

    if (
      event.event_type === 'INPUT_CONTRACT_VALIDATED' &&
      event.payload.constraints.human_in_loop_required === true
    ) {
      return {
        allowRouting: false,
        status: 'waiting_for_human',
        reason: 'Input contract requires a human-in-the-loop checkpoint.',
        requiresHumanReview: true,
        forceNextEvent: 'HITL_REQUIRED',
      };
    }

    const hasTerminalFailure = world.errors.some((entry) => entry.retriable === false);
    if (hasTerminalFailure) {
      return {
        allowRouting: false,
        status: 'failed',
        reason: 'A non-retriable downstream error exists in the world model.',
        requiresHumanReview: false,
        forceNextEvent: 'WORKFLOW_FAILED',
      };
    }

    const latestConfidence = state.confidenceHistory[state.confidenceHistory.length - 1];
    if (typeof latestConfidence === 'number' && latestConfidence < this.lowConfidenceThreshold && state.retryCount >= this.maxRetries) {
      return {
        allowRouting: false,
        status: 'waiting_for_human',
        reason: 'Confidence is below policy threshold and retry budget is exhausted.',
        requiresHumanReview: true,
        forceNextEvent: 'HITL_REQUIRED',
      };
    }

    return {
      allowRouting: true,
      status: 'in_progress',
      reason: 'Policy allows dynamic routing.',
      requiresHumanReview: false,
    };
  }
}
