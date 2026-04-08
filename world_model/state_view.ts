import { ArtifactKind, ArtifactRecord, WorldView } from './schema.js';

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
