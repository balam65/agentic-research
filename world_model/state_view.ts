import { ArtifactKind, ArtifactRecord, WorkflowState, WorldView } from './schema.js';

export class SituationalAwareness {
  constructor(private readonly view: WorldView) {}

  hasArtifact(kind: ArtifactKind): boolean {
    return this.view.artifacts.some((artifact) => artifact.kind === kind);
  }

  getLatestArtifact(kind: ArtifactKind): ArtifactRecord | undefined {
    return [...this.view.artifacts].reverse().find((artifact) => artifact.kind === kind);
  }

  getMissingGoalArtifacts(): ArtifactKind[] {
    return this.view.task.outputGoal.filter((kind) => !this.hasArtifact(kind));
  }

  requiresHumanReview(): boolean {
    return this.view.task.status === 'waiting_for_human' || this.hasArtifact('human_review_packet');
  }
}

export class WorkflowAwareness {
  constructor(private readonly state: WorkflowState) {}

  markStageCompleted(stage: string): WorkflowState {
    const completed = Array.from(new Set([...this.state.completedStages, stage]));
    const pending = this.state.pendingStages.filter((pendingStage) => pendingStage !== stage);
    return {
      ...this.state,
      completedStages: completed,
      pendingStages: pending,
      failedStages: this.state.failedStages.filter((failedStage) => failedStage !== stage),
    };
  }

  markStageFailed(stage: string): WorkflowState {
    return {
      ...this.state,
      failedStages: Array.from(new Set([...this.state.failedStages, stage])),
    };
  }

  addPendingStage(stage: string): WorkflowState {
    if (this.state.pendingStages.includes(stage) || this.state.completedStages.includes(stage)) {
      return this.state;
    }
    return {
      ...this.state,
      pendingStages: [...this.state.pendingStages, stage],
    };
  }
}
